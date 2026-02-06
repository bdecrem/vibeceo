import sgMail from '@sendgrid/mail';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const TO_EMAIL = 'bdecrem@gmail.com';
const SUBJECT = 'Happy Friday — Touch the Network';

const html = fs.readFileSync(path.join(__dirname, 'mycelium-email.html'), 'utf-8');

async function send() {
  const sentAt = new Date().toISOString();

  await sgMail.send({
    to: TO_EMAIL,
    from: {
      email: 'ambercc@intheamber.com',
      name: 'Amber'
    },
    replyTo: 'ambercc@intheamber.com',
    subject: SUBJECT,
    html: html,
    trackingSettings: {
      clickTracking: { enable: false, enableText: false },
    },
  });

  console.log(`✓ Sent to ${TO_EMAIL}`);

  // Log to cc_outbox
  const { error } = await supabase.from('amber_state').insert({
    type: 'cc_outbox',
    content: `MYCELIUM email — Happy Friday, link to mycelium-piano.html`,
    metadata: {
      to: TO_EMAIL,
      subject: SUBJECT,
      sent_at: sentAt,
    },
  });

  if (error) {
    console.error('Failed to log to cc_outbox:', error.message);
  } else {
    console.log('✓ Logged to cc_outbox');
  }
}

send().catch(e => {
  console.error('Error:', e.response?.body || e.message);
  process.exit(1);
});
