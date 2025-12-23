/**
 * AI Twitter Daily - Twitter Fetcher
 *
 * Fetches tweets from curated AI Twitter accounts using the search API workaround.
 * Twitter free tier doesn't support reading timelines, but search works with "from:handle".
 */

import { searchTweets, type Tweet } from '../../lib/twitter-client.js';
import { supabase } from '../../lib/supabase.js';

export interface TwitterSource {
  id: string;
  identifier: string; // Twitter handle (without @)
  displayName: string;
  priority: number;
}

export interface FetchedTweet extends Tweet {
  sourceHandle: string;
  sourceName: string;
  sourcePriority: number;
}

/**
 * Load active Twitter accounts from content_sources table
 */
export async function loadTwitterSources(): Promise<TwitterSource[]> {
  const { data, error } = await supabase
    .from('content_sources')
    .select('id, identifier, display_name, priority')
    .eq('agent_slug', 'ai-twitter-daily')
    .eq('source_type', 'twitter_account')
    .eq('active', true)
    .order('priority', { ascending: false });

  if (error) {
    console.error('[AI Twitter Daily] Failed to load sources:', error);
    throw new Error(`Failed to load Twitter sources: ${error.message}`);
  }

  return (data || []).map((row) => ({
    id: row.id,
    identifier: row.identifier,
    displayName: row.display_name || row.identifier,
    priority: row.priority || 50,
  }));
}

/**
 * Build search query from handles
 * Twitter search supports: from:handle1 OR from:handle2 ...
 * Note: Query must be under 512 chars, so we batch if needed
 */
function buildSearchQuery(handles: string[]): string[] {
  const queries: string[] = [];
  let currentQuery = '';

  for (const handle of handles) {
    const term = `from:${handle}`;
    const newQuery = currentQuery ? `${currentQuery} OR ${term}` : term;

    // Keep some buffer under 512 chars
    if (newQuery.length > 450) {
      queries.push(currentQuery);
      currentQuery = term;
    } else {
      currentQuery = newQuery;
    }
  }

  if (currentQuery) {
    queries.push(currentQuery);
  }

  return queries;
}

/**
 * Fetch recent tweets from all AI Twitter accounts
 * Uses multiple batched queries to handle 15+ accounts
 */
export async function fetchAITwitterContent(): Promise<FetchedTweet[]> {
  console.log('[AI Twitter Daily] Fetching tweets from curated accounts...');

  // Load sources from database
  const sources = await loadTwitterSources();
  if (sources.length === 0) {
    throw new Error('No active Twitter sources configured');
  }

  console.log(`[AI Twitter Daily] Found ${sources.length} active accounts`);

  // Create lookup map for enrichment
  const sourceMap = new Map<string, TwitterSource>();
  for (const source of sources) {
    sourceMap.set(source.identifier.toLowerCase(), source);
  }

  // Build batched search queries
  const handles = sources.map((s) => s.identifier);
  const queries = buildSearchQuery(handles);
  console.log(`[AI Twitter Daily] Built ${queries.length} search queries`);

  // Fetch tweets from all queries
  const allTweets: FetchedTweet[] = [];

  for (const query of queries) {
    console.log(`[AI Twitter Daily] Searching: ${query.substring(0, 100)}...`);

    const result = await searchTweets(query, 100); // Max 100 per query

    if (!result.success) {
      console.error(`[AI Twitter Daily] Search failed: ${result.error}`);
      continue;
    }

    if (!result.tweets || result.tweets.length === 0) {
      console.log('[AI Twitter Daily] No tweets found for this query');
      continue;
    }

    // Enrich tweets with source info
    for (const tweet of result.tweets) {
      const handle = tweet.authorUsername?.toLowerCase();
      const source = handle ? sourceMap.get(handle) : null;

      if (source) {
        allTweets.push({
          ...tweet,
          sourceHandle: source.identifier,
          sourceName: source.displayName,
          sourcePriority: source.priority,
        });
      } else {
        // Still include but with lower priority
        allTweets.push({
          ...tweet,
          sourceHandle: tweet.authorUsername || 'unknown',
          sourceName: tweet.authorName || 'Unknown',
          sourcePriority: 0,
        });
      }
    }

    // Rate limit: wait between queries
    if (queries.length > 1) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  console.log(`[AI Twitter Daily] Fetched ${allTweets.length} total tweets`);

  // Sort by priority then by date
  allTweets.sort((a, b) => {
    if (a.sourcePriority !== b.sourcePriority) {
      return b.sourcePriority - a.sourcePriority;
    }
    // Sort by date (newest first)
    const dateA = new Date(a.createdAt || 0).getTime();
    const dateB = new Date(b.createdAt || 0).getTime();
    return dateB - dateA;
  });

  return allTweets;
}

/**
 * Filter tweets to only those from the last N hours
 */
export function filterRecentTweets(tweets: FetchedTweet[], hoursAgo: number = 24): FetchedTweet[] {
  const cutoff = Date.now() - hoursAgo * 60 * 60 * 1000;

  return tweets.filter((tweet) => {
    if (!tweet.createdAt) return true; // Include if no date
    const tweetTime = new Date(tweet.createdAt).getTime();
    return tweetTime >= cutoff;
  });
}
