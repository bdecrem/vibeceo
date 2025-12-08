/**
 * Twitter/X Client for posting tweets
 * Uses OAuth 1.0a for authentication
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const TWITTER_API_KEY = process.env.TWITTER_API_KEY;
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET;
const TWITTER_ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN;
const TWITTER_ACCESS_SECRET = process.env.TWITTER_ACCESS_SECRET;

/**
 * Generate OAuth 1.0a signature for Twitter API
 */
function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string
): string {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');

  const signatureBase = [
    method.toUpperCase(),
    encodeURIComponent(url),
    encodeURIComponent(sortedParams),
  ].join('&');

  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;

  return crypto
    .createHmac('sha1', signingKey)
    .update(signatureBase)
    .digest('base64');
}

/**
 * Generate OAuth 1.0a Authorization header
 */
function generateOAuthHeader(
  method: string,
  url: string,
  extraParams: Record<string, string> = {}
): string {
  if (!TWITTER_API_KEY || !TWITTER_API_SECRET || !TWITTER_ACCESS_TOKEN || !TWITTER_ACCESS_SECRET) {
    throw new Error('Twitter credentials not configured');
  }

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: TWITTER_API_KEY,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: TWITTER_ACCESS_TOKEN,
    oauth_version: '1.0',
  };

  const allParams = { ...oauthParams, ...extraParams };

  const signature = generateOAuthSignature(
    method,
    url,
    allParams,
    TWITTER_API_SECRET,
    TWITTER_ACCESS_SECRET
  );

  oauthParams['oauth_signature'] = signature;

  const headerParts = Object.keys(oauthParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`)
    .join(', ');

  return `OAuth ${headerParts}`;
}

export interface TweetResult {
  success: boolean;
  tweetId?: string;
  tweetUrl?: string;
  error?: string;
}

export interface MediaUploadResult {
  success: boolean;
  mediaId?: string;
  error?: string;
}

/**
 * Upload media (image) to Twitter
 * Returns media_id to attach to tweets
 */
export async function uploadMedia(imagePath: string): Promise<MediaUploadResult> {
  if (!TWITTER_API_KEY || !TWITTER_API_SECRET || !TWITTER_ACCESS_TOKEN || !TWITTER_ACCESS_SECRET) {
    return {
      success: false,
      error: 'Twitter credentials not configured',
    };
  }

  try {
    // Read and base64 encode the image
    const absolutePath = path.resolve(imagePath);
    if (!fs.existsSync(absolutePath)) {
      return {
        success: false,
        error: `Image file not found: ${absolutePath}`,
      };
    }

    const imageBuffer = fs.readFileSync(absolutePath);
    const base64Image = imageBuffer.toString('base64');

    // Twitter v1.1 media upload endpoint
    const url = 'https://upload.twitter.com/1.1/media/upload.json';

    // For media upload, we need to include media_data in the signature
    const params = { media_data: base64Image };
    const authHeader = generateOAuthHeader('POST', url, params);

    // Send as form-urlencoded
    const body = `media_data=${encodeURIComponent(base64Image)}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body,
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Twitter] Media upload failed:', data);
      return {
        success: false,
        error: data.errors?.[0]?.message || JSON.stringify(data),
      };
    }

    console.log('[Twitter] Media uploaded:', data.media_id_string);

    return {
      success: true,
      mediaId: data.media_id_string,
    };
  } catch (error) {
    console.error('[Twitter] Media upload error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Post a tweet to Twitter/X
 * @param text - Tweet text
 * @param mediaId - Optional media_id from uploadMedia()
 */
export async function postTweet(text: string, mediaId?: string): Promise<TweetResult> {
  if (!TWITTER_API_KEY || !TWITTER_API_SECRET || !TWITTER_ACCESS_TOKEN || !TWITTER_ACCESS_SECRET) {
    return {
      success: false,
      error: 'Twitter credentials not configured. Set TWITTER_API_KEY, TWITTER_API_SECRET, TWITTER_ACCESS_TOKEN, TWITTER_ACCESS_SECRET',
    };
  }

  if (text.length > 280) {
    return {
      success: false,
      error: `Tweet too long: ${text.length} characters (max 280)`,
    };
  }

  const url = 'https://api.twitter.com/2/tweets';

  try {
    const authHeader = generateOAuthHeader('POST', url);

    // Build tweet payload
    const payload: any = { text };
    if (mediaId) {
      payload.media = { media_ids: [mediaId] };
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Twitter] Post failed:', data);
      return {
        success: false,
        error: data.detail || data.title || JSON.stringify(data),
      };
    }

    const tweetId = data.data?.id;
    // Note: Twitter API v2 doesn't return username, we'd need to fetch it separately
    // For now, construct URL assuming we know the account
    const tweetUrl = tweetId ? `https://twitter.com/i/web/status/${tweetId}` : undefined;

    console.log('[Twitter] Tweet posted:', tweetId);

    return {
      success: true,
      tweetId,
      tweetUrl,
    };
  } catch (error) {
    console.error('[Twitter] Post error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Check if Twitter posting is configured
 */
export function isTwitterConfigured(): boolean {
  return !!(TWITTER_API_KEY && TWITTER_API_SECRET && TWITTER_ACCESS_TOKEN && TWITTER_ACCESS_SECRET);
}

/**
 * Post a tweet with an image
 * Convenience function that uploads media then posts
 */
export async function postTweetWithImage(text: string, imagePath: string): Promise<TweetResult> {
  // First upload the image
  const uploadResult = await uploadMedia(imagePath);
  if (!uploadResult.success) {
    return {
      success: false,
      error: `Media upload failed: ${uploadResult.error}`,
    };
  }

  // Then post the tweet with the media
  return postTweet(text, uploadResult.mediaId);
}
