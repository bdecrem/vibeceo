/**
 * RSS Source Fetcher
 * Fetches items from RSS/Atom feeds and normalizes them
 */

import Parser from 'rss-parser';
import { gunzipSync } from 'zlib';
import type { NormalizedItem, RssSourceConfig } from '@vibeceo/shared-types';

const parser = new Parser({
  customFields: {
    item: ['contentSnippet', 'content', 'summary', 'author', 'creator'],
  },
});

export async function fetchRssSource(config: RssSourceConfig): Promise<NormalizedItem[]> {
  const { feedUrl, maxItems = 10 } = config;

  console.log(`📡 Fetching RSS feed: ${feedUrl}`);

  try {
    // Manually fetch with proper headers to handle gzip compression
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(feedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/rss+xml, application/xml, text/xml, */*',
        'Accept-Encoding': 'gzip, deflate',
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Get the content type
    const contentType = response.headers.get('content-type') || '';
    console.log(`   Content-Type: ${contentType}`);

    // Get raw array buffer and convert to Buffer
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Check if gzip compressed by looking at the magic number
    let xmlText: string;
    if (buffer[0] === 0x1f && buffer[1] === 0x8b) {
      // Gzip compressed
      console.log(`   Decompressing gzipped content...`);
      xmlText = gunzipSync(buffer).toString('utf-8');
    } else {
      xmlText = buffer.toString('utf-8');
    }

    // Parse the XML
    const feed = await parser.parseString(xmlText);

    const items: NormalizedItem[] = [];

    // Process feed items
    const itemsToProcess = feed.items.slice(0, maxItems);

    for (const item of itemsToProcess) {
      // Type assertion for custom fields
      const customItem = item as any;

      const normalized: NormalizedItem = {
        id: item.guid || item.link || `item-${items.length}`,
        title: item.title || 'Untitled',
        summary: customItem.contentSnippet || customItem.content || customItem.summary || item.content || '',
        url: item.link || '',
        publishedAt: item.pubDate || item.isoDate,
        author: customItem.creator || customItem.author || feed.title || 'Unknown',
        raw: item,
      };

      items.push(normalized);
    }

    console.log(`✅ Fetched ${items.length} items from RSS feed`);
    return items;

  } catch (error: any) {
    console.error(`❌ Error fetching RSS feed: ${error.message}`);
    throw new Error(`RSS fetch failed: ${error.message}`);
  }
}
