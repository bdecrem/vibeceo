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
import { searchLinkedIn, searchTwitter } from './apify-client.js';
import type { LinkedInCandidate, TwitterCandidate } from './apify-client.js';
import { supabase } from '../../lib/supabase.js';
import { getSubscriber } from '../../lib/subscribers.js';
import { sendChunkedSmsResponse, sendSmsResponse } from '../../lib/sms/handlers.js';
import Anthropic from '@anthropic-ai/sdk';
import { registerDailyJob } from '../../lib/scheduler/index.js';

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
  linkedInCandidates: LinkedInCandidate[],
  twitterCandidates: TwitterCandidate[],
  desiredCount: number,
  query: string
): any[] {
  const results: any[] = [];
  const seen = new Set<string>();

  const pushLinkedIn = (profile: LinkedInCandidate) => {
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

  const pushTwitter = (profile: TwitterCandidate) => {
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
 * Store candidates and send SMS
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
 * Run setup search: Find 10 diverse candidates
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
    // Search both LinkedIn and Twitter
    const [linkedInCandidates, twitterCandidates] = await Promise.all([
      searchLinkedIn(query, 30).catch(err => {
        console.error('[Recruiting] LinkedIn search failed:', err);
        return [] as LinkedInCandidate[];
      }),
      searchTwitter(query, 100).catch(err => {
        console.error('[Recruiting] Twitter search failed:', err);
        return [] as TwitterCandidate[];
      }),
    ]);

    console.log(`[Recruiting] Found ${linkedInCandidates.length} LinkedIn, ${twitterCandidates.length} Twitter candidates`);

    if (linkedInCandidates.length === 0 && twitterCandidates.length === 0) {
      await sendSmsResponse(
        from,
        `❌ No candidates found\n\nApify actors may require paid access. Check:\n• Apify account has credits\n• Actors are accessible on your plan\n\nTry: RECRUIT SETTINGS`,
        twilioClient
      );
      return;
    }

    // Use Claude to select 10 diverse candidates
    const diverseCandidates = await selectDiverseCandidates(
      linkedInCandidates,
      twitterCandidates,
      query
    );

    if (diverseCandidates.length === 0) {
      await sendSmsResponse(
        from,
        `❌ Could not identify suitable candidates\n\nTry adjusting your criteria.`,
        twilioClient
      );
      return;
    }

    // Store and send candidates
    await storeCandidates(subscriberId, projectId, diverseCandidates, from, twilioClient);

  } catch (error) {
    console.error('[Recruiting] Setup search failed:', error);
    await sendSmsResponse(
      from,
      `❌ Search failed. Please try again later.`,
      twilioClient
    );
  }
}

/**
 * Use Claude to select 10 diverse candidates from search results
 */
async function selectDiverseCandidates(
  linkedInCandidates: LinkedInCandidate[],
  twitterCandidates: TwitterCandidate[],
  query: string
): Promise<any[]> {
  console.log('[Recruiting] Selecting diverse candidates via Claude...');
  console.log(`[Recruiting] Input: ${linkedInCandidates.length} LinkedIn, ${twitterCandidates.length} Twitter candidates`);

  // Log sample data to see what Claude will receive
  if (linkedInCandidates.length > 0) {
    console.log('[Recruiting] Sample LinkedIn candidate for Claude:');
    console.log(JSON.stringify(linkedInCandidates[0], null, 2));
  }

  const prompt = `You are a recruiting assistant. From these search results, select UP TO 10 candidates that match the query: "${query}"

IMPORTANT:
- Even if some fields are missing (title, company, etc.), include the candidate if they seem relevant
- Focus on name, linkedin_url, and any available context
- If fewer than 10 candidates are available, return what you can find
- Prioritize diversity in backgrounds when possible

For each candidate you select, provide these fields (use null for missing data):
- name: string (required)
- title: string or null
- company: string or null
- company_size: "startup" | "midsize" | "enterprise" | "unknown"
- location: string or null
- linkedin_url: string (if available)
- twitter_handle: string (if available)
- match_reason: brief explanation of why they match
- source: "linkedin" | "twitter" | "both"

LinkedIn Candidates:
${JSON.stringify(linkedInCandidates.slice(0, 20), null, 2)}

Twitter Candidates:
${JSON.stringify(twitterCandidates.slice(0, 20), null, 2)}

Return ONLY a JSON array of candidates. Use this exact format:
[{"name": "...", "title": "...", "company": "...", "company_size": "...", "location": "...", "linkedin_url": "...", "twitter_handle": null, "match_reason": "...", "source": "linkedin"}]`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }],
    });

    const content = response.content[0];
    if (content.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    const text = content.text.trim();

    console.log('[Recruiting] Claude response:', text.substring(0, 500) + (text.length > 500 ? '...' : ''));

    // Try to parse JSON from response
    let candidates: any[];

    try {
      // Try multiple parsing strategies
      let jsonText = text;

      // Strategy 1: Look for JSON in markdown code blocks
      const markdownMatch = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
      if (markdownMatch) {
        console.log('[Recruiting] Found JSON in markdown code block');
        jsonText = markdownMatch[1];
      } else {
        // Strategy 2: Look for any JSON array in the text
        const arrayMatch = text.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          console.log('[Recruiting] Found JSON array in response');
          jsonText = arrayMatch[0];
        }
      }

      candidates = JSON.parse(jsonText);

      if (!Array.isArray(candidates)) {
        console.error('[Recruiting] Parsed result is not an array:', typeof candidates);
        throw new Error('Response is not a JSON array');
      }

      console.log(`[Recruiting] Successfully parsed ${candidates.length} candidates`);

    } catch (error) {
      console.error('[Recruiting] Failed to parse Claude response as JSON:', error);
      console.error('[Recruiting] Full response:', text);
      console.warn('[Recruiting] Using fallback selection due to parsing error');
      return buildFallbackCandidates(linkedInCandidates, twitterCandidates, 10, query);
    }

    console.log(`[Recruiting] Claude selected ${candidates.length} diverse candidates`);

    if (candidates.length === 0) {
      console.warn('[Recruiting] Claude returned 0 candidates, using fallback selection');
      console.log('[Recruiting] Available: LinkedIn=' + linkedInCandidates.length + ', Twitter=' + twitterCandidates.length);
      const fallback = buildFallbackCandidates(linkedInCandidates, twitterCandidates, 10, query);
      console.log(`[Recruiting] Fallback generated ${fallback.length} candidates`);
      return fallback;
    }

    // Add raw_profile field for each candidate
    for (const candidate of candidates) {
      // Find original profile data
      if (candidate.linkedin_url) {
        const original = linkedInCandidates.find(c =>
          c.linkedinUrl === candidate.linkedin_url
        );
        candidate.raw_profile = original || {};
      } else if (candidate.twitter_handle) {
        const original = twitterCandidates.find(c =>
          c.handle === candidate.twitter_handle
        );
        candidate.raw_profile = original || {};
      }
    }

    if (candidates.length < 10) {
      const fallbackPool = buildFallbackCandidates(linkedInCandidates, twitterCandidates, 10, query);
      candidates = ensureMinimumCandidates(candidates, fallbackPool, 10);
    }

    return candidates.slice(0, 10);

  } catch (error) {
    console.error('[Recruiting] Claude selection failed:', error);

    // Fallback: return first 10 LinkedIn candidates
    return linkedInCandidates.slice(0, 10).map((c, i) => ({
      name: c.name,
      title: c.title,
      company: c.company,
      company_size: 'unknown',
      location: c.location,
      linkedin_url: c.linkedinUrl,
      twitter_handle: null,
      match_reason: 'Matches search criteria',
      recent_activity: null,
      source: 'linkedin',
      raw_profile: c,
    }));
  }
}

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
 * Find daily candidates based on learned preferences
 */
