/**
 * Reddit source fetcher
 * Fetches posts from subreddits using Reddit JSON API
 */

import type { NormalizedItem } from '@vibeceo/shared-types';

export interface RedditConfig {
  subreddit: string;
  sort?: 'hot' | 'new' | 'top' | 'rising';
  timeRange?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  maxItems?: number;
}

interface RedditPost {
  data: {
    id: string;
    title: string;
    selftext: string;
    url: string;
    author: string;
    created_utc: number;
    score: number;
    num_comments: number;
    permalink: string;
    subreddit: string;
  };
}

export async function fetchReddit(config: RedditConfig): Promise<NormalizedItem[]> {
  const {
    subreddit,
    sort = 'hot',
    timeRange = 'day',
    maxItems = 10,
  } = config;

  console.log(`🤖 Fetching Reddit posts from r/${subreddit} (${sort})...`);

  try {
    // Reddit JSON API (no auth required for public subreddits)
    let url = `https://www.reddit.com/r/${subreddit}/${sort}.json?limit=${maxItems}`;

    if (sort === 'top') {
      url += `&t=${timeRange}`;
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'VibeCEO-Agent/1.0',
      },
    });

    if (!response.ok) {
      throw new Error(`Reddit API error: ${response.statusText}`);
    }

    const data = await response.json();
    const posts: RedditPost[] = data.data.children || [];

    // Normalize to NormalizedItem
    const normalized: NormalizedItem[] = posts.map(post => ({
      id: `reddit-${post.data.id}`,
      title: post.data.title,
      summary: post.data.selftext?.substring(0, 500) || `${post.data.score} points | ${post.data.num_comments} comments`,
      url: post.data.url.startsWith('http') ? post.data.url : `https://reddit.com${post.data.permalink}`,
      publishedAt: new Date(post.data.created_utc * 1000).toISOString(),
      author: post.data.author,
      score: post.data.score,
      raw: post.data,
    }));

    console.log(`✅ Fetched ${normalized.length} posts from r/${subreddit}`);
    return normalized;

  } catch (error: any) {
    console.error('❌ Error fetching Reddit:', error.message);
    throw error;
  }
}
