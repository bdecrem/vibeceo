/**
 * Fetch CTRL SHIFT Founder Award Applications
 *
 * Pulls all applications from Gmail, extracts structured data,
 * and outputs to CSV + JSON for analysis
 */

import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';
import * as fs from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const BART_ID = 'a5167b9a-a718-4567-a22d-312b7bf9e773';

// Encryption params (must match gmail-client.ts)
const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function decrypt(encryptedData: string): string {
  const key = Buffer.from(process.env.OAUTH_ENCRYPTION_KEY!, 'hex');
  const combined = Buffer.from(encryptedData, 'base64');
  const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
  const authTag = combined.subarray(SALT_LENGTH + IV_LENGTH, SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = combined.subarray(SALT_LENGTH + IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString('utf8');
}

interface Application {
  messageId: string;
  date: string;
  fromEmail: string;
  fromName: string;
  subject: string;
  rawContent: string;
}

async function getGmailClient() {
  const { data } = await supabase
    .from('user_oauth_tokens')
    .select('*')
    .eq('subscriber_id', BART_ID)
    .eq('provider', 'gmail')
    .single();

  if (!data) {
    throw new Error('No Gmail connected for Bart');
  }

  const refreshToken = decrypt(data.encrypted_refresh_token);
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();
  oauth2Client.setCredentials(credentials);

  return google.gmail({ version: 'v1', auth: oauth2Client });
}

function extractTextFromParts(parts: any[]): string {
  let text = '';
  for (const part of parts) {
    if (part.mimeType === 'text/plain' && part.body?.data) {
      text += Buffer.from(part.body.data, 'base64').toString('utf-8');
    } else if (part.parts) {
      text += extractTextFromParts(part.parts);
    }
  }
  return text;
}

async function fetchApplications(): Promise<Application[]> {
  console.log('Connecting to Gmail...');
  const gmail = await getGmailClient();

  console.log('Searching for CTRL SHIFT applications...');
  const searchRes = await gmail.users.messages.list({
    userId: 'me',
    q: 'subject:"[CTRL SHIFT] Founder Award Application"',
    maxResults: 100
  });

  if (!searchRes.data.messages) {
    console.log('No applications found!');
    return [];
  }

  console.log(`Found ${searchRes.data.messages.length} applications. Fetching details...`);

  const applications: Application[] = [];

  for (let i = 0; i < searchRes.data.messages.length; i++) {
    const msg = searchRes.data.messages[i];
    process.stdout.write(`\rFetching ${i + 1}/${searchRes.data.messages.length}...`);

    const full = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id!,
      format: 'full'
    });

    const headers = full.data.payload?.headers || [];
    const getHeader = (name: string) => headers.find(h => h.name?.toLowerCase() === name.toLowerCase())?.value || '';

    // Extract body text
    let bodyText = '';
    if (full.data.payload?.body?.data) {
      bodyText = Buffer.from(full.data.payload.body.data, 'base64').toString('utf-8');
    } else if (full.data.payload?.parts) {
      bodyText = extractTextFromParts(full.data.payload.parts);
    }

    const fromHeader = getHeader('From');
    const fromMatch = fromHeader.match(/^(.+?)\s*<(.+?)>$/);

    applications.push({
      messageId: msg.id!,
      date: getHeader('Date'),
      fromEmail: fromMatch ? fromMatch[2] : fromHeader,
      fromName: fromMatch ? fromMatch[1].replace(/"/g, '').trim() : '',
      subject: getHeader('Subject'),
      rawContent: bodyText
    });
  }

  console.log('\nDone fetching!');
  return applications;
}

async function main() {
  try {
    const applications = await fetchApplications();

    if (applications.length === 0) {
      return;
    }

    // Save raw data
    const outputDir = '/Users/bart/Documents/code/vibeceo/sms-bot/data/ctrl-shift-applications';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const rawPath = `${outputDir}/raw_applications_${timestamp}.json`;

    fs.writeFileSync(rawPath, JSON.stringify(applications, null, 2));
    console.log(`\nSaved raw data to: ${rawPath}`);

    // Show sample
    console.log('\n=== SAMPLE APPLICATION ===\n');
    console.log('From:', applications[0].fromName, `<${applications[0].fromEmail}>`);
    console.log('Date:', applications[0].date);
    console.log('\n--- Content Preview (first 3000 chars) ---\n');
    console.log(applications[0].rawContent.substring(0, 3000));

    console.log(`\n\nTotal applications: ${applications.length}`);
    console.log(`Raw JSON saved to: ${rawPath}`);

  } catch (error: any) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
