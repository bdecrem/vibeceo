import { config } from 'dotenv';
import crypto from 'crypto';

config({ path: '.env.local' });

const apiKey = process.env.TWITTER_API_KEY;
const apiSecret = process.env.TWITTER_API_SECRET;
const accessToken = process.env.TWITTER_INTHEAMBER_ACCESS_TOKEN;
const accessSecret = process.env.TWITTER_INTHEAMBER_ACCESS_SECRET;

const tweetId = process.argv[2];
const replyText = process.argv[3];

if (!tweetId || !replyText) {
  console.error('Usage: node amber-reply.mjs <tweet_id> "reply text"');
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

console.log(`Replying to tweet ${tweetId}:`);
console.log(`Text: ${replyText}`);

const res = await fetch(url, {
  method: 'POST',
  headers: { 'Authorization': authHeader, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: replyText,
    reply: { in_reply_to_tweet_id: tweetId },
  }),
});
const data = await res.json();
console.log('Status:', res.status);
console.log('Response:', JSON.stringify(data, null, 2));
