/**
 * Google News source fetcher
 * Fetches news articles from Google News RSS feeds
 */

import type { NormalizedItem } from '@vibeceo/shared-types';
import { fetchRssSource } from './rss.js';

export interface GoogleNewsConfig {
  query?: string;
  country?: string; // e.g., 'US', 'GB', 'AU'
  language?: string; // e.g., 'en', 'es', 'fr'
  maxItems?: number;
}

export async function fetchGoogleNews(config: GoogleNewsConfig): Promise<NormalizedItem[]> {
  const {
    query,
    country = 'US',
    language = 'en',
    maxItems = 10,
  } = config;

  console.log(`📰 Fetching Google News (${country})...`);

  try {
    // Build Google News RSS URL
    let feedUrl: string;

    if (query) {
      // Search query
      feedUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=${language}&gl=${country}`;
    } else {
      // Top news
      feedUrl = `https://news.google.com/rss?hl=${language}&gl=${country}`;
    }

    // Use existing RSS fetcher
    const items = await fetchRssSource({
      feedUrl,
      maxItems,
    });

    // Add google-news specific ID prefix
    const enhanced = items.map(item => ({
      ...item,
      id: `google-news-${item.id}`,
    }));

    console.log(`✅ Fetched ${enhanced.length} news articles from Google News`);
    return enhanced;

  } catch (error: any) {
    console.error('❌ Error fetching Google News:', error.message);
    throw error;
  }
}
