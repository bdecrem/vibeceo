/**
 * Twitter Content Fetcher
 *
 * Enhanced version that uses Twitter API v2 when credentials are available:
 * - Full tweet details with metrics
 * - Conversation replies (up to 50)
 * - Linked content from URLs in tweets
 *
 * Falls back to oEmbed API (free, no auth) when API not configured.
 */

import type { FetchedContent } from './types.js';
import {
  getTweet,
  getConversationReplies,
  isTwitterConfigured,
  type TweetDetail,
  type Tweet,
} from '../twitter-client.js';
import { fetchYouTubeContent, isYouTubeUrl } from './youtube-fetcher.js';

// Twitter/X URL patterns
const TWITTER_PATTERNS = [
  /(?:twitter\.com|x\.com)\/(?:#!\/)?(\w+)\/status(?:es)?\/(\d+)/,
  /(?:twitter\.com|x\.com)\/(\w+)\/status\/(\d+)/,
];

// Default max replies to fetch
const DEFAULT_MAX_REPLIES = 50;

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
 * Fetch linked content from URLs in a tweet
 * Currently supports YouTube - can be extended for articles
 */
async function fetchLinkedContent(urls: TweetDetail['urls']): Promise<string[]> {
  const linkedContent: string[] = [];

  for (const urlInfo of urls) {
    const expandedUrl = urlInfo.expandedUrl;

    // Skip Twitter's own URLs (like pic.twitter.com)
    if (expandedUrl.includes('twitter.com') || expandedUrl.includes('t.co')) {
      continue;
    }

    try {
      if (isYouTubeUrl(expandedUrl)) {
        console.log(`[twitter-fetcher] Fetching linked YouTube: ${expandedUrl}`);
        const ytContent = await fetchYouTubeContent(expandedUrl);
        linkedContent.push(
          `--- LINKED: YouTube Video ---\n` +
          `Title: ${ytContent.title}\n` +
          `Channel: ${ytContent.author}\n` +
          `Transcript:\n${ytContent.rawContent.slice(0, 3000)}${ytContent.rawContent.length > 3000 ? '...' : ''}`
        );
      } else {
        // For other URLs, just note them (can be extended for article fetching)
        const title = urlInfo.title || urlInfo.displayUrl;
        const desc = urlInfo.description ? `\n${urlInfo.description}` : '';
        linkedContent.push(`--- LINKED: ${title} ---\nURL: ${expandedUrl}${desc}`);
      }
    } catch (error) {
      console.log(`[twitter-fetcher] Failed to fetch linked content from ${expandedUrl}:`, error);
      // Don't fail the whole request, just skip this linked content
    }
  }

  return linkedContent;
}

/**
 * Build raw content string from tweet, replies, and linked content
 */
function buildRawContent(
  tweet: TweetDetail,
  replies: Tweet[],
  linkedContent: string[]
): string {
  const parts: string[] = [];

  // Original tweet
  parts.push(`@${tweet.authorUsername || 'unknown'} wrote:\n${tweet.text}`);

  // Metrics if available
  if (tweet.metrics) {
    const metrics = [];
    if (tweet.metrics.likeCount) metrics.push(`${tweet.metrics.likeCount} likes`);
    if (tweet.metrics.retweetCount) metrics.push(`${tweet.metrics.retweetCount} retweets`);
    if (tweet.metrics.replyCount) metrics.push(`${tweet.metrics.replyCount} replies`);
    if (metrics.length > 0) {
      parts.push(`[${metrics.join(', ')}]`);
    }
  }

  // Replies
  if (replies.length > 0) {
    parts.push('\n--- REPLIES ---\n');
    for (const reply of replies) {
      parts.push(`@${reply.authorUsername || 'unknown'}: ${reply.text}\n`);
    }
  }

  // Linked content
  if (linkedContent.length > 0) {
    parts.push('\n--- LINKED CONTENT ---\n');
    parts.push(linkedContent.join('\n\n'));
  }

  return parts.join('\n');
}

/**
 * Fetch tweet content using Twitter API v2 (enhanced version)
 * Returns full tweet details, replies, and linked content
 */
async function fetchTwitterContentViaApi(
  tweetId: string,
  author: string
): Promise<FetchedContent> {
  // Get the main tweet
  const tweetResult = await getTweet(tweetId);
  if (!tweetResult.success || !tweetResult.tweet) {
    throw new Error(tweetResult.error || 'Failed to fetch tweet');
  }

  const tweet = tweetResult.tweet;

  // Get conversation replies (if this tweet is the conversation root)
  let replies: Tweet[] = [];
  if (tweet.conversationId) {
    const repliesResult = await getConversationReplies(tweet.conversationId, DEFAULT_MAX_REPLIES);
    if (repliesResult.success && repliesResult.replies) {
      // Filter out the original tweet from replies
      replies = repliesResult.replies.filter(r => r.id !== tweetId);
      // Sort by created_at (oldest first for reading order)
      replies.sort((a, b) => {
        if (!a.createdAt || !b.createdAt) return 0;
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });
    }
  }

  // Fetch linked content from URLs
  const linkedContent = await fetchLinkedContent(tweet.urls);

  // Build the full content
  const rawContent = buildRawContent(tweet, replies, linkedContent);

  const normalizedUrl = `https://twitter.com/${author}/status/${tweetId}`;

  return {
    contentType: 'twitter',
    externalId: tweetId,
    title: `Tweet by @${tweet.authorUsername || author}`,
    author: tweet.authorUsername || author,
    url: normalizedUrl,
    rawContent,
    metadata: {
      authorUrl: `https://twitter.com/${tweet.authorUsername || author}`,
      provider: 'Twitter',
      replyCount: replies.length,
      linkedUrls: tweet.urls.map(u => u.expandedUrl),
      metrics: tweet.metrics,
      fetchedVia: 'api',
    },
  };
}

/**
 * Fetch tweet content using Twitter oEmbed API (fallback)
 * This is free and doesn't require authentication
 */
async function fetchTwitterContentViaOEmbed(
  tweetId: string,
  author: string,
  normalizedUrl: string
): Promise<FetchedContent> {
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
    externalId: tweetId,
    title: `Tweet by @${data.author_name}`,
    author: data.author_name,
    url: data.url || normalizedUrl,
    rawContent: tweetText,
    metadata: {
      authorUrl: data.author_url,
      provider: data.provider_name,
      fetchedVia: 'oembed',
    },
  };
}

