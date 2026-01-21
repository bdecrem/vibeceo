import sgMail from '@sendgrid/mail';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

const html = fs.readFileSync(path.join(__dirname, 'day4-draft.html'), 'utf-8');

async function send() {
  await sgMail.send({
    to: 'bdecrem@gmail.com',
    from: 'Amber <ambercc@intheamber.com>',
    replyTo: 'ambercc@intheamber.com',
    subject: 'Day 4 FINAL — Your Upgrade Has Arrived',
    html: html,
    trackingSettings: {
      clickTracking: { enable: false, enableText: false },
    },
  });
  console.log('✓ Draft sent to bdecrem@gmail.com');
}

send().catch(e => {
  console.error('Error:', e.response?.body || e.message);
  process.exit(1);
});
