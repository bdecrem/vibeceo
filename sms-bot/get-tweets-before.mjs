import { config } from 'dotenv';
import crypto from 'crypto';
config({ path: '.env.local' });

const apiKey = process.env.TWITTER_API_KEY;
const apiSecret = process.env.TWITTER_API_SECRET;
const accessToken = process.env.TWITTER_INTHEAMBER_ACCESS_TOKEN;
const accessSecret = process.env.TWITTER_INTHEAMBER_ACCESS_SECRET;

function sig(method, url, params) {
  const sorted = Object.keys(params).sort().map(k => `${encodeURIComponent(k)}=${encodeURIComponent(params[k])}`).join('&');
  const base = [method.toUpperCase(), encodeURIComponent(url), encodeURIComponent(sorted)].join('&');
  const key = `${encodeURIComponent(apiSecret)}&${encodeURIComponent(accessSecret)}`;
  return crypto.createHmac('sha1', key).update(base).digest('base64');
}

// Get tweets before the last batch by using pagination_token
const baseUrl = 'https://api.twitter.com/2/users/2007592769649565696/tweets';
const qp = { max_results: '30', 'tweet.fields': 'created_at,text', until_id: '2030100663002771456' };
const fullUrl = baseUrl + '?' + Object.entries(qp).map(([k,v]) => `${k}=${encodeURIComponent(v)}`).join('&');

const op = {
  oauth_consumer_key: apiKey, oauth_nonce: crypto.randomBytes(16).toString('hex'),
  oauth_signature_method: 'HMAC-SHA1', oauth_timestamp: Math.floor(Date.now()/1000).toString(),
  oauth_token: accessToken, oauth_version: '1.0', ...qp
};
op.oauth_signature = sig('GET', baseUrl, op);
const auth = 'OAuth ' + Object.keys(op).filter(k=>k.startsWith('oauth_')).sort().map(k=>`${encodeURIComponent(k)}="${encodeURIComponent(op[k])}"`).join(', ');

const r = await fetch(fullUrl, { headers: { Authorization: auth } });
const d = await r.json();
if (d.data) d.data.forEach(t => console.log('[' + t.created_at + ']\n' + t.text + '\n---'));
else console.log(JSON.stringify(d, null, 2));
