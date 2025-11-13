/**
 * Candidate Scorer
 *
 * Uses Claude to assess candidate quality and match to query.
 * Combines candidates from multiple sources (GitHub, Twitter, RSS, YouTube)
 * and selects the best matches.
 */

import Anthropic from '@anthropic-ai/sdk';
import type { GitHubCandidate } from './collectors/github-collector.js';
import type { TwitterCandidate } from './collectors/twitter-collector.js';
import type { RSSCandidate } from './collectors/rss-collector.js';
import type { YouTubeCandidate } from './collectors/youtube-collector.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export interface ScoredCandidate {
  name: string;
  title?: string;
  company?: string;
  company_size?: string;
  location?: string;
  linkedin_url?: string;
  twitter_handle?: string;
  github_url?: string;
  youtube_url?: string;
  website?: string;
  match_reason: string;
  recent_activity?: string;
  source: string;
  raw_profile: any;
}

export interface CollectedCandidates {
  github: GitHubCandidate[];
  twitter: TwitterCandidate[];
  rss: RSSCandidate[];
  youtube: YouTubeCandidate[];
}

/**
 * Score and select top candidates from all sources
 */
export async function scoreAndSelectCandidates(
  collected: CollectedCandidates,
  query: string,
  maxCandidates: number = 10,
  learnedPreferences?: any
): Promise<ScoredCandidate[]> {
  console.log('[Candidate Scorer] Scoring candidates from all sources...');
  console.log(`[Candidate Scorer] Input: ${collected.github.length} GitHub, ${collected.twitter.length} Twitter, ${collected.rss.length} RSS, ${collected.youtube.length} YouTube`);

  const totalCandidates =
    collected.github.length +
    collected.twitter.length +
    collected.rss.length +
    collected.youtube.length;

  if (totalCandidates === 0) {
    console.log('[Candidate Scorer] No candidates to score');
    return [];
  }

  // Build prompt with all candidates
  const preferencesText = learnedPreferences
    ? `\n\nUser's Learned Preferences:\n${JSON.stringify(learnedPreferences, null, 2)}`
    : '';

  const prompt = `You are a recruiting assistant. From these candidates collected from various online sources, select the TOP ${maxCandidates} that best match this query:

"${query}"${preferencesText}

Available Candidates:

## GitHub (${collected.github.length} candidates)
${JSON.stringify(collected.github.slice(0, 20), null, 2)}

## Twitter (${collected.twitter.length} candidates)
${JSON.stringify(collected.twitter.slice(0, 20), null, 2)}

## RSS Feeds (${collected.rss.length} candidates)
${JSON.stringify(collected.rss.slice(0, 20), null, 2)}

## YouTube (${collected.youtube.length} candidates)
${JSON.stringify(collected.youtube.slice(0, 20), null, 2)}

For each selected candidate, provide:
- name: string (required)
- title: string or null (job title if known)
- company: string or null
- company_size: "startup" | "midsize" | "enterprise" | "unknown"
- location: string or null
- linkedin_url: string or null
- twitter_handle: string or null (format: @username)
- github_url: string or null
- youtube_url: string or null
- website: string or null
- match_reason: 1-2 sentences explaining why they're a strong match
- recent_activity: string or null (recent work/posts)
- source: "github" | "twitter" | "rss" | "youtube" | "multiple"

Return ONLY a JSON array of the top ${maxCandidates} candidates.
Format: [{"name": "...", "title": "...", ...}]`;

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
    console.log('[Candidate Scorer] Claude response:', text.substring(0, 300) + '...');

    // Parse JSON from response
    let candidates: any[];

    try {
      let jsonText = text;

      // Try to extract JSON from markdown code blocks
      const markdownMatch = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/);
      if (markdownMatch) {
        console.log('[Candidate Scorer] Found JSON in markdown code block');
        jsonText = markdownMatch[1];
      } else {
        // Try to find JSON array in text
        const arrayMatch = text.match(/\[[\s\S]*\]/);
        if (arrayMatch) {
          console.log('[Candidate Scorer] Found JSON array in response');
          jsonText = arrayMatch[0];
        }
      }

      candidates = JSON.parse(jsonText);

      if (!Array.isArray(candidates)) {
        console.error('[Candidate Scorer] Parsed result is not an array');
        throw new Error('Response is not a JSON array');
      }

      console.log(`[Candidate Scorer] Successfully parsed ${candidates.length} candidates`);

    } catch (error) {
      console.error('[Candidate Scorer] Failed to parse Claude response as JSON:', error);
      console.error('[Candidate Scorer] Full response:', text);
      console.warn('[Candidate Scorer] Using fallback selection');
      return buildFallbackCandidates(collected, maxCandidates, query);
    }

    // Enrich candidates with raw_profile data
    for (const candidate of candidates) {
      enrichCandidateWithRawProfile(candidate, collected);
    }

    // Ensure we have at least some candidates
    if (candidates.length < Math.min(maxCandidates, totalCandidates / 2)) {
      console.warn(`[Candidate Scorer] Claude returned only ${candidates.length} candidates, adding fallback`);
      const fallback = buildFallbackCandidates(collected, maxCandidates, query);
      candidates = ensureMinimumCandidates(candidates, fallback, maxCandidates);
    }

    return candidates.slice(0, maxCandidates);

  } catch (error) {
    console.error('[Candidate Scorer] Scoring failed:', error);
    return buildFallbackCandidates(collected, maxCandidates, query);
  }
}

