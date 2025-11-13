/**
 * Recruiting Agent
 *
 * Flow:
 * 1. User: RECRUIT {criteria}
 * 2. Find 10 diverse candidates (varying seniority, company size, tech stack)
 * 3. User scores 1-5
 * 4. AI learns preferences from scores
 * 5. Daily: Find 3 new candidates matching learned preferences
 * 6. User continues scoring → continuous learning
 */

import type { Twilio } from 'twilio';
import { supabase } from '../../lib/supabase.js';
import { getSubscriber } from '../../lib/subscribers.js';
import { sendChunkedSmsResponse, sendSmsResponse } from '../../lib/sms/handlers.js';
import Anthropic from '@anthropic-ai/sdk';
import { registerDailyJob } from '../../lib/scheduler/index.js';

// Talent Radar imports
import { discoverSources, shouldRefreshSources, mergeSources } from './source-discovery-agent.js';
import type { DiscoveredSources } from './source-discovery-agent.js';
import { collectFromGitHub } from './collectors/github-collector.js';
import { collectFromTwitter } from './collectors/twitter-collector.js';
import { collectFromRSS } from './collectors/rss-collector.js';
import { collectFromYouTube } from './collectors/youtube-collector.js';
import { scoreAndSelectCandidates } from './candidate-scorer.js';
import type { CollectedCandidates, ScoredCandidate } from './candidate-scorer.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

interface CandidateRow {
  id: string;
  subscriber_id: string;
  project_id: string;
  name: string;
  title?: string;
  company?: string;
  company_size?: string;
  location?: string;
  linkedin_url?: string;
  twitter_handle?: string;
  match_reason?: string;
  recent_activity?: string;
  source?: string;
  raw_profile: any;
  report_type?: string;
  report_date?: string;
  position_in_report?: number;
  user_score?: number;
  scored_at?: string;
}

function inferCompanySize(company?: string): string {
  if (!company) return 'unknown';
  const normalized = company.toLowerCase();
  const enterpriseSignals = ['google', 'meta', 'microsoft', 'amazon', 'apple', 'oracle', 'ibm', 'salesforce', 'linkedin'];
  const startupSignals = ['labs', 'studio', 'ventures', 'collective', 'capital', 'seed', 'garage'];
  if (enterpriseSignals.some(signal => normalized.includes(signal))) return 'enterprise';
  if (startupSignals.some(signal => normalized.includes(signal))) return 'startup';
  return 'midsize';
}

function buildFallbackCandidates(
  linkedInCandidates: any[],
  twitterCandidates: any[],
  desiredCount: number,
  query: string
): any[] {
  const results: any[] = [];
  const seen = new Set<string>();

  const pushLinkedIn = (profile: any) => {
    const key = profile.linkedinUrl?.toLowerCase() || `${profile.name}|${profile.title}`;
    if (seen.has(key)) return;
    seen.add(key);
    results.push({
      name: profile.name,
      title: profile.title,
      company: profile.company,
      company_size: inferCompanySize(profile.company),
      location: profile.location,
      linkedin_url: profile.linkedinUrl,
      twitter_handle: null,
      match_reason: profile.summary
        ? `${profile.summary.slice(0, 120)}`
        : `Relevant ${profile.title || 'candidate'} for "${query}"`,
      recent_activity: profile.experience?.[0]?.duration || null,
      source: 'linkedin',
      raw_profile: profile,
    });
  };

  const pushTwitter = (profile: any) => {
    const key = profile.handle?.toLowerCase() || profile.twitterUrl?.toLowerCase() || profile.name;
    if (seen.has(key)) return;
    seen.add(key);
    const normalizedHandle = profile.handle
      ? profile.handle.startsWith('@')
        ? profile.handle
        : `@${profile.handle}`
      : profile.twitterUrl;
    results.push({
      name: profile.name || profile.handle,
      title: profile.bio || 'No title listed',
      company: null,
      company_size: 'unknown',
      location: profile.location,
      linkedin_url: null,
      twitter_handle: normalizedHandle,
      match_reason: profile.bio
        ? `${profile.bio.slice(0, 120)}`
        : `Active on Twitter re "${query}"`,
      recent_activity: profile.recentTweets?.[0]?.text || null,
      source: 'twitter',
      raw_profile: profile,
    });
  };

  const max = Math.max(linkedInCandidates.length, twitterCandidates.length);
  for (let i = 0; i < max && results.length < desiredCount; i++) {
    if (i < linkedInCandidates.length) {
      pushLinkedIn(linkedInCandidates[i]);
    }
    if (results.length >= desiredCount) break;
    if (i < twitterCandidates.length) {
      pushTwitter(twitterCandidates[i]);
    }
  }

  // If still short, dump the remainder from whichever source has more
  if (results.length < desiredCount) {
    for (const profile of linkedInCandidates) {
      if (results.length >= desiredCount) break;
      pushLinkedIn(profile);
    }
  }

  if (results.length < desiredCount) {
    for (const profile of twitterCandidates) {
      if (results.length >= desiredCount) break;
      pushTwitter(profile);
    }
  }

  return results.slice(0, desiredCount);
}

