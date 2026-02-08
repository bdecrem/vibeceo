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

async function thoroughSearch() {
  const { data } = await supabase
    .from('user_oauth_tokens')
    .select('*')
    .eq('subscriber_id', BART_ID)
    .eq('provider', 'gmail')
    .single();

  const refreshToken = decrypt(data.encrypted_refresh_token);
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  oauth2Client.setCredentials({ refresh_token: refreshToken });

  const { credentials } = await oauth2Client.refreshAccessToken();
  oauth2Client.setCredentials(credentials);

  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  console.log('=== EXHAUSTIVE LAWYER SEARCH ===\n');

  // More specific searches - casting a wider net
  const searches = [
    // Names that might be lawyers
    'from:(@*.com) after:2011 before:2018 (attorney OR lawyer OR esq OR counsel)',
    // Business contexts where lawyers appear
    'after:2011 before:2018 (incorporation OR LLC OR legal OR contract OR agreement)',
    // Car-related with personal names (not companies)
    'after:2011 before:2018 (porsche OR "car" OR "vehicle") -from:ebay -from:porsche',
    // Look for common lawyer name patterns
    'after:2011 before:2018 from:(david OR michael OR robert OR richard OR james OR john OR steve OR steve)',
    // Law firm domains
    'after:2011 before:2018 (from:law OR from:legal OR @lawfirm OR @counsel)',
  ];

  const candidates = new Map();

  for (let searchIndex = 0; searchIndex < searches.length; searchIndex++) {
    const query = searches[searchIndex];
    console.log(`\n[${searchIndex + 1}/${searches.length}] ${query}`);
    console.log('='.repeat(80));

    try {
      const res = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 100
      });

      if (!res.data.messages) {
        console.log('No messages found');
        continue;
      }

      console.log(`Found ${res.data.messages.length} messages`);

      for (let i = 0; i < Math.min(res.data.messages.length, 20); i++) {
        const msg = res.data.messages[i];
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
        const to = getHeader('To');

        // Skip obvious system emails
        if (!from || from.includes('no-reply') || from.includes('noreply') || 
            from.includes('Bart Decrem')) continue;

        const email = from.match(/<([^>]+)>/)?.[1] || from;
        const domain = email.split('@')[1] || '';
        const name = from.replace(/<.*>/, '').replace(/"/g, '').trim();

        // Score this contact
        let score = 0;
        let reasons = [];

        // Legal indicators
        if (/law|legal|attorney|counsel|esq/i.test(domain)) {
          score += 10;
          reasons.push('Legal domain');
        }
        if (/attorney|lawyer|esquire|counsel/i.test(from)) {
          score += 8;
          reasons.push('Legal title');
        }
        if (/legal|contract|agreement|incorporation/i.test(subject)) {
          score += 5;
          reasons.push('Legal subject');
        }

        // Personal name indicators (not company)
        if (/^[A-Z][a-z]+ [A-Z][a-z]+$/.test(name) && !domain.includes('gmail.com')) {
          score += 3;
          reasons.push('Personal name');
        }

        // Car/Porsche indicators
        if (/porsche|car|vehicle|auto/i.test(subject)) {
          score += 4;
          reasons.push('Car related');
        }

        // Time period (closer to 2014 = higher score)
        const year = new Date(date).getFullYear();
        if (year >= 2013 && year <= 2015) {
          score += 5;
          reasons.push('Right timeframe');
        } else if (year >= 2012 && year <= 2016) {
          score += 3;
          reasons.push('Close timeframe');
        }

        if (score > 5) {
          const key = `${name} <${email}>`;
          if (!candidates.has(key) || candidates.get(key).score < score) {
            candidates.set(key, {
              name,
              email,
              domain,
              score,
              reasons,
              subject,
              date: new Date(date).toLocaleDateString(),
              year
            });
          }
        }

        // Show high-scoring candidates immediately
        if (score > 8) {
          console.log(`\n🎯 HIGH SCORE (${score}): ${name}`);
          console.log(`   Email: ${email}`);
          console.log(`   Subject: ${subject}`);
          console.log(`   Date: ${new Date(date).toLocaleDateString()}`);
          console.log(`   Reasons: ${reasons.join(', ')}`);
        }
      }
    } catch (error) {
      console.log(`Error: ${error.message}`);
    }
  }

  console.log('\n\n=== TOP LAWYER CANDIDATES ===');
  const sorted = Array.from(candidates.values())
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

  sorted.forEach((candidate, index) => {
    console.log(`\n${index + 1}. ${candidate.name} (Score: ${candidate.score})`);
    console.log(`   Email: ${candidate.email}`);
    console.log(`   Domain: ${candidate.domain}`);
    console.log(`   Year: ${candidate.year}`);
    console.log(`   Last subject: ${candidate.subject}`);
    console.log(`   Reasons: ${candidate.reasons.join(', ')}`);
  });
}

thoroughSearch().catch(console.error);