/**
 * Enrich candidate with raw_profile from original source
 */
function enrichCandidateWithRawProfile(candidate: any, collected: CollectedCandidates): void {
  // Try to find the original profile data
  if (candidate.github_url) {
    const original = collected.github.find(c =>
      c.profileUrl === candidate.github_url || c.username === candidate.github_url.split('/').pop()
    );
    if (original) {
      candidate.raw_profile = original.rawProfile;
      return;
    }
  }

  if (candidate.twitter_handle) {
    const original = collected.twitter.find(c =>
      c.handle === candidate.twitter_handle || c.handle === `@${candidate.twitter_handle.replace('@', '')}`
    );
    if (original) {
      candidate.raw_profile = original.rawProfile;
      return;
    }
  }

  if (candidate.youtube_url) {
    const original = collected.youtube.find(c =>
      c.channelUrl === candidate.youtube_url
    );
    if (original) {
      candidate.raw_profile = original.rawData;
      return;
    }
  }

  // Default empty profile
  candidate.raw_profile = {};
}

/**
 * Build fallback candidates (simple selection when Claude fails)
 */
function buildFallbackCandidates(
  collected: CollectedCandidates,
  maxCandidates: number,
  query: string
): ScoredCandidate[] {
  console.log('[Candidate Scorer] Building fallback candidate list');

  const fallback: ScoredCandidate[] = [];
  const seen = new Set<string>();

  // Helper to add candidate with deduplication
  const addCandidate = (c: any) => {
    const key = c.name.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    fallback.push(c);
  };

  // Add GitHub candidates
  for (const gh of collected.github) {
    if (fallback.length >= maxCandidates) break;
    addCandidate({
      name: gh.name,
      title: gh.bio?.substring(0, 100),
      company: gh.company,
      company_size: 'unknown',
      location: gh.location,
      github_url: gh.profileUrl,
      twitter_handle: gh.twitterHandle,
      website: gh.blog,
      match_reason: `Active GitHub user with ${gh.publicRepos} repos`,
      recent_activity: gh.recentActivity,
      source: 'github',
      raw_profile: gh.rawProfile,
    });
  }

  // Add Twitter candidates
  for (const tw of collected.twitter) {
    if (fallback.length >= maxCandidates) break;
    addCandidate({
      name: tw.name,
      title: tw.bio?.substring(0, 100),
      location: tw.location,
      twitter_handle: tw.handle,
      website: tw.website,
      match_reason: `Active on Twitter with ${tw.followers} followers`,
      recent_activity: tw.recentTweets?.[0],
      source: 'twitter',
      raw_profile: tw.rawProfile,
    });
  }

  // Add YouTube candidates
  for (const yt of collected.youtube) {
    if (fallback.length >= maxCandidates) break;
    addCandidate({
      name: yt.name,
      title: `YouTube Creator (${yt.subscriberCount?.toLocaleString()} subscribers)`,
      youtube_url: yt.channelUrl,
      match_reason: `YouTube channel with ${yt.videoCount} videos`,
      recent_activity: yt.recentVideos?.[0],
      source: 'youtube',
      raw_profile: yt.rawData,
    });
  }

  // Add RSS candidates
  for (const rss of collected.rss) {
    if (fallback.length >= maxCandidates) break;
    addCandidate({
      name: rss.name,
      title: rss.title,
      website: rss.link,
      match_reason: `Found via ${rss.source}`,
      recent_activity: rss.description,
      source: 'rss',
      raw_profile: rss.rawData,
    });
  }

  return fallback.slice(0, maxCandidates);
}

/**
 * Ensure minimum number of candidates by adding from fallback pool
 */
function ensureMinimumCandidates(
  selected: ScoredCandidate[],
  fallbackPool: ScoredCandidate[],
  targetCount: number
): ScoredCandidate[] {
  const keyFor = (c: ScoredCandidate) =>
    c.github_url || c.twitter_handle || c.youtube_url || c.name.toLowerCase();

  const seen = new Set(selected.map(keyFor));
  const hydrated = [...selected];

  for (const candidate of fallbackPool) {
    if (hydrated.length >= targetCount) break;

    const key = keyFor(candidate);
    if (seen.has(key)) continue;

    seen.add(key);
    hydrated.push(candidate);
  }

  return hydrated.slice(0, targetCount);
}
