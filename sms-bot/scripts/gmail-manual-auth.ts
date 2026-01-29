/**
 * Manual Gmail OAuth Token Exchange
 *
 * Usage: npx tsx --env-file=.env.local scripts/gmail-manual-auth.ts "<auth_code>"
 *
 * Get the auth code by:
 * 1. Opening the OAuth URL
 * 2. Authorizing
 * 3. Copying the 'code' parameter from the redirect URL
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

const BART_ID = 'a5167b9a-a718-4567-a22d-312b7bf9e773';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Encryption (must match sms-bot/lib/encryption.ts)
function encrypt(text: string): string {
  const key = Buffer.from(process.env.OAUTH_ENCRYPTION_KEY!, 'hex');
  const iv = crypto.randomBytes(16);
  const salt = crypto.randomBytes(32);

  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Format: salt:iv:authTag:encrypted
  const combined = Buffer.concat([salt, iv, authTag, encrypted]);
  return combined.toString('base64');
}

const REDIRECT_URI = 'http://localhost:8080';

async function exchangeAndStore(authCode: string) {
  console.log('Exchanging auth code for tokens...');

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );

  const { tokens } = await oauth2Client.getToken(authCode);

  if (!tokens.access_token || !tokens.refresh_token) {
    throw new Error('Missing tokens in response');
  }

  console.log('Got tokens! Storing encrypted...');

  const encryptedAccess = encrypt(tokens.access_token);
  const encryptedRefresh = encrypt(tokens.refresh_token);

  const { error } = await supabase
    .from('user_oauth_tokens')
    .upsert({
      subscriber_id: BART_ID,
      provider: 'gmail',
      encrypted_access_token: encryptedAccess,
      encrypted_refresh_token: encryptedRefresh,
      token_expires_at: new Date(tokens.expiry_date!).toISOString(),
      scopes: tokens.scope?.split(' ') || [],
      updated_at: new Date().toISOString(),
    }, {
      onConflict: 'subscriber_id,provider'
    });

  if (error) {
    throw new Error(`Failed to store tokens: ${error.message}`);
  }

  console.log('✓ Tokens stored successfully!');

  // Test the token
  oauth2Client.setCredentials(tokens);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  const profile = await gmail.users.getProfile({ userId: 'me' });
  console.log(`✓ Verified: Connected as ${profile.data.emailAddress}`);
}

// Generate auth URL if no code provided
function generateAuthUrl() {
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    REDIRECT_URI
  );

  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/userinfo.email',
      'https://www.googleapis.com/auth/calendar'
    ],
    state: `subscriber_id:${BART_ID}`,
    prompt: 'consent'
  });
}

async function main() {
  const authCode = process.argv[2];

  if (!authCode) {
    console.log('No auth code provided.\n');
    console.log('Step 1: Open this URL and authorize:\n');
    console.log(generateAuthUrl());
    console.log('\nStep 2: After authorizing, copy the URL from your browser.');
    console.log('It will look like: https://webtoys.ai/api/oauth/gmail/callback?code=XXXX&...');
    console.log('\nStep 3: Extract the code parameter and run:');
    console.log('npx tsx --env-file=.env.local scripts/gmail-manual-auth.ts "THE_CODE_HERE"');
    return;
  }

  // Clean up the code (might be URL encoded)
  const cleanCode = decodeURIComponent(authCode);
  await exchangeAndStore(cleanCode);
}

main().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
