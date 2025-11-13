/**
 * Source Discovery Agent
 *
 * Uses agentic loop to discover the best specific sources for finding candidates
 * matching a given query. Runs on initial setup and every 30 days.
 *
 * Example: "motion designers at startups" might discover:
 * - YouTube: Motion Design School channel, School of Motion channel
 * - Twitter: @motionhorde, @mograph, #motiondesign
 * - RSS: motionographer.com feed, design blogs
 * - GitHub: awesome-motion-design repo
 */

import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
});

export interface DiscoveredSource {
  type: 'youtube' | 'twitter' | 'rss' | 'github' | 'other';
  name: string;
  url?: string;
  channelId?: string;
  handle?: string;
  repo?: string;
  score: number; // 1-10, how relevant/quality
  reason: string; // Why this source is valuable
}

export interface DiscoveredSources {
  youtube: DiscoveredSource[];
  twitter: DiscoveredSource[];
  rss: DiscoveredSource[];
  github: DiscoveredSource[];
  other: DiscoveredSource[];
  discoveredAt: string;
  nextDiscovery: string;
}

/**
 * Run agentic discovery to find specific sources for a query
 */
export async function discoverSources(query: string): Promise<DiscoveredSources> {
  console.log(`[Source Discovery] Starting agentic discovery for: "${query}"`);

  const prompt = `You are a talent sourcing expert. Your task is to discover the BEST specific online sources where we can find candidates matching this query:

"${query}"

IMPORTANT: If this query is too vague, ambiguous, or not a real recruiting search (like "help", "test", single words), return EMPTY arrays for all source types. Do not explain why - just return the empty structure.

Use web search to explore and find:
1. **YouTube channels** - Specific channels where these candidates create content or learn
2. **Twitter accounts/hashtags** - Key influencers, communities, hashtags in this space
3. **RSS feeds** - Job boards, blogs, newsletters relevant to these candidates
4. **GitHub repositories** - Repos where these candidates might contribute (if technical role)
5. **Other sources** - Reddit communities, Discord servers, Slack groups, etc.

For each source you discover:
- Provide the specific name/handle/URL
- Score 1-10 (how valuable for finding quality candidates)
- Brief reason why this source is useful

Focus on finding 3-5 HIGH QUALITY sources per type (not exhaustive lists).
Prioritize active communities and channels where real professionals hang out.

Return your findings as JSON in this format (ALWAYS return valid JSON, even if arrays are empty):
{
  "youtube": [
    {"name": "Channel Name", "channelId": "UC123...", "score": 9, "reason": "Top resource for learning motion design"}
  ],
  "twitter": [
    {"handle": "@username", "score": 8, "reason": "Influential designer with 50k followers"}
  ],
  "rss": [
    {"name": "Feed Name", "url": "https://...", "score": 7, "reason": "Popular job board"}
  ],
  "github": [
    {"name": "Repo Name", "repo": "owner/repo", "score": 6, "reason": "Collection of motion design tools"}
  ],
  "other": [
    {"name": "Source Name", "url": "https://...", "type": "reddit", "score": 8, "reason": "Active community"}
  ]
}`;

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
    console.log('[Source Discovery] Claude response:', text.substring(0, 300) + '...');

    // Parse JSON from response
    let sources: any;

    // Try to extract JSON from markdown code blocks
    const jsonMatch = text.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      sources = JSON.parse(jsonMatch[1]);
    } else {
      // Try to find JSON object in text
      const objectMatch = text.match(/\{[\s\S]*\}/);
      if (objectMatch) {
        sources = JSON.parse(objectMatch[0]);
      } else {
        throw new Error('Could not find JSON in response');
      }
    }

    // Normalize and validate sources
    const discovered: DiscoveredSources = {
      youtube: normalizeSourceArray(sources.youtube || [], 'youtube'),
      twitter: normalizeSourceArray(sources.twitter || [], 'twitter'),
      rss: normalizeSourceArray(sources.rss || [], 'rss'),
      github: normalizeSourceArray(sources.github || [], 'github'),
      other: normalizeSourceArray(sources.other || [], 'other'),
      discoveredAt: new Date().toISOString(),
      nextDiscovery: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
    };

    const totalSources =
      discovered.youtube.length +
      discovered.twitter.length +
      discovered.rss.length +
      discovered.github.length +
      discovered.other.length;

    console.log(`[Source Discovery] Discovered ${totalSources} sources:`);
    console.log(`  - YouTube: ${discovered.youtube.length}`);
    console.log(`  - Twitter: ${discovered.twitter.length}`);
    console.log(`  - RSS: ${discovered.rss.length}`);
    console.log(`  - GitHub: ${discovered.github.length}`);
    console.log(`  - Other: ${discovered.other.length}`);

    return discovered;

  } catch (error) {
    console.error('[Source Discovery] Failed:', error);

    // Log the raw response for debugging if available
    if (error instanceof Error && error.message.includes('Could not find JSON')) {
      console.error('[Source Discovery] Query may be too vague or ambiguous');
    }

    // Return empty sources rather than failing completely
    return {
      youtube: [],
      twitter: [],
      rss: [],
      github: [],
      other: [],
      discoveredAt: new Date().toISOString(),
      nextDiscovery: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    };
  }
}

/**
 * Normalize source array to ensure consistent format
 */
function normalizeSourceArray(sources: any[], type: string): DiscoveredSource[] {
  if (!Array.isArray(sources)) {
    return [];
  }

  return sources
    .filter(s => s && (s.name || s.handle || s.url))
    .map(s => ({
      type: type as any,
      name: s.name || s.handle || s.url || 'Unknown',
      url: s.url,
      channelId: s.channelId,
      handle: s.handle,
      repo: s.repo,
      score: typeof s.score === 'number' ? Math.max(1, Math.min(10, s.score)) : 5,
      reason: s.reason || 'Relevant source',
    }))
    .sort((a, b) => b.score - a.score); // Sort by score descending
}

/**
 * Check if sources need refresh (every 30 days)
 */
export function shouldRefreshSources(preferences: any): boolean {
  if (!preferences?.sources?.nextDiscovery) {
    return true; // No discovery yet, should run
  }

  const nextDiscovery = new Date(preferences.sources.nextDiscovery);
  const now = new Date();

  return now >= nextDiscovery;
}

/**
 * Merge new sources with existing ones (for 30-day refresh)
 */
export function mergeSources(
  existing: DiscoveredSources,
  newSources: DiscoveredSources
): DiscoveredSources {
  // For each type, combine and dedupe by name/handle/url
  const merge = (existingList: DiscoveredSource[], newList: DiscoveredSource[]) => {
    const seen = new Map<string, DiscoveredSource>();

    // Add existing sources
    for (const source of existingList) {
      const key = source.handle || source.channelId || source.url || source.name;
      seen.set(key.toLowerCase(), source);
    }

    // Add or update with new sources (prefer new data)
    for (const source of newList) {
      const key = source.handle || source.channelId || source.url || source.name;
      seen.set(key.toLowerCase(), source);
    }

    return Array.from(seen.values()).sort((a, b) => b.score - a.score);
  };

  return {
    youtube: merge(existing.youtube, newSources.youtube),
    twitter: merge(existing.twitter, newSources.twitter),
    rss: merge(existing.rss, newSources.rss),
    github: merge(existing.github, newSources.github),
    other: merge(existing.other, newSources.other),
    discoveredAt: newSources.discoveredAt,
    nextDiscovery: newSources.nextDiscovery,
  };
}
