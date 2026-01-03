/**
 * Get Twitter Access Tokens for a new account
 *
 * Run: npx tsx scripts/twitter-get-tokens.ts
 *
 * 1. Opens browser for you to authorize
 * 2. You log into the new account and click "Authorize"
 * 3. Twitter gives you a PIN
 * 4. Paste the PIN here
 * 5. Script prints the Access Token and Secret
 */

import dotenv from 'dotenv';
import crypto from 'crypto';
import readline from 'readline';

dotenv.config({ path: '.env.local' });

const API_KEY = process.env.TWITTER_API_KEY;
const API_SECRET = process.env.TWITTER_API_SECRET;

if (!API_KEY || !API_SECRET) {
  console.error('Missing TWITTER_API_KEY or TWITTER_API_SECRET in .env.local');
  process.exit(1);
}

function generateOAuthSignature(
  method: string,
  url: string,
  params: Record<string, string>,
  consumerSecret: string,
  tokenSecret: string = ''
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

function generateOAuthHeader(
  method: string,
  url: string,
  oauthParams: Record<string, string>,
  extraParams: Record<string, string> = {}
): string {
  const allParams = { ...oauthParams, ...extraParams };

  const signature = generateOAuthSignature(
    method,
    url,
    allParams,
    API_SECRET!,
    oauthParams.oauth_token_secret || ''
  );

  const headerParams = { ...oauthParams, oauth_signature: signature };
  delete (headerParams as any).oauth_token_secret;

  const headerParts = Object.keys(headerParams)
    .sort()
    .map(key => `${encodeURIComponent(key)}="${encodeURIComponent(headerParams[key])}"`)
    .join(', ');

  return `OAuth ${headerParts}`;
}

async function getRequestToken(): Promise<{ token: string; secret: string }> {
  const url = 'https://api.twitter.com/oauth/request_token';

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: API_KEY!,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: '1.0',
    oauth_callback: 'oob', // PIN-based auth
  };

  const authHeader = generateOAuthHeader('POST', url, oauthParams);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
    },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Failed to get request token: ${text}`);
  }

  const params = new URLSearchParams(text);
  return {
    token: params.get('oauth_token')!,
    secret: params.get('oauth_token_secret')!,
  };
}

async function getAccessToken(
  requestToken: string,
  requestTokenSecret: string,
  verifier: string
): Promise<{ token: string; secret: string; username: string }> {
  const url = 'https://api.twitter.com/oauth/access_token';

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: API_KEY!,
    oauth_nonce: crypto.randomBytes(16).toString('hex'),
    oauth_signature_method: 'HMAC-SHA1',
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_token: requestToken,
    oauth_token_secret: requestTokenSecret,
    oauth_verifier: verifier,
    oauth_version: '1.0',
  };

  const authHeader = generateOAuthHeader('POST', url, oauthParams);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': authHeader,
    },
  });

  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Failed to get access token: ${text}`);
  }

  const params = new URLSearchParams(text);
  return {
    token: params.get('oauth_token')!,
    secret: params.get('oauth_token_secret')!,
    username: params.get('screen_name')!,
  };
}

function prompt(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(question, answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  console.log('\n🐦 Twitter OAuth Token Generator\n');
  console.log('This will get Access Tokens for a new account.\n');

  // Step 1: Get request token
  console.log('Getting request token...');
  const requestToken = await getRequestToken();

  // Step 2: Direct user to authorize
  const authUrl = `https://api.twitter.com/oauth/authorize?oauth_token=${requestToken.token}`;

  console.log('\n✅ Open this URL in your browser:\n');
  console.log(`   ${authUrl}\n`);
  console.log('1. Log into the NEW account (not TokenTank)');
  console.log('2. Click "Authorize app"');
  console.log('3. Twitter will show you a PIN\n');

  // Step 3: Get PIN from user
  const pin = await prompt('Enter the PIN: ');

  // Step 4: Exchange for access token
  console.log('\nExchanging for access token...');
  const accessToken = await getAccessToken(requestToken.token, requestToken.secret, pin);

  // Step 5: Output results
  console.log('\n✅ SUCCESS!\n');
  console.log(`Account: @${accessToken.username}\n`);
  console.log('Add these to your .env.local:\n');
  console.log('─'.repeat(50));
  console.log(`TWITTER_${accessToken.username.toUpperCase()}_ACCESS_TOKEN=${accessToken.token}`);
  console.log(`TWITTER_${accessToken.username.toUpperCase()}_ACCESS_SECRET=${accessToken.secret}`);
  console.log('─'.repeat(50));
  console.log('\nDone! Now I can update twitter-client.ts to support this account.\n');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
