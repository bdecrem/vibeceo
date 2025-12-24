/**
 * Twitter/X Client for posting tweets
 * Uses OAuth 1.0a for authentication
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

// Read env vars at runtime (not module load) to support late dotenv loading
function getTwitterCredentials() {
  return {
    apiKey: process.env.TWITTER_API_KEY,
    apiSecret: process.env.TWITTER_API_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
  };
}

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
  const creds = getTwitterCredentials();
  if (!creds.apiKey || !creds.apiSecret || !creds.accessToken || !creds.accessSecret) {
    throw new Error('Twitter credentials not configured');
  }

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: creds.apiKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: creds.accessToken,
    oauth_version: '1.0',
  };

  const allParams = { ...oauthParams, ...extraParams };

  const signature = generateOAuthSignature(
    method,
    url,
    allParams,
    creds.apiSecret,
    creds.accessSecret
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

export interface Tweet {
  id: string;
  text: string;
  authorId: string;
  authorUsername?: string;
  authorName?: string;
  createdAt?: string;
  conversationId?: string;
  inReplyToUserId?: string;
}

export interface MentionsResult {
  success: boolean;
  mentions?: Tweet[];
  error?: string;
}

export interface SearchResult {
  success: boolean;
  tweets?: Tweet[];
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
  const creds = getTwitterCredentials();
  if (!creds.apiKey || !creds.apiSecret || !creds.accessToken || !creds.accessSecret) {
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
 * @param mediaIds - Optional media_id(s) from uploadMedia() - string or array of up to 4
 */