function ensureMinimumCandidates(
  selected: any[],
  fallbackPool: any[],
  targetCount: number
): any[] {
  const keyFor = (candidate: any) => {
    if (candidate.linkedin_url) return candidate.linkedin_url.toLowerCase();
    if (candidate.twitter_handle) return String(candidate.twitter_handle).toLowerCase();
    return candidate.name?.toLowerCase() || Math.random().toString();
  };

  const seen = new Set<string>();
  const hydrated = selected.map(candidate => {
    const key = keyFor(candidate);
    seen.add(key);
    return candidate;
  });

  for (const candidate of fallbackPool) {
    if (hydrated.length >= targetCount) break;
    const key = keyFor(candidate);
    if (seen.has(key)) continue;
    seen.add(key);
    hydrated.push(candidate);
  }

  return hydrated.slice(0, targetCount);
}

/**
 * Store candidates from Talent Radar and send SMS
 */
async function storeCandidatesFromTalentRadar(
  subscriberId: string,
  projectId: string,
  candidates: ScoredCandidate[],
  from: string,
  twilioClient: Twilio
): Promise<void> {
  // Convert ScoredCandidate to database format
  const dbCandidates = candidates.map(c => ({
    subscriber_id: subscriberId,
    project_id: projectId,
    name: c.name,
    title: c.title || null,
    company: c.company || null,
    company_size: c.company_size || 'unknown',
    location: c.location || null,
    linkedin_url: c.linkedin_url || null,
    twitter_handle: c.twitter_handle || null,
    match_reason: c.match_reason,
    recent_activity: c.recent_activity || null,
    source: c.source,
    raw_profile: c.raw_profile || {},
    report_type: 'setup',
    report_date: new Date().toISOString().split('T')[0],
    position_in_report: 0,
  }));

  const { error } = await supabase
    .from('recruiting_candidates')
    .insert(dbCandidates.map((c, i) => ({ ...c, position_in_report: i + 1 })));

  if (error) {
    console.error('[Recruiting] Failed to store candidates:', error);
    throw error;
  }

  console.log(`[Recruiting] Stored ${dbCandidates.length} candidates`);

  // Send SMS with top 5 candidates
  let message = `🎯 Talent Radar Results\n\nFound ${candidates.length} candidates!\n\n`;

  for (let i = 0; i < Math.min(5, candidates.length); i++) {
    const candidate = candidates[i];
    message += `${i + 1}. ${candidate.name}\n`;
    if (candidate.title) message += `   ${candidate.title}`;
    if (candidate.company) message += ` @ ${candidate.company}`;
    message += '\n';
    message += `   ${candidate.match_reason.substring(0, 100)}...\n\n`;
  }

  if (candidates.length > 5) {
    message += `...and ${candidates.length - 5} more\n\n`;
  }

  message += `---\nScore: SCORE 1:5 2:3 ...`;

  await sendChunkedSmsResponse(from, message, twilioClient);
}

/**
 * Store candidates and send SMS (legacy function, kept for compatibility)
 */