/**
 * Fetch tweet content - uses API when available, falls back to oEmbed
 */
export async function fetchTwitterContent(url: string): Promise<FetchedContent> {
  const tweetInfo = extractTweetInfo(url);

  if (!tweetInfo) {
    throw new Error(`Invalid Twitter/X URL: ${url}`);
  }

  // Normalize URL to Twitter format (oEmbed may not work with x.com)
  const normalizedUrl = `https://twitter.com/${tweetInfo.author}/status/${tweetInfo.tweetId}`;

  // Try API first if configured
  if (isTwitterConfigured()) {
    try {
      console.log(`[twitter-fetcher] Using Twitter API for tweet ${tweetInfo.tweetId}`);
      return await fetchTwitterContentViaApi(tweetInfo.tweetId, tweetInfo.author);
    } catch (error) {
      console.warn(`[twitter-fetcher] API failed, falling back to oEmbed:`, error);
      // Fall through to oEmbed
    }
  }

  // Fallback to oEmbed
  try {
    console.log(`[twitter-fetcher] Using oEmbed for tweet ${tweetInfo.tweetId}`);
    return await fetchTwitterContentViaOEmbed(tweetInfo.tweetId, tweetInfo.author, normalizedUrl);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    if (errorMessage.includes('404') || errorMessage.includes('not found')) {
      throw new Error(`Tweet not found. It may have been deleted or is from a private account.`);
    }

    throw new Error(`Failed to fetch tweet: ${errorMessage}`);
  }
}
