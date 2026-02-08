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

async function nameSearch() {
  const { data } = await supabase.from('user_oauth_tokens').select('*').eq('subscriber_id', BART_ID).eq('provider', 'gmail').single();
  const refreshToken = decrypt(data.encrypted_refresh_token);
  const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  const { credentials } = await oauth2Client.refreshAccessToken();
  oauth2Client.setCredentials(credentials);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  console.log('=== SEARCHING FOR SPECIFIC LAWYER NAMES ===\n');

  // Search for Gary Bradski and look for other names
  const names = ['gary.bradski', 'bradski', 'david', 'michael', 'steve', 'robert', 'richard', 'john'];
  
  for (const name of names) {
    console.log(`\nSearching for: ${name} (2012-2016)`);
    console.log('='.repeat(40));
    
    const query = `after:2012 before:2017 from:${name}`;
    const res = await gmail.users.messages.list({ userId: 'me', q: query, maxResults: 15 });
    
    if (!res.data.messages) {
      console.log('No results');
      continue;
    }

    console.log(`Found ${res.data.messages.length} messages`);
    
    for (const msg of res.data.messages) {
      const full = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'metadata', metadataHeaders: ['From', 'Subject', 'Date', 'To'] });
      const headers = full.data.payload?.headers || [];
      const from = headers.find(h => h.name === 'From')?.value || '';
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const date = headers.find(h => h.name === 'Date')?.value || '';
      
      const fullName = from.replace(/<.*>/, '').trim();
      const email = from.match(/<([^>]+)>/)?.[1] || from;
      
      console.log(`📧 ${fullName}`);
      console.log(`   Email: ${email}`);
      console.log(`   Subject: ${subject}`);
      console.log(`   Date: ${new Date(date).getFullYear()}`);
      
      // Check if this looks like legal work
      const isLegal = /legal|attorney|law|contract|agreement|incorporation|porsche|car|sale/i.test(subject + ' ' + from);
      if (isLegal) {
        console.log(`   🎯 LEGAL INDICATOR: YES`);
      }
      console.log('');
    }
  }

  // Also search for car-related emails with personal names
  console.log('\n=== CAR SALE RELATED EMAILS ===');
  const carQuery = 'after:2012 before:2017 (porsche OR "car sale" OR "vehicle sale") -from:ebay -from:porsche';
  const carRes = await gmail.users.messages.list({ userId: 'me', q: carQuery, maxResults: 20 });
  
  if (carRes.data.messages) {
    for (const msg of carRes.data.messages) {
      const full = await gmail.users.messages.get({ userId: 'me', id: msg.id, format: 'metadata', metadataHeaders: ['From', 'Subject', 'Date'] });
      const headers = full.data.payload?.headers || [];
      const from = headers.find(h => h.name === 'From')?.value || '';
      const subject = headers.find(h => h.name === 'Subject')?.value || '';
      const date = headers.find(h => h.name === 'Date')?.value || '';
      
      const fullName = from.replace(/<.*>/, '').trim();
      const email = from.match(/<([^>]+)>/)?.[1] || from;
      
      // Skip obvious company emails
      if (fullName.includes('eBay') || fullName.includes('Porsche') || fullName.includes('no-reply')) continue;
      
      console.log(`🚗 ${fullName}`);
      console.log(`   Email: ${email}`);
      console.log(`   Subject: ${subject}`);
      console.log(`   Date: ${new Date(date).getFullYear()}`);
      console.log('');
    }
  }
}

nameSearch().catch(console.error);
