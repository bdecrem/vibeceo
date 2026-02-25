#!/usr/bin/env node
import { config } from 'dotenv';
import crypto from 'crypto';
config({ path: new URL('../.env.local', import.meta.url).pathname });

// Use MAIN app keys with PP access tokens
const apiKey = process.env.TWITTER_API_KEY;
const apiSecret = process.env.TWITTER_API_SECRET;
const accessToken = process.env.TWITTER_PP_ACCESS_TOKEN;
const accessSecret = process.env.TWITTER_PP_ACCESS_SECRET;

console.log('Main API Key exists:', Boolean(apiKey));
console.log('Main API Secret exists:', Boolean(apiSecret));
console.log('PP Access Token exists:', Boolean(accessToken));
console.log('PP Access Secret exists:', Boolean(accessSecret));

if (!apiKey || !apiSecret || !accessToken || !accessSecret) {
  console.error('Missing creds');
  process.exit(1);
}

function genSig(method, url, params, cs, ts) {
  const sp = Object.keys(params).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
  const sb = [method.toUpperCase(), encodeURIComponent(url), encodeURIComponent(sp)].join('&');
  const sk = `${encodeURIComponent(cs)}&${encodeURIComponent(ts)}`;
  return crypto.createHmac('sha1', sk).update(sb).digest('base64');
}

const url = 'https://api.twitter.com/2/tweets';
const op = {
  oauth_consumer_key: apiKey,
  oauth_nonce: crypto.randomBytes(16).toString('hex'),
  oauth_signature_method: 'HMAC-SHA1',
  oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
  oauth_token: accessToken,
  oauth_version: '1.0',
};
op.oauth_signature = genSig('POST', url, op, apiSecret, accessSecret);

const ah = 'OAuth ' + Object.keys(op).sort().map(k => `${encodeURIComponent(k)}="${encodeURIComponent(op[k])}"`).join(', ');

const res = await fetch(url, {
  method: 'POST',
  headers: { 'Authorization': ah, 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'test' }),
});
const data = await res.json();
console.log('Status:', res.status);
console.log('Response:', JSON.stringify(data, null, 2));