async function storeCandidates(
  subscriberId: string,
  projectId: string,
  candidates: any[],
  from: string,
  twilioClient: Twilio
): Promise<void> {
  const reportDate = new Date().toISOString().split('T')[0];

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];

    await supabase.from('recruiting_candidates').insert({
      subscriber_id: subscriberId,
      project_id: projectId,
      name: candidate.name,
      title: candidate.title,
      company: candidate.company,
      company_size: candidate.company_size,
      location: candidate.location,
      linkedin_url: candidate.linkedin_url,
      twitter_handle: candidate.twitter_handle,
      match_reason: candidate.match_reason,
      recent_activity: candidate.recent_activity,
      source: candidate.source || 'web',
      raw_profile: candidate.raw_profile || candidate,
      report_type: 'setup',
      report_date: reportDate,
      position_in_report: i + 1,
    });
  }

  console.log(`[Recruiting] Stored ${candidates.length} diverse candidates`);

  // Send SMS with candidates
  let message = `✨ Found ${candidates.length} diverse candidates!\n\n`;

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i];
    message += `${i + 1}. ${candidate.name}\n`;
    if (candidate.title) message += `   ${candidate.title}`;
    if (candidate.company) message += ` @ ${candidate.company}`;
    message += '\n';

    if (candidate.location) message += `   ${candidate.location}\n`;
    if (candidate.linkedin_url) message += `   🔗 ${candidate.linkedin_url}\n`;
    if (candidate.twitter_handle) message += `   🐦 ${candidate.twitter_handle}\n`;
    if (candidate.portfolio || candidate.website) {
      message += `   🎨 ${candidate.portfolio || candidate.website}\n`;
    }

    if (candidate.match_reason) {
      message += `   ✨ ${candidate.match_reason}\n`;
    }

    if (candidate.recent_activity) {
      message += `   📍 ${candidate.recent_activity}\n`;
    }

    message += '\n';
  }

  message += `---\n💡 Score each candidate 1-5:\nSCORE 1:5 2:3 3:4...\n\n(5=great match, 1=poor match)`;

  await sendChunkedSmsResponse(from, message, twilioClient);
}

/**
 * Run setup search: Discover sources and find 10 diverse candidates
 */
export async function runSetupSearch(
  subscriberId: string,
  projectId: string,
  query: string,
  twilioClient: Twilio,
  from: string
): Promise<void> {
  console.log(`[Recruiting] Setup search for project ${projectId}: "${query}"`);

  try {
    // Send immediate response that we're working on it
    await sendSmsResponse(
      from,
      `🔍 Talent Radar activated!\n\nDiscovering sources for: "${query}"\n\nThis will take 30-60 seconds...`,
      twilioClient
    );

    // Step 1: Discover sources via agentic loop
    console.log('[Recruiting] Running source discovery...');
    const discoveredSources = await discoverSources(query);

    // Store sources in the NESTED project preferences (agent_slug='recruiting' format)
    const { data: subscription } = await supabase
      .from('agent_subscriptions')
      .select('preferences')
      .eq('subscriber_id', subscriberId)
      .eq('agent_slug', 'recruiting')
      .single();

    if (subscription?.preferences) {
      const prefs = subscription.preferences as any;
      if (prefs.projects && prefs.projects[projectId]) {
        prefs.projects[projectId].sources = discoveredSources;

        await supabase
          .from('agent_subscriptions')
          .update({ preferences: prefs })
          .eq('subscriber_id', subscriberId)
          .eq('agent_slug', 'recruiting');

        console.log('[Recruiting] Sources stored in project preferences');
      }
    }

    // Step 2: Collect candidates from all discovered sources in parallel
    console.log('[Recruiting] Collecting candidates from discovered sources...');
    const [githubCandidates, twitterCandidates, rssCandidates, youtubeCandidates] = await Promise.all([
      collectFromGitHub(discoveredSources.github, 20).catch(err => {
        console.error('[Recruiting] GitHub collection failed:', err);
        return [];
      }),
      collectFromTwitter(discoveredSources.twitter, 20).catch(err => {
        console.error('[Recruiting] Twitter collection failed:', err);
        return [];
      }),
      collectFromRSS(discoveredSources.rss, 20).catch(err => {
        console.error('[Recruiting] RSS collection failed:', err);
        return [];
      }),
      collectFromYouTube(discoveredSources.youtube, 20).catch(err => {
        console.error('[Recruiting] YouTube collection failed:', err);
        return [];
      }),
    ]);

    const collected: CollectedCandidates = {
      github: githubCandidates,
      twitter: twitterCandidates,
      rss: rssCandidates,
      youtube: youtubeCandidates,
    };

    const totalCollected = githubCandidates.length + twitterCandidates.length + rssCandidates.length + youtubeCandidates.length;
    console.log(`[Recruiting] Collected ${totalCollected} total candidates`);

    if (totalCollected === 0) {
      await sendSmsResponse(
        from,
        `❌ No candidates found from discovered sources.\n\nTry a different query or check API keys.`,
        twilioClient
      );
      return;
    }

    // Step 3: Use Claude to score and select top 10 candidates
    console.log('[Recruiting] Scoring and selecting top candidates...');
    const selectedCandidates = await scoreAndSelectCandidates(collected, query, 10);

    if (selectedCandidates.length === 0) {
      await sendSmsResponse(
        from,
        `❌ Could not identify suitable candidates\n\nTry adjusting your criteria.`,
        twilioClient
      );
      return;
    }

    // Step 4: Store and send candidates
    await storeCandidatesFromTalentRadar(subscriberId, projectId, selectedCandidates, from, twilioClient);

  } catch (error) {
    console.error('[Recruiting] Setup search failed:', error);
    await sendSmsResponse(
      from,
      `❌ Search failed. Please try again later.`,
      twilioClient
    );
  }
}

