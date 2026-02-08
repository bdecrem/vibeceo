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

async function findLawyers() {
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

  console.log('=== SEARCHING FOR LAWYER CONNECTIONS ===\n');

  // Search for emails with common lawyer/law firm terms plus Porsche
  const searches = [
    'attorney OR lawyer after:2010 before:2020',
    'esquire OR "law firm" after:2010 before:2020', 
    'legal OR counsel after:2010 before:2020',
    'porsche after:2010 before:2020',
    '"car sale" OR "vehicle sale" after:2010 before:2020'
  ];

  const lawyers = new Set();

  for (const query of searches) {
    console.log(`Searching: ${query}`);
    console.log('=' + '='.repeat(50));

    try {
      const res = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 20
      });

      if (!res.data.messages) {
        console.log('No messages found\n');
        continue;
      }

      for (const msg of res.data.messages) {
        const full = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full'
        });

        const headers = full.data.payload?.headers || [];
        const getHeader = (name) => headers.find(h => h.name === name)?.value || '';
        
        const from = getHeader('From');
        const to = getHeader('To');
        const subject = getHeader('Subject');
        const date = new Date(getHeader('Date')).toLocaleDateString();

        // Extract name from email
        let name = from.replace(/<.*>/, '').replace(/"/g, '').trim();
        
        // Look for legal indicators
        const isLegal = /attorney|lawyer|esquire|counsel|law firm|legal/i.test(from + ' ' + subject);
        const hasPorsche = /porsche|car sale|vehicle/i.test(subject);
        
        if (isLegal || hasPorsche) {
          lawyers.add(name);
          
          console.log(`📧 FROM: ${from}`);
          console.log(`📧 TO: ${to}`);
          console.log(`📧 SUBJECT: ${subject}`);
          console.log(`📧 DATE: ${date}`);
          console.log(`📧 LEGAL: ${isLegal ? 'YES' : 'NO'} | PORSCHE: ${hasPorsche ? 'YES' : 'NO'}`);
          console.log('');
        }
      }
    } catch (error) {
      console.log(`Error: ${error.message}\n`);
    }
  }

  console.log('\n=== POTENTIAL LAWYER NAMES ===');
  lawyers.forEach(name => console.log(`• ${name}`));
}

findLawyers().catch(console.error);
