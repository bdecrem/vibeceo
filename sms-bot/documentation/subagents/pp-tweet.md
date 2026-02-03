# /pp-tweet - Post to @pixelpit_games Twitter

Post a tweet as the Pixelpit Games Twitter account (@pixelpit_games).

## Usage
```
/pp-tweet <your tweet text>
```

## Instructions

When this command is invoked:

1. Take the user's message as the tweet content
2. If the tweet is over 280 characters, warn the user and ask them to shorten it
3. Create this EXACT script in `sms-bot/temp-pp-tweet.mjs`:

```javascript
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config({ path: '.env.local' });

// IMPORTANT: PP account has its OWN API keys - do NOT use the shared twitter-client.ts
const apiKey = process.env.TWITTER_PP_API_KEY;
const apiSecret = process.env.TWITTER_PP_API_SECRET;
const accessToken = process.env.TWITTER_PP_ACCESS_TOKEN;
const accessSecret = process.env.TWITTER_PP_ACCESS_SECRET;

function generateOAuthSignature(method, url, params, consumerSecret, tokenSecret) {
  const sortedParams = Object.keys(params)
    .sort()
    .map(key => `${encodeURIComponent(key)}=${encodeURIComponent(params[key])}`)
    .join('&');
  const signatureBase = [method.toUpperCase(), encodeURIComponent(url), encodeURIComponent(sortedParams)].join('&');
  const signingKey = `${encodeURIComponent(consumerSecret)}&${encodeURIComponent(tokenSecret)}`;
  return crypto.createHmac('sha1', signingKey).update(signatureBase).digest('base64');
}

function generateOAuthHeader(method, url) {
  const oauthParams = {
    oauth_consumer_key: apiKey,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: accessToken,
    oauth_version: '1.0',
  };
  oauthParams['oauth_signature'] = generateOAuthSignature(method, url, oauthParams, apiSecret, accessSecret);
  return `OAuth ${Object.keys(oauthParams).sort().map(key => `${encodeURIComponent(key)}="${encodeURIComponent(oauthParams[key])}"`).join(', ')}`;
}

const tweet = `YOUR_TWEET_TEXT_HERE`;

const url = 'https://api.twitter.com/2/tweets';
const response = await fetch(url, {
  method: 'POST',
  headers: { 'Authorization': generateOAuthHeader('POST', url), 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: tweet }),
});

const data = await response.json();
if (response.ok) {
  console.log('Tweet posted:', `https://twitter.com/pixelpit_games/status/${data.data?.id}`);
} else {
  console.error('Failed:', data);
}
```

4. Run from sms-bot directory: `cd sms-bot && node temp-pp-tweet.mjs`
5. Report the result (success with URL, or error message)
6. Clean up: `rm temp-pp-tweet.mjs`

## CRITICAL: Why not use twitter-client.ts?

The shared `twitter-client.ts` uses `TWITTER_API_KEY` and `TWITTER_API_SECRET` (no prefix) for ALL accounts.
But @pixelpit_games has its OWN app with `TWITTER_PP_API_KEY` and `TWITTER_PP_API_SECRET`.
Using `postTweet(text, { account: 'pp' })` WILL FAIL with 401 Unauthorized.
Always use the direct script above.

## Account Details
- Handle: @pixelpit_games
- Env vars (all PP-prefixed):
  - `TWITTER_PP_API_KEY`
  - `TWITTER_PP_API_SECRET`
  - `TWITTER_PP_ACCESS_TOKEN`
  - `TWITTER_PP_ACCESS_SECRET`

## Examples

```
/pp-tweet Just shipped CAT TOWER! Stack cats, get points. Play now: pixelpit.gg/arcade/cattower
```

```
/pp-tweet New game dropping tomorrow... stay tuned
```
