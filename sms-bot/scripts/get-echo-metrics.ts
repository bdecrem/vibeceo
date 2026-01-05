/**
 * Fetch Twitter metrics for @echoshape4 test tweets
 *
 * Gets engagement data (likes, RTs, replies, impressions) for the 5-day test
 */

import dotenv from 'dotenv';
import crypto from 'crypto';

dotenv.config({ path: '.env.local' });

// Get credentials
function getTwitterCredentials() {
  return {
    apiKey: process.env.ECHO_TWITTER_API_KEY!,
    apiSecret: process.env.ECHO_TWITTER_API_SECRET!,
    accessToken: process.env.ECHO_TWITTER_ACCESS_TOKEN!,
    accessSecret: process.env.ECHO_TWITTER_ACCESS_SECRET!,
  };
}

// Generate OAuth signature
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

// Generate OAuth header
function generateOAuthHeader(
  method: string,
  url: string,
  extraParams: Record<string, string> = {}
): string {
  const creds = getTwitterCredentials();

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

// 5-day test tweet IDs
const testTweets = [
  { day: 1, concept: 'expired-fortune-cookies', pattern: 'Tender Melancholy', id: '2006538825854538137', format: 'text-only', date: '2025-12-31' },
  { day: 2, concept: 'potato-confessions', pattern: 'Absurdist Sincerity', id: '2006775543513936025', format: 'text+image', date: '2026-01-01' },
  { day: 3, concept: 'google-earth-confessions', pattern: 'Poetic Observation', id: '2006790452192661905', format: 'text+image', date: '2026-01-01' },
  { day: 4, concept: 'suburban-oracle', pattern: 'Oracular Whimsy', id: '2007100513322516887', format: 'text+image', date: '2026-01-02' },
  { day: 5, concept: 'extinct-dating-profiles', pattern: 'Nostalgic Whimsy', id: '2008208501957337550', format: 'text-only', date: '2026-01-05' },
];

async function main() {
  console.log('=== @echoshape4 Test Metrics ===\n');
  console.log('Fetching engagement data for 5-day emotional pattern test...\n');

  const results = [];

  for (const tweet of testTweets) {
    try {
      const queryParams: Record<string, string> = {
        'tweet.fields': 'public_metrics,created_at',
      };

      const baseUrl = `https://api.twitter.com/2/tweets/${tweet.id}`;
      const urlParams = new URLSearchParams(queryParams);
      const fullUrl = `${baseUrl}?${urlParams.toString()}`;

      const authHeader = generateOAuthHeader('GET', baseUrl, queryParams);

      const response = await fetch(fullUrl, {
        method: 'GET',
        headers: {
          'Authorization': authHeader,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        console.error(`❌ Day ${tweet.day} failed:`, data);
        continue;
      }

      const metrics = data.data?.public_metrics || {};

      console.log(`Day ${tweet.day}: ${tweet.concept}`);
      console.log(`  Pattern: ${tweet.pattern} (${tweet.format})`);
      console.log(`  Posted: ${tweet.date}`);
      console.log(`  Impressions: ${metrics.impression_count || 'N/A'}`);
      console.log(`  Likes: ${metrics.like_count || 0}`);
      console.log(`  Retweets: ${metrics.retweet_count || 0}`);
      console.log(`  Replies: ${metrics.reply_count || 0}`);
      console.log(`  Quotes: ${metrics.quote_count || 0}`);
      console.log(`  URL: https://twitter.com/echoshape4/status/${tweet.id}`);
      console.log('');

      results.push({
        ...tweet,
        metrics,
      });
    } catch (error: any) {
      console.error(`❌ Failed to fetch Day ${tweet.day}:`, error.message);
      console.log('');
    }
  }

  // Summary
  console.log('=== Summary ===\n');

  // Calculate totals by pattern
  const totalLikes = results.reduce((sum, r) => sum + (r.metrics?.like_count || 0), 0);
  const totalRTs = results.reduce((sum, r) => sum + (r.metrics?.retweet_count || 0), 0);
  const totalReplies = results.reduce((sum, r) => sum + (r.metrics?.reply_count || 0), 0);
  const totalQuotes = results.reduce((sum, r) => sum + (r.metrics?.quote_count || 0), 0);
  const totalEngagement = totalLikes + totalRTs + totalReplies + totalQuotes;

  console.log(`Total Engagement: ${totalEngagement}`);
  console.log(`  Likes: ${totalLikes}`);
  console.log(`  Retweets: ${totalRTs}`);
  console.log(`  Replies: ${totalReplies}`);
  console.log(`  Quotes: ${totalQuotes}`);
  console.log('');

  // Sort by engagement
  const sorted = [...results].sort((a, b) => {
    const aEng = (a.metrics?.like_count || 0) + (a.metrics?.retweet_count || 0) + (a.metrics?.reply_count || 0) + (a.metrics?.quote_count || 0);
    const bEng = (b.metrics?.like_count || 0) + (b.metrics?.retweet_count || 0) + (b.metrics?.reply_count || 0) + (b.metrics?.quote_count || 0);
    return bEng - aEng;
  });

  console.log('Ranking by Total Engagement:');
  sorted.forEach((r, i) => {
    const eng = (r.metrics?.like_count || 0) + (r.metrics?.retweet_count || 0) + (r.metrics?.reply_count || 0) + (r.metrics?.quote_count || 0);
    console.log(`  ${i + 1}. Day ${r.day} (${r.pattern}): ${eng} total`);
  });
}

main().catch(console.error);
