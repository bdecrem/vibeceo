/**
 * RSS Collector
 *
 * Fetches candidates from RSS feeds discovered by the source discovery agent.
 * Parses job boards, blogs, newsletters, and other RSS feeds.
 *
 * Note: RSS feeds don't have structured candidate data, so we extract what we can
 * from titles, descriptions, and links.
 */

import type { DiscoveredSource } from '../source-discovery-agent.js';

export interface RSSCandidate {
  name: string; // Extracted from post title or author
  title?: string; // Job title if it's a job posting
  source: string; // Feed name
  link: string; // Link to full post/profile
  description?: string;
  publishedAt?: string;
  rawData: any;
}

/**
 * Collect candidates from discovered RSS feeds
 */
export async function collectFromRSS(
  sources: DiscoveredSource[],
  maxCandidates: number = 20
): Promise<RSSCandidate[]> {
  if (sources.length === 0) {
    console.log('[RSS Collector] No sources provided');
    return [];
  }

  console.log(`[RSS Collector] Collecting from ${sources.length} sources, max ${maxCandidates} candidates`);

  const candidates: RSSCandidate[] = [];
  const seenLinks = new Set<string>();

  // Process sources in order of score (highest first)
  const sortedSources = [...sources].sort((a, b) => b.score - a.score);

  for (const source of sortedSources) {
    if (candidates.length >= maxCandidates) {
      break;
    }

    if (!source.url) {
      console.warn(`[RSS Collector] Source ${source.name} has no URL`);
      continue;
    }

    try {
      const feedItems = await parseFeed(source.url);

      for (const item of feedItems) {
        if (seenLinks.has(item.link)) continue;
        seenLinks.add(item.link);

        candidates.push({
          name: item.author || extractNameFromTitle(item.title) || 'Unknown',
          title: extractJobTitle(item.title),
          source: source.name,
          link: item.link,
          description: item.description?.substring(0, 200),
          publishedAt: item.publishedAt,
          rawData: item,
        });

        if (candidates.length >= maxCandidates) {
          break;
        }
      }

      console.log(`[RSS Collector] Processed ${source.name}: ${feedItems.length} items (total: ${candidates.length})`);

    } catch (error) {
      console.error(`[RSS Collector] Failed to fetch from ${source.name}:`, error);
    }
  }

  console.log(`[RSS Collector] Collected ${candidates.length} total candidates`);
  return candidates;
}

/**
 * Parse RSS feed (simple XML parsing)
 */
async function parseFeed(url: string): Promise<any[]> {
  try {
    const response = await fetch(url);

    if (!response.ok) {
      console.error(`[RSS Collector] Failed to fetch feed ${url}: ${response.status}`);
      return [];
    }

    const xml = await response.text();

    // Simple XML parsing (extract items/entries)
    const items: any[] = [];

    // Try RSS 2.0 format
    const rssItemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g);
    for (const match of rssItemMatches) {
      const itemXml = match[1];
      items.push(parseItem(itemXml, 'rss'));
    }

    // Try Atom format
    if (items.length === 0) {
      const atomEntryMatches = xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g);
      for (const match of atomEntryMatches) {
        const entryXml = match[1];
        items.push(parseItem(entryXml, 'atom'));
      }
    }

    return items.slice(0, 50); // Limit to 50 most recent items

  } catch (error) {
    console.error(`[RSS Collector] Failed to parse feed ${url}:`, error);
    return [];
  }
}

/**
 * Parse individual RSS/Atom item
 */
function parseItem(xml: string, format: 'rss' | 'atom'): any {
  const extractTag = (tagName: string): string | null => {
    const match = xml.match(new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\/${tagName}>`, 'i'));
    return match ? match[1].trim().replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1') : null;
  };

  const extractAtomLink = (): string | null => {
    const match = xml.match(/<link[^>]*href="([^"]+)"/i);
    return match ? match[1] : null;
  };

  if (format === 'rss') {
    return {
      title: extractTag('title'),
      link: extractTag('link'),
      description: extractTag('description') || extractTag('content:encoded'),
      author: extractTag('author') || extractTag('dc:creator'),
      publishedAt: extractTag('pubDate') || extractTag('published'),
    };
  } else {
    return {
      title: extractTag('title'),
      link: extractAtomLink(),
      description: extractTag('summary') || extractTag('content'),
      author: extractTag('author'),
      publishedAt: extractTag('published') || extractTag('updated'),
    };
  }
}

/**
 * Extract name from title (e.g., "John Doe - Senior Engineer" -> "John Doe")
 */
function extractNameFromTitle(title: string | null): string | null {
  if (!title) return null;

  // Common patterns in job postings
  const patterns = [
    /^([A-Z][a-z]+ [A-Z][a-z]+) -/,  // "John Doe - Title"
    /^([A-Z][a-z]+ [A-Z][a-z]+):/,   // "John Doe: Title"
    /by ([A-Z][a-z]+ [A-Z][a-z]+)/,  // "Article by John Doe"
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) return match[1];
  }

  return null;
}

/**
 * Extract job title from RSS item title
 */
function extractJobTitle(title: string | null): string | undefined {
  if (!title) return undefined;

  // Remove common prefixes
  const cleaned = title
    .replace(/^(hiring|seeking|looking for|wanted|opening):/i, '')
    .replace(/^[^-]+ - /, '') // Remove "Company Name - "
    .trim();

  // If it looks like a job title, return it
  if (cleaned.match(/(engineer|developer|designer|manager|analyst|lead|architect)/i)) {
    return cleaned.substring(0, 100);
  }

  return undefined;
}