// NOTE: Old selectDiverseCandidates function removed - replaced by candidate-scorer.ts

/**
 * Analyze project scores and extract learned preferences
 */
export async function analyzeProjectScores(
  subscriberId: string,
  projectId: string
): Promise<void> {
  console.log(`[Recruiting] Analyzing scores for project ${projectId}`);

  try {
    // Get all scored setup candidates
    const { data: candidates } = await supabase
      .from('recruiting_candidates')
      .select('*')
      .eq('project_id', projectId)
      .eq('report_type', 'setup')
      .not('user_score', 'is', null)
      .order('user_score', { ascending: false });

    if (!candidates || candidates.length === 0) {
      console.error('[Recruiting] No scored candidates found');
      return;
    }

    // Separate high and low scores
    const highScores = candidates.filter(c => c.user_score >= 4);
    const lowScores = candidates.filter(c => c.user_score <= 2);

    console.log(`[Recruiting] High scores: ${highScores.length}, Low scores: ${lowScores.length}`);

    // Use Claude to analyze patterns
    const prompt = `You are a recruiting AI analyzing user preferences. The user scored 10 candidates (1-5 scale).

HIGH SCORES (4-5 stars):
${JSON.stringify(highScores.map(c => ({
  name: c.name,
  title: c.title,
  company: c.company,
  company_size: c.company_size,
  location: c.location,
  match_reason: c.match_reason,
  score: c.user_score,
  raw_profile: c.raw_profile,
})), null, 2)}

LOW SCORES (1-2 stars):
${JSON.stringify(lowScores.map(c => ({
  name: c.name,
  title: c.title,
  company: c.company,
  company_size: c.company_size,
  location: c.location,
  match_reason: c.match_reason,
  score: c.user_score,
  raw_profile: c.raw_profile,
})), null, 2)}

Analyze what the user likes and dislikes. Extract patterns about:
1. Preferred seniority level
2. Preferred company sizes
3. Preferred skills/tech stacks
4. Preferred backgrounds/experience
5. What to avoid

Return a JSON object with these fields:
{
  "preferred_seniority": ["senior", "lead"],
  "preferred_company_sizes": ["startup", "midsize"],
  "preferred_skills": ["React", "TypeScript"],
  "preferred_backgrounds": ["Full-stack with strong frontend"],
  "avoid": ["Pure backend", "Enterprise only"]
}

Return ONLY JSON, no markdown or explanation.`;

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const text = content.text.trim();

    // Parse learned profile
    let learnedProfile: any;

    const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      learnedProfile = JSON.parse(jsonMatch[1]);
    } else {
      learnedProfile = JSON.parse(text);
    }

    console.log('[Recruiting] Learned profile:', learnedProfile);

    // Update preferences in agent_subscriptions
    // First, get current preferences
    const { data: currentSub } = await supabase
      .from('agent_subscriptions')
      .select('preferences')
      .eq('subscriber_id', subscriberId)
      .eq('agent_slug', 'recruiting')
      .single();

    if (currentSub?.preferences) {
      const prefs = currentSub.preferences as any;
      if (prefs.projects && prefs.projects[projectId]) {
        prefs.projects[projectId].learnedProfile = learnedProfile;

        await supabase
          .from('agent_subscriptions')
          .update({ preferences: prefs })
          .eq('subscriber_id', subscriberId)
          .eq('agent_slug', 'recruiting');

        console.log('[Recruiting] Updated learned profile in preferences');
      }
    }

  } catch (error) {
    console.error('[Recruiting] Score analysis failed:', error);
  }
}

