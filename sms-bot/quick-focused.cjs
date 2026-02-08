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
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

async function focusedSearch() {
  const { data } = await supabase.from('user_oauth_tokens').select('*').eq('subscriber_id', BART_ID).eq('provider', 'gmail').single();
  const refreshToken = decrypt(data.encrypted_refresh_token);
  const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();
  oauth2Client.setCredentials(credentials);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  console.log('=== FOCUSED LAWYER SEARCH 2012-2016 ===\n');

  // Just search for people with legal-sounding emails in the right timeframe
  const queries = [
    'after:2012 before:2017 from:(@law*.com OR @legal*.com OR @*law.com)',
    'after:2012 before:2017 from:(*esq@* OR *attorney@* OR *counsel@*)',
    'after:2012 before:2017 subject:(porsche AND from:("david" OR "michael" OR "steve" OR "robert"))'
  ];

  for (const query of queries) {
    console.log(`\nSearching: ${query}`);
    console.log('='.repeat(50));
    
    const res = await gmail.users.messages.list({ userId: 'me', q: query, maxResults: 10 });
    
    if (!res.data.messages) {
      console.log('No results');
      continue;
    }

    for (const msg of res.data.messages) {
      const full = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'metadata', metadataHeaders: ['From', 'Subject', 'Date'] });
      const headers = full.data.payload?.headers || [];
      const from = headers.find(h => h.name === 'From')?.value || '';
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const date = headers.find(h => h.name === 'Date')?.value || '';
      
      console.log(`📧 ${from.replace(/<.*>/, '').trim()}`);
      console.log(`   Email: ${from.match(/<([^>]+)>/)?.[1] || from}`);
      console.log(`   Subject: ${subject}`);
      console.log(`   Date: ${new Date(date).getFullYear()}`);
      console.log('');
    }
  }
}

focusedSearch().catch(console.error);
