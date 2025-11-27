/**
 * Podcast source fetcher
 * Fetches episodes from podcast RSS feeds
 */

import type { NormalizedItem } from '@vibeceo/shared-types';
import { fetchRssSource } from './rss.js';

export interface PodcastConfig {
  feedUrl: string;
  maxItems?: number;
}

/**
 * Fetch podcast episodes from RSS feed
 * This is essentially a wrapper around RSS fetcher with podcast-specific formatting
 */
export async function fetchPodcast(config: PodcastConfig): Promise<NormalizedItem[]> {
  const { feedUrl, maxItems = 10 } = config;

  console.log(`🎙️ Fetching podcast episodes from ${feedUrl}...`);

  try {
    // Use existing RSS fetcher
    const items = await fetchRssSource({
      feedUrl,
      maxItems,
    });

    // Add podcast-specific enhancements
    const enhanced = items.map(item => ({
      ...item,
      id: `podcast-${item.id}`,
      // Podcasts often have duration in the raw data
      summary: item.summary || item.title,
    }));

    console.log(`✅ Fetched ${enhanced.length} podcast episodes`);
    return enhanced;

  } catch (error: any) {
    console.error('❌ Error fetching podcast:', error.message);
    throw error;
  }
}
