const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const BART_ID = 'a5167b9a-a718-4567-a22d-312b7bf9e773';

const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function decrypt(encryptedData) {
  const key = Buffer.from(process.env.OAUTH_ENCRYPTION_KEY, 'hex');
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

  const { credentials } = await oauth2Client.refreshAccessToken();
  oauth2Client.setCredentials(credentials);

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  console.log('=== SEARCHING FOR LAWYER/TIM O\'BRIEN/PORSCHE EMAILS ===\n');

  const searches = [
    'tim.obrien OR "tim o brien"',
    'lawyer OR attorney OR legal',
    'porsche OR "car sale"'
  ];

  for (const query of searches) {
    console.log(`\nSearching: ${query}`);
    console.log('=' + '='.repeat(query.length + 10));

    try {
      const res = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 10
      });

      if (!res.data.messages) {
        console.log('No messages found\n');
        continue;
      }

      for (const msg of res.data.messages) {
        const full = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'metadata',
          metadataHeaders: ['Subject', 'From', 'To', 'Date']
        });

        const headers = full.data.payload?.headers || [];
        const getHeader = (name) => headers.find(h => h.name === name)?.value || '';
        
        const from = getHeader('From');
        const subject = getHeader('Subject');
        const date = new Date(getHeader('Date')).toLocaleDateString();

        console.log(`📧 FROM: ${from}`);
        console.log(`📧 SUBJECT: ${subject}`);
        console.log(`📧 DATE: ${date}`);
        console.log('');
      }
    } catch (error) {
      console.log(`Error: ${error.message}\n`);
    }
  }
}

searchLawyerEmails().catch(console.error);