/**
 * Find daily candidates based on learned preferences (Talent Radar version)
 */
export async function findDailyCandidates(
  subscriberId: string,
  projectId: string,
  query: string,
  learnedProfile: any
): Promise<ScoredCandidate[]> {
  console.log(`[Recruiting] Finding daily candidates for project ${projectId}`);

  try {
    // Get stored sources from NESTED project preferences (agent_slug='recruiting' format)
    const { data: subscription } = await supabase
      .from('agent_subscriptions')
      .select('preferences')
      .eq('subscriber_id', subscriberId)
      .eq('agent_slug', 'recruiting')
      .single();

    if (!subscription?.preferences) {
      console.error('[Recruiting] No subscription found');
      return [];
    }

    const prefs = subscription.preferences as any;
    const project = prefs.projects?.[projectId];

    if (!project?.sources) {
      console.error('[Recruiting] No sources found for project');
      return [];
    }

    const sources: DiscoveredSources = project.sources;

    // Check if we need to refresh sources (every 30 days)
    if (shouldRefreshSources({ sources })) {
      console.log('[Recruiting] 30-day refresh: Discovering new sources...');
      const newSources = await discoverSources(query);
      const mergedSources = mergeSources(sources, newSources);

      // Update stored sources in nested structure
      prefs.projects[projectId].sources = mergedSources;
      await supabase
        .from('agent_subscriptions')
        .update({ preferences: prefs })
        .eq('subscriber_id', subscriberId)
        .eq('agent_slug', 'recruiting');

      console.log('[Recruiting] Sources refreshed');
    }

    // Collect candidates from all sources
    console.log('[Recruiting] Collecting from stored sources...');
    const [githubCandidates, twitterCandidates, rssCandidates, youtubeCandidates] = await Promise.all([
      collectFromGitHub(sources.github, 20).catch(err => {
        console.error('[Recruiting] GitHub collection failed:', err);
        return [];
      }),
      collectFromTwitter(sources.twitter, 20).catch(err => {
        console.error('[Recruiting] Twitter collection failed:', err);
        return [];
      }),
      collectFromRSS(sources.rss, 20).catch(err => {
        console.error('[Recruiting] RSS collection failed:', err);
        return [];
      }),
      collectFromYouTube(sources.youtube, 20).catch(err => {
        console.error('[Recruiting] YouTube collection failed:', err);
        return [];
      }),
    ]);

    const collected: CollectedCandidates = {
      github: githubCandidates,
      twitter: twitterCandidates,
      rss: rssCandidates,
      youtube: youtubeCandidates,
    };

    const totalCollected = githubCandidates.length + twitterCandidates.length + rssCandidates.length + youtubeCandidates.length;
    console.log(`[Recruiting] Collected ${totalCollected} candidates`);

    if (totalCollected === 0) {
      console.log('[Recruiting] No candidates found in daily search');
      return [];
    }

    // Get already-shown candidates to avoid duplicates
    const { data: existingCandidates } = await supabase
      .from('recruiting_candidates')
      .select('name, github_url, linkedin_url, twitter_handle, youtube_url')
      .eq('project_id', projectId);

    // Filter out duplicates (simplified - just checking names for now)
    // TODO: More sophisticated deduplication based on URLs/handles
    const shownNames = new Set(
      existingCandidates?.map(c => c.name?.toLowerCase()).filter(Boolean) || []
    );

    // Use Claude to select 3 candidates matching learned preferences
    const selectedCandidates = await scoreAndSelectCandidates(
      collected,
      query,
      3,
      learnedProfile
    );

    // Filter out already-shown candidates
    const newCandidates = selectedCandidates.filter(c =>
      !shownNames.has(c.name.toLowerCase())
    );

    console.log(`[Recruiting] After deduplication: ${newCandidates.length} new candidates`);

    return newCandidates;

  } catch (error) {
    console.error('[Recruiting] Daily candidate search failed:', error);
    return [];
  }
}

// NOTE: Old selectDailyCandidates function removed - replaced by candidate-scorer.ts

/**
 * Register daily recruiting job (runs at 9 AM PT)
 * Uses Talent Radar system for source discovery and candidate collection
 */