export async function findDailyCandidates(
  subscriberId: string,
  projectId: string,
  query: string,
  learnedProfile: any
): Promise<any[]> {
  console.log(`[Recruiting] Finding daily candidates for project ${projectId}`);

  try {
    // Search both LinkedIn and Twitter
    const [linkedInCandidates, twitterCandidates] = await Promise.all([
      searchLinkedIn(query, 20).catch(err => {
        console.error('[Recruiting] LinkedIn search failed:', err);
        return [] as LinkedInCandidate[];
      }),
      searchTwitter(query, 50).catch(err => {
        console.error('[Recruiting] Twitter search failed:', err);
        return [] as TwitterCandidate[];
      }),
    ]);

    console.log(`[Recruiting] Found ${linkedInCandidates.length} LinkedIn, ${twitterCandidates.length} Twitter candidates`);

    if (linkedInCandidates.length === 0 && twitterCandidates.length === 0) {
      console.log('[Recruiting] No candidates found in daily search');
      return [];
    }

    // Get already-shown candidates to avoid duplicates
    const { data: existingCandidates } = await supabase
      .from('recruiting_candidates')
      .select('linkedin_url, twitter_handle')
      .eq('project_id', projectId);

    const shownLinkedInUrls = new Set(
      existingCandidates?.map(c => c.linkedin_url).filter(Boolean) || []
    );
    const shownTwitterHandles = new Set(
      existingCandidates?.map(c => c.twitter_handle).filter(Boolean) || []
    );

    // Filter out already-shown candidates
    const newLinkedIn = linkedInCandidates.filter(c =>
      !shownLinkedInUrls.has(c.linkedinUrl)
    );
    const newTwitter = twitterCandidates.filter(c =>
      !shownTwitterHandles.has(c.handle)
    );

    console.log(`[Recruiting] After deduplication: ${newLinkedIn.length} LinkedIn, ${newTwitter.length} Twitter`);

    // Use Claude to select 3 candidates matching learned preferences
    const selectedCandidates = await selectDailyCandidates(
      newLinkedIn,
      newTwitter,
      query,
      learnedProfile
    );

    return selectedCandidates;

  } catch (error) {
    console.error('[Recruiting] Daily candidate search failed:', error);
    return [];
  }
}

