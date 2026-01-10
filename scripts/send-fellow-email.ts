import sgMail from '@sendgrid/mail';
import fs from 'fs';
import path from 'path';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

const html = fs.readFileSync(
  path.join(__dirname, '../web/public/emails/ctrl-shift-fellow-interest.html'),
  'utf-8'
);

// Add your 20 recipients here
const recipients = [
  // 'applicant1@example.com',
  // 'applicant2@example.com',
];

async function send() {
  if (recipients.length === 0) {
    console.log('No recipients! Add emails to the recipients array.');
    return;
  }

  for (const email of recipients) {
    try {
      await sgMail.send({
        to: email,
        from: 'Bart Decrem <bart@ctrlshift.so>', // Change if needed
        subject: 'CTRL SHIFT Fellow Program',
        html,
      });
      console.log(`✓ Sent to ${email}`);
    } catch (err: any) {
      console.error(`✗ Failed for ${email}:`, err.message);
    }
  }

  console.log('Done!');
}

send();
