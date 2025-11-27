/**
 * URL Extraction Pipeline Step
 * Extracts URLs from text and optionally expands short links
 */

import type { NormalizedItem, URLExtractionStep } from '@vibeceo/shared-types';

// URL regex pattern
const URL_REGEX = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=]*)/gi;

// Short URL services
const SHORT_URL_DOMAINS = [
  't.co',
  'bit.ly',
  'tinyurl.com',
  'goo.gl',
  'ow.ly',
  'buff.ly',
  'is.gd',
  'cutt.ly',
  'short.link',
  'tiny.cc',
];

/**
 * Check if a URL is a short link
 */
function isShortLink(url: string): boolean {
  try {
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase().replace('www.', '');
    return SHORT_URL_DOMAINS.some(domain => hostname === domain || hostname.endsWith(`.${domain}`));
  } catch {
    return false;
  }
}

/**
 * Extract domain from URL
 */
function extractDomain(url: string): string | null {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname.replace('www.', '');
  } catch {
    return null;
  }
}

/**
 * Expand a short URL by following redirects
 */
async function expandShortURL(shortUrl: string): Promise<string> {
  try {
    // Use HEAD request to follow redirects without downloading content
    const response = await fetch(shortUrl, {
      method: 'HEAD',
      redirect: 'follow',
    });

    return response.url || shortUrl;
  } catch (error: any) {
    console.error(`   ⚠️ Failed to expand ${shortUrl}: ${error.message}`);
    return shortUrl;
  }
}

/**
 * Extract all URLs from text
 */
function extractURLsFromText(text: string): string[] {
  const matches = text.match(URL_REGEX);
  if (!matches) return [];

  // Deduplicate URLs
  return Array.from(new Set(matches));
}

/**
 * Extract and expand URLs from items
 */
export async function extractURLs(
  items: NormalizedItem[],
  config: URLExtractionStep
): Promise<NormalizedItem[]> {
  if (items.length === 0) {
    return [];
  }

  const {
    expandShortLinks = true,
    extractDomain: shouldExtractDomain = true,
  } = config;

  const operations: string[] = [];
  if (expandShortLinks) operations.push('expand short links');
  if (shouldExtractDomain) operations.push('extract domains');

  console.log(`🔗 Extracting URLs from ${items.length} items (${operations.join(', ')})...`);

  try {
    const enrichedItems = await Promise.all(
      items.map(async (item) => {
        const textToAnalyze = `${item.title || ''} ${item.summary || ''}`.trim();
        const urls = extractURLsFromText(textToAnalyze);

        // Include the item's main URL if it exists
        if (item.url && !urls.includes(item.url)) {
          urls.unshift(item.url);
        }

        let expandedURLs = urls;

        // Expand short links if enabled
        if (expandShortLinks) {
          const expansionPromises = urls.map(async (url) => {
            if (isShortLink(url)) {
              const expanded = await expandShortURL(url);
              return { original: url, expanded };
            }
            return { original: url, expanded: url };
          });

          const expansionResults = await Promise.all(expansionPromises);
          expandedURLs = expansionResults.map(r => r.expanded);
        }

        // Extract domains if enabled
        let domains: string[] = [];
        if (shouldExtractDomain) {
          domains = expandedURLs
            .map(extractDomain)
            .filter((domain): domain is string => domain !== null);

          // Deduplicate domains
          domains = Array.from(new Set(domains));
        }

        return {
          ...item,
          extractedURLs: expandedURLs,
          ...(shouldExtractDomain && { domains }),
        };
      })
    );

    const totalURLs = enrichedItems.reduce(
      (sum, item) => sum + ((item as any).extractedURLs?.length || 0),
      0
    );

    console.log(`✅ Extracted ${totalURLs} URLs from ${enrichedItems.length} items`);
    return enrichedItems;
  } catch (error: any) {
    console.error(`❌ URL extraction failed: ${error.message}`);
    return items;
  }
}
