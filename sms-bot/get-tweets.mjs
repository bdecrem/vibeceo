import { config } from 'dotenv';
import crypto from 'crypto';

config({ path: '/Users/admin/Documents/code/vibeceo/sms-bot/.env.local' });

const apiKey = process.env.TWITTER_API_KEY;
const apiSecret = process.env.TWITTER_API_SECRET;
const accessToken = process.env.TWITTER_INTHEAMBER_ACCESS_TOKEN;
const accessSecret = process.env.TWITTER_INTHEAMBER_ACCESS_SECRET;

function generateOAuthSignature(method, url, params, consumerSecret, tokenSecret) {
  const sortedParams = Object.keys(params).sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join('&');
  const signatureBase = [method.toUpperCase(), encodeURIComponent(url), encodeURIComponent(sortedParams)].join('&');
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  return crypto.createHmac('sha1', signingKey).update(signatureBase).digest('base64');
}

const baseUrl = 'https://api.twitter.com/2/users/2007592769649565696/tweets';
const queryParams = { max_results: '30', 'tweet.fields': 'created_at,text' };
const fullUrl = baseUrl + '?' + Object.entries(queryParams).map(([k,v]) => `${k}=${encodeURIComponent(v)}`).join('&');

const oauthParams = {
  oauth_consumer_key: apiKey,
  oauth_nonce: crypto.randomBytes(16).toString('hex'),
  oauth_signature_method: 'HMAC-SHA1',
  oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
  oauth_token: accessToken,
  oauth_version: '1.0',
  ...queryParams
};

oauthParams.oauth_signature = generateOAuthSignature('GET', baseUrl, oauthParams, apiSecret, accessSecret);

const authHeader = 'OAuth ' + Object.keys(oauthParams)
  .filter(k => k.startsWith('oauth_'))
  .sort()
  .map(k => `${encodeURIComponent(k)}="${encodeURIComponent(oauthParams[k])}"`)
  .join(', ');

const r = await fetch(fullUrl, { headers: { Authorization: authHeader } });
const d = await r.json();
if (d.data) d.data.forEach(t => console.log('[' + t.created_at + ']\n' + t.text + '\n---'));
else console.log(JSON.stringify(d, null, 2));
