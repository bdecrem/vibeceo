const { google } = require('googleapis');
const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
const BART_ID = 'a5167b9a-a718-4567-a22d-312b7bf9e773';

function decrypt(encryptedData) {
  const key = Buffer.from(process.env.OAUTH_ENCRYPTION_KEY, 'hex');
  const combined = Buffer.from(encryptedData, 'base64');
  const iv = combined.subarray(32, 48);
  const authTag = combined.subarray(48, 64);
  const encrypted = combined.subarray(64);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(encrypted), decipher.final()]).toString('utf8');
}

(async () => {
  const { data } = await supabase.from('user_oauth_tokens').select('*').eq('subscriber_id', BART_ID).eq('provider', 'gmail').single();
  const refreshToken = decrypt(data.encrypted_refresh_token);
  const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();
  oauth2Client.setCredentials(credentials);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  console.log('GARY BRADSKI EMAILS:');
  const res = await gmail.users.messages.list({ userId: 'me', q: 'gary.bradski after:2010', maxResults: 5 });
  
  for (const msg of (res.data.messages || [])) {
    const full = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'metadata', metadataHeaders: ['From', 'Subject', 'Date'] });
    const headers = full.data.payload?.headers || [];
    console.log('FROM:', headers.find(h => h.name === 'From')?.value);
    console.log('SUBJECT:', headers.find(h => h.name === 'Subject')?.value);
    console.log('DATE:', headers.find(h => h.name === 'Date')?.value);
    console.log('---');
  }
})();
