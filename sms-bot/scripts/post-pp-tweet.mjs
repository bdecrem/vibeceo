#!/usr/bin/env node
/**
 * Post a tweet as @pixelpit_games
 * Usage: node scripts/post-pp-tweet.mjs "your tweet text here"
 */
import { config } from 'dotenv';
import crypto from 'crypto';

config({ path: new URL('../.env.local', import.meta.url).pathname });

const apiKey = process.env.TWITTER_PP_API_KEY;
const apiSecret = process.env.TWITTER_PP_API_KEY_SECRET;
const accessToken = process.env.TWITTER_PP_ACCESS_TOKEN;
const accessSecret = process.env.TWITTER_PP_ACCESS_SECRET;

if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
  console.error('Missing TWITTER_PP_* credentials in .env.local');
  process.exit(1);
}

const tweet = process.argv[2];
if (!tweet) {
  console.error('Usage: node scripts/post-pp-tweet.mjs "your tweet text"');
  process.exit(1);
}

if (tweet.length > 280) {
  console.error(`Tweet too long: ${tweet.length}/280 characters`);
  process.exit(1);
}

function generateOAuthSignature(method, url, params, consumerSecret, tokenSecret) {
  const sortedParams = Object.keys(params).sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join('&');
  const signatureBase = [method.toUpperCase(), encodeURIComponent(url), encodeURIComponent(sortedParams)].join('&');
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  return crypto.createHmac('sha1', signingKey).update(signatureBase).digest('base64');
}

const url = 'https://api.twitter.com/2/tweets';
const oauthParams = {
  oauth_consumer_key: apiKey,
  oauth_nonce: crypto.randomBytes(16).toString('hex'),
  oauth_signature_method: 'HMAC-SHA1',
  oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
  oauth_token: accessToken,
  oauth_version: '1.0',
};
oauthParams.oauth_signature = generateOAuthSignature('POST', url, oauthParams, apiSecret, accessSecret);

const authHeader = 'OAuth ' + Object.keys(oauthParams).sort()
  .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`).join(', ');

const res = await fetch(url, {
  method: 'POST',
  headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: tweet }),
});
const data = await res.json();

if (res.status === 201) {
  console.log('✓ Posted:', `https://twitter.com/pixelpit_games/status/${data.data.id}`);
} else {
  console.error('✗ Failed:', data);
  process.exit(1);
}
