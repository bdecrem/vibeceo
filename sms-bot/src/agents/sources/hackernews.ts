/**
 * Hacker News source fetcher
 * Fetches stories from Hacker News API
 */

import type { NormalizedItem } from '@vibeceo/shared-types';

export interface HackerNewsConfig {
  feed?: 'top' | 'new' | 'best' | 'ask' | 'show' | 'job';
  maxItems?: number;
}

interface HNStory {
  id: number;
  title: string;
  url?: string;
  text?: string;
  by: string;
  time: number;
  score: number;
  descendants?: number;
}

export async function fetchHackerNews(config: HackerNewsConfig): Promise<NormalizedItem[]> {
  const {
    feed = 'top',
    maxItems = 10,
  } = config;

  console.log(`📰 Fetching Hacker News (${feed}) stories...`);

  try {
    // Fetch story IDs from Hacker News API
    const feedUrl = `https://hacker-news.firebaseio.com/v0/${feed}stories.json`;
    const idsResponse = await fetch(feedUrl);

    if (!idsResponse.ok) {
      throw new Error(`HN API error: ${idsResponse.statusText}`);
    }

    const storyIds: number[] = await idsResponse.json();
    const topIds = storyIds.slice(0, maxItems);

    // Fetch individual stories
    const storyPromises = topIds.map(async (id) => {
      const storyUrl = `https://hacker-news.firebaseio.com/v0/item/${id}.json`;
      const response = await fetch(storyUrl);
      return response.json() as Promise<HNStory>;
    });

    const stories = await Promise.all(storyPromises);

    // Normalize to NormalizedItem
    const normalized: NormalizedItem[] = stories
      .filter(story => story && story.title) // Filter out deleted/null stories
      .map(story => ({
        id: `hn-${story.id}`,
        title: story.title,
        summary: story.text?.substring(0, 500) || `${story.score} points by ${story.by} | ${story.descendants || 0} comments`,
        url: story.url || `https://news.ycombinator.com/item?id=${story.id}`,
        publishedAt: new Date(story.time * 1000).toISOString(),
        author: story.by,
        score: story.score,
        raw: story,
      }));

    console.log(`✅ Fetched ${normalized.length} stories from Hacker News`);
    return normalized;

  } catch (error: any) {
    console.error('❌ Error fetching Hacker News:', error.message);
    throw error;
  }
}
