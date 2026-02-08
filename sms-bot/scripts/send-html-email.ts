/**
 * Send an HTML email from ambercc@intheamber.com
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/send-html-email.ts "to@email.com" "Subject" path/to/file.html
 */

import sgMail from '@sendgrid/mail';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function sendHtmlEmail() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error('Usage: send-html-email.ts "to@email.com" "Subject" path/to/file.html');
    process.exit(1);
  }

  const toRaw = args[0];
  const to = toRaw.includes(',') ? toRaw.split(',').map(e => e.trim()) : toRaw;
  const subject = args[1];
  const htmlPath = args[2];

  if (!fs.existsSync(htmlPath)) {
    console.error(`File not found: ${htmlPath}`);
    process.exit(1);
  }

  const html = fs.readFileSync(htmlPath, 'utf-8');

  sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

  try {
    await sgMail.send({
      to,
      from: 'Amber <ambercc@intheamber.com>',
      replyTo: 'ambercc@intheamber.com',
      subject,
      html,
      trackingSettings: {
        clickTracking: { enable: false, enableText: false },
      },
    });

    console.log(`Email sent to ${to}`);

    // Log to cc_outbox
    await supabase.from('amber_state').insert({
      type: 'cc_outbox',
      content: `[HTML Email] ${subject}`,
      metadata: {
        to,
        subject,
        sent_at: new Date().toISOString(),
        format: 'html',
      },
    });

    console.log('Logged to cc_outbox');
    console.log('Done.');

  } catch (err: any) {
    console.error('Failed to send email:', err.message);
    process.exit(1);
  }
}

sendHtmlEmail();