/**
 * Use Claude to select 3 daily candidates matching learned preferences
 */
async function selectDailyCandidates(
  linkedInCandidates: LinkedInCandidate[],
  twitterCandidates: TwitterCandidate[],
  query: string,
  learnedProfile: any
): Promise<any[]> {
  console.log('[Recruiting] Selecting daily candidates via Claude...');

  const prompt = `You are a recruiting assistant. From these search results, select 3 candidates that match the query AND the user's learned preferences.

Query: "${query}"

User's Learned Preferences:
${JSON.stringify(learnedProfile, null, 2)}

For each selected candidate, provide:
1. name
2. title
3. company
4. company_size (estimate: "startup", "midsize", "enterprise")
5. location
6. linkedin_url OR twitter_handle (or both)
7. match_reason (1-2 sentences: why they match preferences)
8. recent_activity (if available from Twitter)
9. source ("linkedin", "twitter", or "both")

Return EXACTLY 3 candidates as a JSON array.

LinkedIn Candidates:
${JSON.stringify(linkedInCandidates.slice(0, 15), null, 2)}

Twitter Candidates:
${JSON.stringify(twitterCandidates.slice(0, 15), null, 2)}

Return ONLY a JSON array of 3 candidates. No markdown, no explanation.`;

  try {
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

    // Try to parse JSON from response
    let candidates: any[];

    const jsonMatch = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
    if (jsonMatch) {
      candidates = JSON.parse(jsonMatch[1]);
    } else {
      candidates = JSON.parse(text);
    }

    console.log(`[Recruiting] Claude selected ${candidates.length} daily candidates`);

    if (!Array.isArray(candidates) || candidates.length === 0) {
      console.warn('[Recruiting] Claude returned 0 daily candidates, using fallback');
      return buildFallbackCandidates(linkedInCandidates, twitterCandidates, 3, query);
    }

    // Add raw_profile field for each candidate
    for (const candidate of candidates) {
      if (candidate.linkedin_url) {
        const original = linkedInCandidates.find(c =>
          c.linkedinUrl === candidate.linkedin_url
        );
        candidate.raw_profile = original || {};
      } else if (candidate.twitter_handle) {
        const original = twitterCandidates.find(c =>
          c.handle === candidate.twitter_handle
        );
        candidate.raw_profile = original || {};
      }
    }

    if (candidates.length < 3) {
      const fallbackPool = buildFallbackCandidates(linkedInCandidates, twitterCandidates, 3, query);
      candidates = ensureMinimumCandidates(candidates, fallbackPool, 3);
    }

    return candidates.slice(0, 3);

  } catch (error) {
    console.error('[Recruiting] Claude selection failed:', error);

    // Fallback: return first 3 LinkedIn candidates
    return linkedInCandidates.slice(0, 3).map(c => ({
      name: c.name,
      title: c.title,
      company: c.company,
      company_size: 'unknown',
      location: c.location,
      linkedin_url: c.linkedinUrl,
      twitter_handle: null,
      match_reason: 'Matches search criteria',
      recent_activity: null,
      source: 'linkedin',
      raw_profile: c,
    }));
  }
}

