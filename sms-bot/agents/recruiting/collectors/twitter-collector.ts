/**
 * Twitter Collector
 *
 * Fetches candidates from specific Twitter sources discovered by the source discovery agent.
 * Uses Twitter API v2 to find users by handle, search hashtags, and get followers.
 *
 * Note: Twitter API v2 free tier is limited. Consider paid tier for production use.
 */

import type { DiscoveredSource } from '../source-discovery-agent.js';

const TWITTER_BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN;

export interface TwitterCandidate {
  name: string;
  handle: string;
  profileUrl: string;
  bio?: string;
  location?: string;
  website?: string;
  followers?: number;
  verified?: boolean;
  recentTweets?: string[];
  rawProfile: any;
}

/**
 * Collect candidates from discovered Twitter sources
 */
export async function collectFromTwitter(
  sources: DiscoveredSource[],
  maxCandidates: number = 20
): Promise<TwitterCandidate[]> {
  if (sources.length === 0) {
    console.log('[Twitter Collector] No sources provided');
    return [];
  }

  if (!TWITTER_BEARER_TOKEN) {
    console.warn('[Twitter Collector] TWITTER_BEARER_TOKEN not set, skipping Twitter collection');
    return [];
  }

  console.log(`[Twitter Collector] Collecting from ${sources.length} sources, max ${maxCandidates} candidates`);

  const candidates: TwitterCandidate[] = [];
  const seenHandles = new Set<string>();

  // Process sources in order of score (highest first)
  const sortedSources = [...sources].sort((a, b) => b.score - a.score);

  for (const source of sortedSources) {
    if (candidates.length >= maxCandidates) {
      break;
    }

    try {
      let newCandidates: TwitterCandidate[] = [];

      if (source.handle) {
        // Fetch specific user
        const user = await fetchTwitterUser(source.handle);
        if (user) {
          newCandidates = [user];
        }
      } else if (source.name && source.name.startsWith('#')) {
        // Search hashtag
        newCandidates = await searchHashtag(source.name, maxCandidates - candidates.length);
      } else if (source.url && source.url.includes('twitter.com')) {
        // Parse Twitter URL
        const match = source.url.match(/twitter\.com\/([^\/\?]+)/);
        if (match) {
          const handle = match[1];
          const user = await fetchTwitterUser(handle);
          if (user) {
            newCandidates = [user];
          }
        }
      }

      // Add new candidates (dedupe by handle)
      for (const candidate of newCandidates) {
        const normalizedHandle = candidate.handle.toLowerCase().replace('@', '');
        if (!seenHandles.has(normalizedHandle)) {
          seenHandles.add(normalizedHandle);
          candidates.push(candidate);

          if (candidates.length >= maxCandidates) {
            break;
          }
        }
      }

      console.log(`[Twitter Collector] Processed ${source.name}: ${newCandidates.length} candidates (total: ${candidates.length})`);

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`[Twitter Collector] Failed to fetch from ${source.name}:`, error);
    }
  }

  console.log(`[Twitter Collector] Collected ${candidates.length} total candidates`);
  return candidates;
}

/**
 * Fetch a Twitter user by handle
 */
async function fetchTwitterUser(handle: string): Promise<TwitterCandidate | null> {
  const normalizedHandle = handle.replace('@', '');

  try {
    const response = await fetch(
      `https://api.twitter.com/2/users/by/username/${normalizedHandle}?user.fields=description,location,public_metrics,url,verified`,
      {
        headers: {
          'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      console.error(`[Twitter Collector] Failed to fetch @${normalizedHandle}: ${response.status}`);
      return null;
    }

    const data = await response.json();

    if (!data.data) {
      return null;
    }

    const user = data.data;

    return {
      name: user.name,
      handle: `@${user.username}`,
      profileUrl: `https://twitter.com/${user.username}`,
      bio: user.description,
      location: user.location,
      website: user.url,
      followers: user.public_metrics?.followers_count,
      verified: user.verified,
      rawProfile: user,
    };

  } catch (error) {
    console.error(`[Twitter Collector] Failed to fetch @${normalizedHandle}:`, error);
    return null;
  }
}

/**
 * Search for users by hashtag
 */
async function searchHashtag(hashtag: string, limit: number = 10): Promise<TwitterCandidate[]> {
  console.log(`[Twitter Collector] Searching hashtag ${hashtag}`);

  try {
    // Search for recent tweets with this hashtag
    const query = hashtag.startsWith('#') ? hashtag : `#${hashtag}`;
    const response = await fetch(
      `https://api.twitter.com/2/tweets/search/recent?query=${encodeURIComponent(query)}&max_results=${Math.min(limit * 2, 100)}&expansions=author_id&user.fields=description,location,public_metrics,verified`,
      {
        headers: {
          'Authorization': `Bearer ${TWITTER_BEARER_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      console.error(`[Twitter Collector] Failed to search ${hashtag}: ${response.status}`);
      return [];
    }

    const data = await response.json();

    if (!data.includes?.users) {
      return [];
    }

    // Extract unique users from tweets
    const candidates: TwitterCandidate[] = [];
    const seenUserIds = new Set<string>();

    for (const user of data.includes.users) {
      if (seenUserIds.has(user.id)) continue;
      seenUserIds.add(user.id);

      candidates.push({
        name: user.name,
        handle: `@${user.username}`,
        profileUrl: `https://twitter.com/${user.username}`,
        bio: user.description,
        location: user.location,
        followers: user.public_metrics?.followers_count,
        verified: user.verified,
        rawProfile: user,
      });

      if (candidates.length >= limit) {
        break;
      }
    }

    return candidates;

  } catch (error) {
    console.error(`[Twitter Collector] Failed to search ${hashtag}:`, error);
    return [];
  }
}