export function registerRecruitingDailyJob(twilioClient: Twilio): void {
  registerDailyJob({
    name: 'recruiting-talent-radar-daily',
    hour: 9,
    minute: 0,
    timezone: 'America/Los_Angeles',
    run: async () => {
      console.log('[Recruiting] Running Talent Radar daily job');

      try {
        // Get all recruiting subscriptions (agent_slug='recruiting' with nested projects)
        const { data: subscriptions, error } = await supabase
          .from('agent_subscriptions')
          .select('*')
          .eq('agent_slug', 'recruiting')
          .eq('active', true);

        if (error) {
          console.error('[Recruiting] Failed to fetch subscriptions:', error);
          return;
        }

        if (!subscriptions || subscriptions.length === 0) {
          console.log('[Recruiting] No active subscriptions');
          return;
        }

        console.log(`[Recruiting] Processing ${subscriptions.length} recruiting subscriptions`);

        // Process each subscription's projects
        for (const subscription of subscriptions) {
          try {
            const prefs = subscription.preferences as any;
            if (!prefs?.projects) continue;

            // Process each active project
            for (const [projectId, project] of Object.entries(prefs.projects)) {
              const proj = project as any;

              if (!proj.active || !proj.setupComplete) {
                console.log(`[Recruiting] Skipping inactive/incomplete project ${projectId}`);
                continue;
              }

              console.log(`[Recruiting] Processing project ${projectId}: "${proj.query}"`);

              // Analyze past scores to learn preferences
              await analyzeProjectScores(subscription.subscriber_id, projectId);

              // Find new daily candidates using Talent Radar
              const newCandidates = await findDailyCandidates(
                subscription.subscriber_id,
                projectId,
                proj.query,
                proj.learnedProfile || {}
              );

              if (newCandidates.length === 0) {
                console.log(`[Recruiting] No new candidates for project ${projectId}`);
                continue;
              }

              // Store candidates
              const reportDate = new Date().toISOString().split('T')[0];
              const dbCandidates = newCandidates.map((c, i) => ({
                subscriber_id: subscription.subscriber_id,
                project_id: projectId,
              name: c.name,
              title: c.title || null,
              company: c.company || null,
              company_size: c.company_size || 'unknown',
              location: c.location || null,
              linkedin_url: c.linkedin_url || null,
              twitter_handle: c.twitter_handle || null,
              match_reason: c.match_reason,
              recent_activity: c.recent_activity || null,
              source: c.source,
              raw_profile: c.raw_profile || {},
              report_type: 'daily',
              report_date: reportDate,
              position_in_report: i + 1,
            }));

              const { error: insertError } = await supabase
                .from('recruiting_candidates')
                .insert(dbCandidates);

              if (insertError) {
                console.error('[Recruiting] Failed to store daily candidates:', insertError);
                continue;
              }

              // Get subscriber
              const subscriber = await getSubscriber(subscription.subscriber_id);
              if (!subscriber) {
                console.error(`[Recruiting] Subscriber ${subscription.subscriber_id} not found`);
                continue;
              }

              // Send SMS notification
              let message = `🎯 Talent Radar Daily Update\n\nFound ${newCandidates.length} new candidates for: "${proj.query}"\n\n`;

              for (let i = 0; i < newCandidates.length; i++) {
                const candidate = newCandidates[i];
                message += `${i + 1}. ${candidate.name}\n`;
                if (candidate.title) message += `   ${candidate.title}`;
                if (candidate.company) message += ` @ ${candidate.company}`;
                message += '\n';
                message += `   ${candidate.match_reason.substring(0, 100)}...\n\n`;
              }

              message += `---\nScore: SCORE 1:5 2:3 ...`;

              await sendChunkedSmsResponse(subscriber.phone_number, message, twilioClient);

              console.log(`[Recruiting] Sent ${newCandidates.length} candidates to ${subscriber.phone_number}`);

              // Small delay between projects to avoid rate limits
              await new Promise(resolve => setTimeout(resolve, 1000));
            }

          } catch (error) {
            console.error(`[Recruiting] Failed to process subscription ${subscription.id}:`, error);
          }

          // Small delay between subscriptions
          await new Promise(resolve => setTimeout(resolve, 2000));
        }

        console.log('[Recruiting] Daily job complete');

      } catch (error) {
        console.error('[Recruiting] Daily job failed:', error);
      }
    },
    onError: (error) => {
      console.error('[Recruiting] Daily job failed:', error);
    },
  });

  console.log('[Recruiting] Daily job registered for 9:00 AM PT');
}