export async function postTweet(text: string, mediaIds?: string | string[]): Promise<TweetResult> {
  const creds = getTwitterCredentials();
  if (!creds.apiKey || !creds.apiSecret || !creds.accessToken || !creds.accessSecret) {
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
    if (mediaIds) {
      const ids = Array.isArray(mediaIds) ? mediaIds : [mediaIds];
      if (ids.length > 4) {
        return {
          success: false,
          error: `Too many images: ${ids.length} (max 4)`,
        };
      }
      payload.media = { media_ids: ids };
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
  const creds = getTwitterCredentials();
  return !!(creds.apiKey && creds.apiSecret && creds.accessToken && creds.accessSecret);
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

/**
 * Post a tweet with multiple images (up to 4)
 * Convenience function that uploads all media then posts
 */
export async function postTweetWithImages(text: string, imagePaths: string[]): Promise<TweetResult> {
  if (imagePaths.length === 0) {
    return postTweet(text);
  }

  if (imagePaths.length > 4) {
    return {
      success: false,
      error: `Too many images: ${imagePaths.length} (max 4)`,
    };
  }

  // Upload all images in parallel
  const uploadResults = await Promise.all(imagePaths.map(p => uploadMedia(p)));

  // Check for failures
  const failed = uploadResults.find(r => !r.success);
  if (failed) {
    return {
      success: false,
      error: `Media upload failed: ${failed.error}`,
    };
  }

  // Collect media IDs
  const mediaIds = uploadResults.map(r => r.mediaId!);

  // Post with all media
  return postTweet(text, mediaIds);
}

/**
 * Get the authenticated user's ID
 * Required for fetching mentions
 */
async function getAuthenticatedUserId(): Promise<string | null> {
  const url = 'https://api.twitter.com/2/users/me';

  try {
    const authHeader = generateOAuthHeader('GET', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Twitter] Failed to get user ID:', data);
      return null;
    }

    return data.data?.id || null;
  } catch (error) {
    console.error('[Twitter] Error getting user ID:', error);
    return null;
  }
}

/**
 * Get recent mentions of the authenticated user
 * @param maxResults - Number of mentions to fetch (default 10, max 100)
 * @param sinceId - Only return mentions newer than this tweet ID
 */
export async function getMentions(maxResults: number = 10, sinceId?: string): Promise<MentionsResult> {
  const creds = getTwitterCredentials();
  if (!creds.apiKey || !creds.apiSecret || !creds.accessToken || !creds.accessSecret) {
    return {
      success: false,
      error: 'Twitter credentials not configured',
    };
  }

  try {
    // First get our user ID
    const userId = await getAuthenticatedUserId();
    if (!userId) {
      return {
        success: false,
        error: 'Could not get authenticated user ID',
      };
    }

    // Build query params object for OAuth signature
    const queryParams: Record<string, string> = {
      max_results: Math.min(maxResults, 100).toString(),
      'tweet.fields': 'created_at,conversation_id,in_reply_to_user_id',
      'expansions': 'author_id',
      'user.fields': 'username,name',
    };
    if (sinceId) {
      queryParams['since_id'] = sinceId;
    }

    const baseUrl = `https://api.twitter.com/2/users/${userId}/mentions`;
    const urlParams = new URLSearchParams(queryParams);
    const fullUrl = `${baseUrl}?${urlParams.toString()}`;

    // OAuth signature must include query params for GET requests
    const authHeader = generateOAuthHeader('GET', baseUrl, queryParams);

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Twitter] Failed to get mentions:', data);
      return {
        success: false,
        error: data.detail || data.title || JSON.stringify(data),
      };
    }

    // Build user lookup map from expansions
    const userMap = new Map<string, { username: string; name: string }>();
    if (data.includes?.users) {
      for (const user of data.includes.users) {
        userMap.set(user.id, { username: user.username, name: user.name });
      }
    }

    // Transform tweets
    const mentions: Tweet[] = (data.data || []).map((tweet: any) => {
      const user = userMap.get(tweet.author_id);
      return {
        id: tweet.id,
        text: tweet.text,
        authorId: tweet.author_id,
        authorUsername: user?.username,
        authorName: user?.name,
        createdAt: tweet.created_at,
        conversationId: tweet.conversation_id,
        inReplyToUserId: tweet.in_reply_to_user_id,
      };
    });

    console.log(`[Twitter] Fetched ${mentions.length} mentions`);

    return {
      success: true,
      mentions,
    };
  } catch (error) {
    console.error('[Twitter] Error getting mentions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Search for recent tweets matching a query
 * @param query - Search query (Twitter search syntax)
 * @param maxResults - Number of tweets to fetch (default 10, max 100)
 */
export async function searchTweets(query: string, maxResults: number = 10): Promise<SearchResult> {
  const creds = getTwitterCredentials();
  if (!creds.apiKey || !creds.apiSecret || !creds.accessToken || !creds.accessSecret) {
    return {
      success: false,
      error: 'Twitter credentials not configured',
    };
  }

  try {
    // Build query params object for OAuth signature
    const queryParams: Record<string, string> = {
      query,
      max_results: Math.min(Math.max(maxResults, 10), 100).toString(), // Twitter requires min 10
      'tweet.fields': 'created_at,conversation_id,in_reply_to_user_id',
      'expansions': 'author_id',
      'user.fields': 'username,name',
    };

    const baseUrl = 'https://api.twitter.com/2/tweets/search/recent';
    const urlParams = new URLSearchParams(queryParams);
    const fullUrl = `${baseUrl}?${urlParams.toString()}`;

    // OAuth signature must include query params for GET requests
    const authHeader = generateOAuthHeader('GET', baseUrl, queryParams);

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Twitter] Search failed:', data);
      return {
        success: false,
        error: data.detail || data.title || JSON.stringify(data),
      };
    }

    // Build user lookup map from expansions
    const userMap = new Map<string, { username: string; name: string }>();
    if (data.includes?.users) {
      for (const user of data.includes.users) {
        userMap.set(user.id, { username: user.username, name: user.name });
      }
    }

    // Transform tweets
    const tweets: Tweet[] = (data.data || []).map((tweet: any) => {
      const user = userMap.get(tweet.author_id);
      return {
        id: tweet.id,
        text: tweet.text,
        authorId: tweet.author_id,
        authorUsername: user?.username,
        authorName: user?.name,
        createdAt: tweet.created_at,
        conversationId: tweet.conversation_id,
        inReplyToUserId: tweet.in_reply_to_user_id,
      };
    });

    console.log(`[Twitter] Search found ${tweets.length} tweets`);

    return {
      success: true,
      tweets,
    };
  } catch (error) {
    console.error('[Twitter] Search error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

export interface ListMember {
  id: string;
  username: string;
  name: string;
  description?: string;
}

export interface ListMembersResult {
  success: boolean;
  members?: ListMember[];
  error?: string;
  nextToken?: string;
}

export interface UserListsResult {
  success: boolean;
  lists?: Array<{ id: string; name: string; memberCount: number }>;
  error?: string;
}

/**
 * Get lists owned by a user
 * @param username - Twitter username (without @)
 */
export async function getUserLists(username: string): Promise<UserListsResult> {
  const creds = getTwitterCredentials();
  if (!creds.apiKey || !creds.apiSecret || !creds.accessToken || !creds.accessSecret) {
    return { success: false, error: 'Twitter credentials not configured' };
  }

  try {
    // First get user ID from username
    const userUrl = `https://api.twitter.com/2/users/by/username/${username}`;
    const userAuthHeader = generateOAuthHeader('GET', userUrl);

    const userResponse = await fetch(userUrl, {
      method: 'GET',
      headers: { 'Authorization': userAuthHeader },
    });

    const userData = await userResponse.json();
    if (!userResponse.ok || !userData.data?.id) {
      return { success: false, error: `Could not find user: ${username}` };
    }

    const userId = userData.data.id;

    // Now get their owned lists
    const queryParams: Record<string, string> = {
      'list.fields': 'member_count,description',
    };

    const baseUrl = `https://api.twitter.com/2/users/${userId}/owned_lists`;
    const urlParams = new URLSearchParams(queryParams);
    const fullUrl = `${baseUrl}?${urlParams.toString()}`;
    const authHeader = generateOAuthHeader('GET', baseUrl, queryParams);

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: { 'Authorization': authHeader },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Twitter] Get lists failed:', data);
      return { success: false, error: data.detail || JSON.stringify(data) };
    }

    const lists = (data.data || []).map((list: any) => ({
      id: list.id,
      name: list.name,
      memberCount: list.member_count || 0,
    }));

    return { success: true, lists };
  } catch (error) {
    console.error('[Twitter] Get lists error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get members of a Twitter list
 * @param listId - Twitter list ID
 * @param maxResults - Number of members to fetch per page (default 100, max 100)
 * @param paginationToken - Token for next page
 */
export async function getListMembers(
  listId: string,
  maxResults: number = 100,
  paginationToken?: string
): Promise<ListMembersResult> {
  const creds = getTwitterCredentials();
  if (!creds.apiKey || !creds.apiSecret || !creds.accessToken || !creds.accessSecret) {
    return { success: false, error: 'Twitter credentials not configured' };
  }

  try {
    const queryParams: Record<string, string> = {
      max_results: Math.min(maxResults, 100).toString(),
      'user.fields': 'username,name,description',
    };
    if (paginationToken) {
      queryParams['pagination_token'] = paginationToken;
    }

    const baseUrl = `https://api.twitter.com/2/lists/${listId}/members`;
    const urlParams = new URLSearchParams(queryParams);
    const fullUrl = `${baseUrl}?${urlParams.toString()}`;
    const authHeader = generateOAuthHeader('GET', baseUrl, queryParams);

    const response = await fetch(fullUrl, {
      method: 'GET',
      headers: { 'Authorization': authHeader },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('[Twitter] Get list members failed:', data);
      return { success: false, error: data.detail || JSON.stringify(data) };
    }

    const members: ListMember[] = (data.data || []).map((user: any) => ({
      id: user.id,
      username: user.username,
      name: user.name,
      description: user.description,
    }));

    console.log(`[Twitter] Fetched ${members.length} list members`);

    return {
      success: true,
      members,
      nextToken: data.meta?.next_token,
    };
  } catch (error) {
    console.error('[Twitter] Get list members error:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get ALL members of a Twitter list (handles pagination)
 * @param listId - Twitter list ID
 */
export async function getAllListMembers(listId: string): Promise<ListMembersResult> {
  const allMembers: ListMember[] = [];
  let nextToken: string | undefined;

  do {
    const result = await getListMembers(listId, 100, nextToken);
    if (!result.success) {
      // If we hit rate limits but have some members, return what we have
      if (allMembers.length > 0) {
        console.log(`[Twitter] Rate limited after ${allMembers.length} members, returning partial results`);
        return { success: true, members: allMembers };
      }
      return result;
    }
    allMembers.push(...(result.members || []));
    nextToken = result.nextToken;

    // Rate limit: wait 15s between pages to avoid 429
    if (nextToken) {
      console.log(`[Twitter] Waiting 15s before next page (have ${allMembers.length} members)...`);
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
  } while (nextToken);

  return { success: true, members: allMembers };
}

/**
 * Reply to a specific tweet
 * @param text - Reply text
 * @param inReplyToTweetId - ID of the tweet to reply to
 */
export async function replyToTweet(text: string, inReplyToTweetId: string): Promise<TweetResult> {
  const creds = getTwitterCredentials();
  if (!creds.apiKey || !creds.apiSecret || !creds.accessToken || !creds.accessSecret) {
    return {
      success: false,
      error: 'Twitter credentials not configured',
    };
  }

  if (text.length > 280) {
    return {
      success: false,
      error: `Reply too long: ${text.length} characters (max 280)`,
    };
  }

  const url = 'https://api.twitter.com/2/tweets';

  try {
    const authHeader = generateOAuthHeader('POST', url);

    const payload = {
      text,
      reply: {
        in_reply_to_tweet_id: inReplyToTweetId,
      },
    };

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
      console.error('[Twitter] Reply failed:', data);
      return {
        success: false,
        error: data.detail || data.title || JSON.stringify(data),
      };
    }

    const tweetId = data.data?.id;
    const tweetUrl = tweetId ? `https://twitter.com/i/web/status/${tweetId}` : undefined;

    console.log('[Twitter] Reply posted:', tweetId);

    return {
      success: true,
      tweetId,
      tweetUrl,
    };
  } catch (error) {
    console.error('[Twitter] Reply error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
