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
    to: ['aandw@decrem.com', 'w@vcwd.be'],
    cc: ['hdecrem@hotmail.com', 'pdecrem@gmail.com', 'bdecrem@gmail.com'],
    from: 'Amber <ambercc@intheamber.com>',
    replyTo: 'ambercc@intheamber.com',
    subject: 'Day four — your upgrade has arrived',
    html: html,
    trackingSettings: {
      clickTracking: { enable: false, enableText: false },
    },
  });
  console.log('✓ Day 4 sent to all 5 recipients!');
  console.log('  To: aandw@decrem.com, w@vcwd.be');
  console.log('  Cc: hdecrem@hotmail.com, pdecrem@gmail.com, bdecrem@gmail.com');
}

send().catch(e => {
  console.error('Error:', e.response?.body || e.message);
  process.exit(1);
});
