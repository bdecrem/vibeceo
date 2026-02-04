import { google } from 'googleapis';
import { createClient } from '@supabase/supabase-js';
import * as crypto from 'crypto';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const BART_ID = 'a5167b9a-a718-4567-a22d-312b7bf9e773';

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

async function searchLawyerEmails() {
  // Get tokens
  const { data } = await supabase
    .from('user_oauth_tokens')
    .select('*')
    .eq('subscriber_id', BART_ID)
    .eq('provider', 'gmail')
    .single();

  if (!data) {
    console.log('No Gmail connected');
    return;
  }

  const refreshToken = decrypt(data.encrypted_refresh_token);

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  // Get fresh access token
  const { credentials } = await oauth2Client.refreshAccessToken();
  oauth2Client.setCredentials(credentials);

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  // Search queries for lawyer, Tim O'Brien, and Porsche
  const searchQueries = [
    { name: 'Tim O\'Brien connections', query: 'tim.obrien OR "tim o brien" OR "tim obrien"' },
    { name: 'Lawyer communications', query: 'lawyer OR attorney OR legal OR "law firm" OR esquire' },
    { name: 'Porsche sale', query: 'porsche OR "car sale" OR "vehicle sale"' }
  ];

  for (const search of searchQueries) {
    console.log(`\n=== ${search.name.toUpperCase()} ===`);
    
    try {
      const res = await gmail.users.messages.list({
        userId: 'me',
        q: search.query,
        maxResults: 20
      });

      if (!res.data.messages) {
        console.log('No messages found');
        continue;
      }

      console.log(`Found ${res.data.messages.length} messages:\n`);

      for (const msg of res.data.messages.slice(0, 10)) {
        const full = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id!,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'To', 'Date']
        });

        const headers = full.data.payload?.headers || [];
        const getH = (n: string) => headers.find(h => h.name === n)?.value || '';
        
        const from = getH('From');
        const to = getH('To');
        const subject = getH('Subject');
        const date = new Date(getH('Date')).toLocaleDateString();

        console.log(`📧 FROM: ${from}`);
        console.log(`📧 TO: ${to}`);
        console.log(`📧 SUBJECT: ${subject}`);
        console.log(`📧 DATE: ${date}`);
        console.log('---');
      }
    } catch (error) {
      console.log(`Error searching: ${error.message}`);
    }
  }
}

searchLawyerEmails().catch(e => console.error('Error:', e.message));