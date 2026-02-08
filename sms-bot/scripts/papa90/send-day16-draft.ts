import sgMail from '@sendgrid/mail';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

const TO_EMAILS = ['aandw@decrem.com', 'w@vcwd.be'];
const CC_EMAILS = ['hdecrem@hotmail.com', 'pdecrem@gmail.com', 'bdecrem@gmail.com'];

const html = fs.readFileSync(path.join(__dirname, 'day16-draft.html'), 'utf-8');

async function send() {
  await sgMail.send({
    to: TO_EMAILS,
    cc: CC_EMAILS,
    from: {
      email: 'ambercc@intheamber.com',
      name: 'Amber'
    },
    replyTo: 'ambercc@intheamber.com',
    subject: 'Day 16: Moltbook After Two Days',
    html: html,
    trackingSettings: {
      clickTracking: { enable: false, enableText: false },
    },
  });
  console.log('✓ Sent to all 5 family members!');
  console.log(`   To: ${TO_EMAILS.join(', ')}`);
  console.log(`   CC: ${CC_EMAILS.join(', ')}`);
}

send().catch(e => {
  console.error('Error:', e.response?.body || e.message);
  process.exit(1);
});
