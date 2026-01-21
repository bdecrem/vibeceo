/**
 * Create a Google Calendar event using stored OAuth tokens
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

// Decryption (must match sms-bot/lib/encryption.ts)
function decrypt(encryptedData: string): string {
  const key = Buffer.from(process.env.OAUTH_ENCRYPTION_KEY!, 'hex');
  const combined = Buffer.from(encryptedData, 'base64');

  // Format: salt (32) + iv (16) + authTag (16) + encrypted
  const salt = combined.subarray(0, 32);
  const iv = combined.subarray(32, 48);
  const authTag = combined.subarray(48, 64);
  const encrypted = combined.subarray(64);

  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

async function getOAuthClient() {
  // Get stored tokens
  const { data: tokenRow, error } = await supabase
    .from('user_oauth_tokens')
    .select('encrypted_access_token, encrypted_refresh_token, token_expires_at')
    .eq('subscriber_id', BART_ID)
    .eq('provider', 'gmail')
    .single();

  if (error || !tokenRow) {
    throw new Error('No OAuth tokens found');
  }

  const accessToken = decrypt(tokenRow.encrypted_access_token);
  const refreshToken = decrypt(tokenRow.encrypted_refresh_token);

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    'https://webtoys.ai/api/oauth/gmail/callback'
  );

  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken,
    expiry_date: new Date(tokenRow.token_expires_at).getTime(),
  });

  // Force token refresh to get new scopes
  console.log('Refreshing token to get calendar scope...');
  const { credentials } = await oauth2Client.refreshAccessToken();
  console.log('New token scopes:', credentials.scope);
  oauth2Client.setCredentials(credentials);

  return oauth2Client;
}

async function createEvent() {
  console.log('Getting OAuth client...');
  const auth = await getOAuthClient();

  const calendar = google.calendar({ version: 'v3', auth });

  // Saturday January 31st, 2026, 9am-2pm Pacific
  const event = {
    summary: '🏄‍♂️ Surf Vibes w/ Ivan ✨',
    location: 'Wherever the waves call us 🌊',
    description: `Groovy Saturday surf sesh! 🌅

Ivan's flying back from Paris on the 28th and we're catching waves that weekend.

Bring good vibes only ✌️
Let the ocean do the thinking 🧘‍♂️

See you in the lineup! 🤙`,
    start: {
      dateTime: '2026-01-31T09:00:00-08:00',
      timeZone: 'America/Los_Angeles',
    },
    end: {
      dateTime: '2026-01-31T14:00:00-08:00',
      timeZone: 'America/Los_Angeles',
    },
    attendees: [
      { email: 'bdecrem@gmail.com' },
      { email: 'ivan.chaperot@gmail.com' },
    ],
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'email', minutes: 24 * 60 }, // 1 day before
        { method: 'popup', minutes: 60 },       // 1 hour before
      ],
    },
  };

  console.log('Creating calendar event...');
  const response = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
    sendUpdates: 'all', // Send email invites to attendees
  });

  console.log('✓ Event created!');
  console.log('  Title:', response.data.summary);
  console.log('  When:', response.data.start?.dateTime);
  console.log('  Link:', response.data.htmlLink);
  console.log('  Invites sent to attendees');
}

createEvent().catch(e => {
  console.error('Error:', e.message);
  process.exit(1);
});
