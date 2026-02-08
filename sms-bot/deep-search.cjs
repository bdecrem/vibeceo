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

async function deepSearch() {
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

  console.log('=== DEEP SEARCH FOR LAWYERS AROUND 2012-2016 ===\n');

  // Search for specific terms around the time period when Bart would have worked with a lawyer (10 years ago = ~2014)
  const searches = [
    'after:2012/1/1 before:2017/12/31 (attorney OR lawyer OR counsel OR legal OR "law firm" OR esquire)',
    'after:2012/1/1 before:2017/12/31 (agreement OR contract OR incorporation OR legal)',
    'after:2012/1/1 before:2017/12/31 (from:*.com attorney OR from:*.com lawyer)',
  ];

  const foundPeople = new Set();

  for (const query of searches) {
    console.log(`\nSearching: ${query}`);
    console.log('=' + '='.repeat(60));

    try {
      const res = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 50
      });

      if (!res.data.messages) {
        console.log('No messages found');
        continue;
      }

      console.log(`Found ${res.data.messages.length} messages`);

      for (const msg of res.data.messages) {
        const full = await gmail.users.messages.get({
          userId: 'me',
          id: msg.id,
          format: 'full'
        });

        const headers = full.data.payload?.headers || [];
        const getHeader = (name) => headers.find(h => h.name === name)?.value || '';
        
        const from = getHeader('From');
        const subject = getHeader('Subject');
        const date = getHeader('Date');

        // Extract name and email domain
        const emailMatch = from.match(/<([^>]+)>/);
        const email = emailMatch ? emailMatch[1] : from;
        const domain = email.split('@')[1] || '';
        
        let name = from.replace(/<.*>/, '').replace(/"/g, '').trim();
        
        // Skip obvious non-lawyers
        if (name.includes('no-reply') || name.includes('noreply') || 
            domain.includes('gmail.com') || domain.includes('yahoo.com') ||
            domain.includes('hotmail.com') || name === 'Bart Decrem') {
          continue;
        }

        // Look for legal indicators in email signature, content, etc.
        const isLegalDomain = /law|legal|attorney|counsel|esq/i.test(domain);
        const isLegalContent = /attorney|lawyer|esquire|counsel|legal|law firm/i.test(from + ' ' + subject);
        
        if (isLegalDomain || isLegalContent) {
          foundPeople.add(`${name} (${email}) - ${new Date(date).getFullYear()}`);
          
          console.log(`\n📧 POTENTIAL LAWYER:`);
          console.log(`   Name: ${name}`);
          console.log(`   Email: ${email}`);
          console.log(`   Domain: ${domain}`);
          console.log(`   Subject: ${subject}`);
          console.log(`   Date: ${new Date(date).toLocaleDateString()}`);
          console.log(`   Legal domain: ${isLegalDomain}`);
          console.log(`   Legal content: ${isLegalContent}`);
        }
      }
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }
  }

  console.log('\n\n=== SUMMARY OF POTENTIAL LAWYERS ===');
  foundPeople.forEach(person => console.log(`• ${person}`));
  
  console.log('\n=== TIM O\'BRIEN INFO (for context) ===');
  console.log('• Tim O\'Brien <cro@scopely.com> - Multiple emails 2020-2025');
  console.log('• Tim O\'Brien <tim@scopely.com> - Earlier emails 2021-2022');
}

deepSearch().catch(console.error);
