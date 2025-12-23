/**
 * Twitter Content Fetcher
 * Fetches tweet content using Twitter oEmbed API (free, no auth required)
 */

import type { FetchedContent } from './types.js';

// Twitter/X URL patterns
const TWITTER_PATTERNS = [
  /(?:twitter\.com|x\.com)\/(?:#!\/)?(\w+)\/status(?:es)?\/(\d+)/,
  /(?:twitter\.com|x\.com)\/(\w+)\/status\/(\d+)/,
];

/**
 * Extract tweet ID and author from Twitter/X URL
 */
export function extractTweetInfo(url: string): { tweetId: string; author: string } | null {
  for (const pattern of TWITTER_PATTERNS) {
    const match = url.match(pattern);
    if (match && match[1] && match[2]) {
      return {
        author: match[1],
        tweetId: match[2],
      };
    }
  }
  return null;
}

/**
 * Check if URL is a Twitter/X URL
 */
export function isTwitterUrl(url: string): boolean {
  return extractTweetInfo(url) !== null;
}

interface OEmbedResponse {
  url: string;
  author_name: string;
  author_url: string;
  html: string;
  width: number;
  height: number | null;
  type: string;
  cache_age: string;
  provider_name: string;
  provider_url: string;
  version: string;
}

/**
 * Extract plain text from oEmbed HTML
 * The HTML contains the tweet text wrapped in various tags
 */
function extractTextFromHtml(html: string): string {
  // Remove script tags and their content
  let text = html.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');

  // Extract text from <p> tags (main tweet content)
  const pMatches = text.match(/<p[^>]*>([\s\S]*?)<\/p>/gi);
  if (pMatches) {
    text = pMatches
      .map(p => p.replace(/<[^>]+>/g, '').trim())
      .filter(t => t.length > 0)
      .join('\n\n');
  } else {
    // Fallback: strip all HTML tags
    text = text.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Decode HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  return text.trim();
}

/**
 * Fetch tweet content using Twitter oEmbed API
 * This is free and doesn't require authentication
 */
export async function fetchTwitterContent(url: string): Promise<FetchedContent> {
  const tweetInfo = extractTweetInfo(url);

  if (!tweetInfo) {
    throw new Error(`Invalid Twitter/X URL: ${url}`);
  }

  // Normalize URL to Twitter format (oEmbed may not work with x.com)
  const normalizedUrl = `https://twitter.com/${tweetInfo.author}/status/${tweetInfo.tweetId}`;

  try {
    // Use Twitter's oEmbed endpoint (free, no auth)
    const oembedUrl = `https://publish.twitter.com/oembed?url=${encodeURIComponent(normalizedUrl)}&omit_script=true`;

    const response = await fetch(oembedUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('Tweet not found or is from a private/suspended account');
      }
      throw new Error(`Twitter oEmbed API error: ${response.status}`);
    }

    const data: OEmbedResponse = await response.json();

    // Extract plain text from the HTML
    const tweetText = extractTextFromHtml(data.html);

    if (!tweetText) {
      throw new Error('Could not extract tweet text');
    }

    return {
      contentType: 'twitter',
      externalId: tweetInfo.tweetId,
      title: `Tweet by @${data.author_name}`,
      author: data.author_name,
      url: data.url || normalizedUrl,
      rawContent: tweetText,
      metadata: {
        authorUrl: data.author_url,
        provider: data.provider_name,
      },
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      throw new Error(`Tweet not found. It may have been deleted or is from a private account.`);
    }

    throw new Error(`Failed to fetch tweet: ${errorMessage}`);
  }
}
