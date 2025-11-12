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
        `❌ No candidates found for "${query}"\n\nTry a different query or broader criteria.`,
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

    // Store candidates in database
    const reportDate = new Date().toISOString().split('T')[0];

    for (let i = 0; i < diverseCandidates.length; i++) {
      const candidate = diverseCandidates[i];

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
        source: candidate.source,
        raw_profile: candidate.raw_profile,
        report_type: 'setup',
        report_date: reportDate,
        position_in_report: i + 1,
      });
    }

    console.log(`[Recruiting] Stored ${diverseCandidates.length} diverse candidates`);

    // Send SMS with candidates
    let message = `✨ Found ${diverseCandidates.length} diverse candidates!\n\n`;

    for (let i = 0; i < diverseCandidates.length; i++) {
      const candidate = diverseCandidates[i];
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

    message += `---\n💡 Score each candidate 1-5:\nSCORE 1:5 2:3 3:4...\n\n(5=great match, 1=poor match)`;

    await sendChunkedSmsResponse(from, message, twilioClient);

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

  const prompt = `You are a recruiting assistant. From these search results, select 10 DIVERSE candidates that match the query: "${query}"

DIVERSITY CRITERIA (this is critical):
- Vary seniority levels (junior, mid, senior, lead, principal, etc.)
- Vary company sizes (startups, mid-size, large enterprises)
- Vary tech stacks and specializations
- DO NOT prioritize geography

For each selected candidate, provide:
1. name
2. title
3. company
4. company_size (estimate: "startup", "midsize", "enterprise")
5. location
6. linkedin_url OR twitter_handle (or both)
7. match_reason (1-2 sentences: why they match the query)
8. recent_activity (if available from Twitter)
9. source ("linkedin", "twitter", or "both")

Return EXACTLY 10 candidates as a JSON array.

LinkedIn Candidates:
${JSON.stringify(linkedInCandidates.slice(0, 20), null, 2)}

Twitter Candidates:
${JSON.stringify(twitterCandidates.slice(0, 20), null, 2)}

Return ONLY a JSON array of 10 candidates with the fields above. No markdown, no explanation.`;

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

    // Try to parse JSON from response
    let candidates: any[];

    // Handle markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
    if (jsonMatch) {
      candidates = JSON.parse(jsonMatch[1]);
    } else {
      candidates = JSON.parse(text);
    }

    console.log(`[Recruiting] Claude selected ${candidates.length} diverse candidates`);

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
  const { registerDailyJob } = require('../../lib/scheduler/index.js');

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
