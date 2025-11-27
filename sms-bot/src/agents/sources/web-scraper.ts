/**
 * Web Scraper Source
 * Fetches and extracts structured content from web pages using CSS selectors
 */

import type { NormalizedItem, WebScraperSourceConfig } from '@vibeceo/shared-types';
import * as cheerio from 'cheerio';

/**
 * Fetch and extract content from a web page
 */
export async function fetchWebScraperSource(
  config: WebScraperSourceConfig
): Promise<NormalizedItem[]> {
  const { url, selectors, extractMode, maxItems } = config;

  console.log(`📄 Fetching web page: ${url}`);

  try {
    // Fetch the web page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KochiBot/1.0; +https://kochi.to)',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    let items: NormalizedItem[] = [];

    if (extractMode === 'list' && selectors?.container) {
      // Extract multiple items from a list
      const containers = $(selectors.container);

      console.log(`📋 Found ${containers.length} containers`);

      containers.each((index, element) => {
        if (index >= maxItems) return;

        const $el = $(element);

        const item: NormalizedItem = {
          id: url + '#' + index,
          title: selectors.title ? $el.find(selectors.title).first().text().trim() : undefined,
          summary: selectors.summary ? $el.find(selectors.summary).first().text().trim() : undefined,
          url: extractLink($el, selectors.links) || url,
          author: selectors.author ? $el.find(selectors.author).first().text().trim() : undefined,
          publishedAt: selectors.publishedAt ? $el.find(selectors.publishedAt).first().text().trim() : undefined,
          raw: {
            html: $el.html(),
            text: $el.text().trim(),
          },
        };

        items.push(item);
      });

    } else {
      // Extract single item from the page
      const item: NormalizedItem = {
        id: url,
        title: selectors?.title ? $(selectors.title).first().text().trim() : $('title').first().text().trim(),
        summary: selectors?.summary ? $(selectors.summary).first().text().trim() : extractMetaDescription($),
        url,
        author: selectors?.author ? $(selectors.author).first().text().trim() : extractMetaAuthor($),
        publishedAt: selectors?.publishedAt ? $(selectors.publishedAt).first().text().trim() : undefined,
        raw: {
          html: selectors?.content ? $(selectors.content).first().html() : $('body').html(),
          text: selectors?.content ? $(selectors.content).first().text().trim() : $('body').text().trim(),
          title: $('title').first().text().trim(),
          description: extractMetaDescription($),
        },
      };

      items.push(item);
    }

    console.log(`✅ Extracted ${items.length} item(s) from web page`);
    return items;

  } catch (error: any) {
    console.error(`❌ Failed to fetch web page: ${error.message}`);
    throw new Error(`Web scraper failed: ${error.message}`);
  }
}

/**
 * Extract a link from an element
 */
function extractLink($el: cheerio.Cheerio<any>, linkSelector?: string): string | undefined {
  if (!linkSelector) return undefined;

  const href = $el.find(linkSelector).first().attr('href');
  return href;
}

/**
 * Extract meta description from page
 */
function extractMetaDescription($: cheerio.CheerioAPI): string | undefined {
  const description =
    $('meta[name="description"]').attr('content') ||
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="twitter:description"]').attr('content');

  return description?.trim();
}

/**
 * Extract meta author from page
 */
function extractMetaAuthor($: cheerio.CheerioAPI): string | undefined {
  const author =
    $('meta[name="author"]').attr('content') ||
    $('meta[property="article:author"]').attr('content') ||
    $('meta[name="twitter:creator"]').attr('content');

  return author?.trim();
}