/**
 * Register daily recruiting job (runs at 9 AM PT)
 */
export function registerRecruitingDailyJob(twilioClient: Twilio): void {
  registerDailyJob({
    name: 'recruiting-daily',
    hour: 9,
    minute: 0,
    timezone: 'America/Los_Angeles',
    run: async () => {
      console.log('[Recruiting] Running daily recruiting job');

      try {
        // Get all active recruiting projects
        const { data: subscriptions } = await supabase
          .from('agent_subscriptions')
          .select('subscriber_id, preferences')
          .eq('agent_slug', 'recruiting')
          .eq('is_subscribed', true);

        if (!subscriptions || subscriptions.length === 0) {
          console.log('[Recruiting] No active subscriptions');
          return;
        }

        for (const sub of subscriptions) {
          const prefs = sub.preferences as any;

          if (!prefs?.projects) continue;

          // Process each active project
          for (const [projectId, project] of Object.entries(prefs.projects)) {
            const proj = project as any;

            if (!proj.active || !proj.setupComplete) continue;

            console.log(`[Recruiting] Processing project ${projectId} for subscriber ${sub.subscriber_id}`);

            // Find 3 daily candidates
            const candidates = await findDailyCandidates(
              sub.subscriber_id,
              projectId,
              proj.query,
              proj.learnedProfile || {}
            );

            if (candidates.length === 0) {
              console.log(`[Recruiting] No new candidates for project ${projectId}`);
              continue;
            }

            // Store candidates in database
            const reportDate = new Date().toISOString().split('T')[0];

            for (let i = 0; i < candidates.length; i++) {
              const candidate = candidates[i];

              await supabase.from('recruiting_candidates').insert({
                subscriber_id: sub.subscriber_id,
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
                source: candidate.source,
                raw_profile: candidate.raw_profile,
                report_type: 'daily',
                report_date: reportDate,
                position_in_report: i + 1,
              });
            }

            console.log(`[Recruiting] Stored ${candidates.length} daily candidates for project ${projectId}`);

            // Send SMS notification
            // Get subscriber by querying with subscriber_id
            const { data: subscriberData } = await supabase
              .from('sms_subscribers')
              .select('phone_number')
              .eq('id', sub.subscriber_id)
              .single();

            if (!subscriberData) {
              console.error(`[Recruiting] Subscriber ${sub.subscriber_id} not found`);
              continue;
            }

            let message = `🎯 Your Daily Candidates (${candidates.length})\n\n`;

            for (let i = 0; i < candidates.length; i++) {
              const candidate = candidates[i];
              message += `${i + 1}. ${candidate.name}\n`;
              if (candidate.title) message += `   ${candidate.title}`;
              if (candidate.company) message += ` @ ${candidate.company}`;
              message += '\n';

              if (candidate.location) message += `   ${candidate.location}\n`;
              if (candidate.linkedin_url) message += `   🔗 ${candidate.linkedin_url}\n`;
              if (candidate.twitter_handle) message += `   🐦 ${candidate.twitter_handle}\n`;

              if (candidate.match_reason) {
                message += `   ✨ ${candidate.match_reason}\n`;
              }

              if (candidate.recent_activity) {
                message += `   📍 ${candidate.recent_activity}\n`;
              }

              message += '\n';
            }

            message += `---\n💡 Score: SCORE 1:5 2:3 3:4...`;

            await sendChunkedSmsResponse(subscriberData.phone_number, message, twilioClient);
          }
        }

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
