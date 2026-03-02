import { config } from 'dotenv';
import crypto from 'crypto';

config({ path: '.env.local' });

const apiKey = process.env.TWITTER_API_KEY;
const apiSecret = process.env.TWITTER_API_SECRET;
const accessToken = process.env.TWITTER_INTHEAMBER_ACCESS_TOKEN;
const accessSecret = process.env.TWITTER_INTHEAMBER_ACCESS_SECRET;

const sinceId = process.argv[2] || null; // optional: pass last cursor
const maxResults = process.argv[3] || '20';

function generateOAuthSignature(method, url, params, consumerSecret, tokenSecret) {
  const sortedParams = Object.keys(params).sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`).join('&');
  const signatureBase = [method.toUpperCase(), encodeURIComponent(url), encodeURIComponent(sortedParams)].join('&');
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  return crypto.createHmac('sha1', signingKey).update(signatureBase).digest('base64');
}

function buildAuthHeader(method, url, extraParams = {}) {
  const oauthParams = {
    oauth_consumer_key: apiKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: '1.0',
  };
  const allParams = { ...oauthParams, ...extraParams };
  oauthParams.oauth_signature = generateOAuthSignature(method, url, allParams, apiSecret, accessSecret);
  return 'OAuth ' + Object.keys(oauthParams).sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`).join(', ');
}

// Step 1: Get our user ID
const meUrl = 'https://api.twitter.com/2/users/me';
const meAuth = buildAuthHeader('GET', meUrl);
const meRes = await fetch(meUrl, { headers: { 'Authorization': meAuth } });
const meData = await meRes.json();
if (!meData.data?.id) {
  console.error('Failed to get user ID:', JSON.stringify(meData));
  process.exit(1);
}
const userId = meData.data.id;
console.log(`User: @${meData.data.username} (${userId})`);

// Step 2: Get mentions
const queryParams = {
  max_results: maxResults,
  'tweet.fields': 'author_id,conversation_id,created_at,in_reply_to_user_id,referenced_tweets',
  expansions: 'author_id',
  'user.fields': 'username',
};
if (sinceId) queryParams.since_id = sinceId;

const baseUrl = `https://api.twitter.com/2/users/${userId}/mentions`;
const qs = new URLSearchParams(queryParams).toString();
const fullUrl = `${baseUrl}?${qs}`;

// OAuth needs params flattened for signature
const flatParams = {};
for (const [k, v] of Object.entries(queryParams)) flatParams[k] = v;

const mentionsAuth = buildAuthHeader('GET', baseUrl, flatParams);
const mentionsRes = await fetch(fullUrl, { headers: { 'Authorization': mentionsAuth } });
const mentionsData = await mentionsRes.json();

if (mentionsRes.status !== 200) {
  console.error('Status:', mentionsRes.status);
  console.error(JSON.stringify(mentionsData, null, 2));
  process.exit(1);
}

// Build username lookup
const userMap = {};
if (mentionsData.includes?.users) {
  for (const u of mentionsData.includes.users) userMap[u.id] = u.username;
}

const mentions = mentionsData.data || [];
console.log(`\nFound ${mentions.length} mentions:\n`);

for (const m of mentions.reverse()) { // oldest first
  const author = userMap[m.author_id] || m.author_id;
  console.log(`[${m.created_at}] @${author} (tweet ${m.id}):`);
  console.log(`  ${m.text}`);
  if (m.referenced_tweets) {
    for (const ref of m.referenced_tweets) {
      console.log(`  └─ ${ref.type}: ${ref.id}`);
    }
  }
  console.log();
}

if (mentions.length > 0) {
  const newestId = mentions[mentions.length - 1].id;
  // Actually mentions were reversed, so newest is first element after reverse... 
  // Let's get the max ID properly
  const maxId = mentionsData.data.reduce((max, m) => m.id > max ? m.id : max, '0');
  console.log(`\nNewest mention ID (use as cursor): ${maxId}`);
}
