/**
 * Arxiv source fetcher
 * Fetches papers from Arxiv API and normalizes them
 */

import type { NormalizedItem } from '@vibeceo/shared-types';

export interface ArxivConfig {
  query?: string;
  maxItems?: number;
  category?: string;
}

interface ArxivEntry {
  id: string;
  title: string;
  summary: string;
  author: Array<{ name: string }>;
  published: string;
  link: Array<{ $: { href: string; rel: string } }>;
}

export async function fetchArxivPapers(config: ArxivConfig): Promise<NormalizedItem[]> {
  const {
    query = 'AI',
    maxItems = 10,
    category,
  } = config;

  // Build Arxiv API query
  const searchQuery = category ? `cat:${category}` : `all:${query}`;
  const url = `http://export.arxiv.org/api/query?search_query=${encodeURIComponent(searchQuery)}&start=0&max_results=${maxItems}&sortBy=submittedDate&sortOrder=descending`;

  console.log(`📡 Fetching Arxiv papers: ${url}`);

  try {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Arxiv API error: ${response.statusText}`);
    }

    const xmlText = await response.text();

    // Parse XML (simplified - for production use a proper XML parser)
    const entries = await parseArxivXML(xmlText);

    // Normalize to NormalizedItem
    const normalized: NormalizedItem[] = entries.map(entry => ({
      id: entry.id,
      title: entry.title?.trim(),
      summary: entry.summary?.trim().substring(0, 500), // Truncate long summaries
      url: entry.link?.find(l => l.$.rel === 'alternate')?.$.href || entry.id,
      publishedAt: entry.published,
      author: entry.author?.[0]?.name || 'Unknown',
      raw: entry,
    }));

    console.log(`✅ Fetched ${normalized.length} papers from Arxiv`);
    return normalized;

  } catch (error: any) {
    console.error('❌ Error fetching Arxiv papers:', error.message);
    throw error;
  }
}

/**
 * Simple XML parser for Arxiv feed
 * For production, use a proper XML parsing library like xml2js
 */
async function parseArxivXML(xml: string): Promise<ArxivEntry[]> {
  // This is a simplified parser
  // In a real implementation, use xml2js or cheerio

  const entries: ArxivEntry[] = [];
  const entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
  const matches = xml.matchAll(entryRegex);

  for (const match of matches) {
    const entryXML = match[1];

    const entry: ArxivEntry = {
      id: extractTag(entryXML, 'id'),
      title: extractTag(entryXML, 'title'),
      summary: extractTag(entryXML, 'summary'),
      published: extractTag(entryXML, 'published'),
      author: [{ name: extractTag(entryXML, 'name') }],
      link: [
        {
          $: {
            href: extractAttr(entryXML, 'link', 'href'),
            rel: extractAttr(entryXML, 'link', 'rel'),
          },
        },
      ],
    };

    entries.push(entry);
  }

  return entries;
}

function extractTag(xml: string, tag: string): string {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

function extractAttr(xml: string, tag: string, attr: string): string {
  const regex = new RegExp(`<${tag}[^>]*${attr}="([^"]*)"`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : '';
}
