import { config } from 'dotenv';
import crypto from 'crypto';

config({ path: '.env.local' });

const apiKey = process.env.TWITTER_PP_API_KEY;
const apiSecret = process.env.TWITTER_PP_API_KEY_SECRET;
const accessToken = process.env.TWITTER_PP_ACCESS_TOKEN;
const accessSecret = process.env.TWITTER_PP_ACCESS_SECRET;

console.log('Creds:', { apiKey: apiKey?.slice(0,8)+'...', hasSecret: !!apiSecret, hasAccess: !!accessToken, hasAccessSecret: !!accessSecret });

function generateOAuthSignature(method, url, params, consumerSecret, tokenSecret) {
  const sortedParams = Object.keys(params).sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join('&');
  const signatureBase = [method.toUpperCase(), encodeURIComponent(url), encodeURIComponent(sortedParams)].join('&');
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  return crypto.createHmac('sha1', signingKey).update(signatureBase).digest('base64');
}

const tweet = `gm gamers ☀️

what are we playing today?`;
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
console.log('Status:', res.status);
console.log('Response:', JSON.stringify(data, null, 2));
