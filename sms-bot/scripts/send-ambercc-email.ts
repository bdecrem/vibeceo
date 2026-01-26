/**
 * Send an email from ambercc@intheamber.com AND log it to cc_outbox
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/send-ambercc-email.ts "to@email.com" "Subject" "Body text"
 *   npx tsx --env-file=.env.local scripts/send-ambercc-email.ts "to@email.com" "Subject" --file body.txt
 *
 * Multiple recipients (comma-separated):
 *   npx tsx --env-file=.env.local scripts/send-ambercc-email.ts "a@x.com,b@y.com" "Subject" "Body"
 *
 * This script ensures every outbound ambercc email is logged to Supabase
 * so Claude Code can see what was sent in previous sessions.
 */

import sgMail from '@sendgrid/mail';
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function sendAndLog() {
  const args = process.argv.slice(2);

  if (args.length < 3) {
    console.error('Usage: send-ambercc-email.ts "to@email.com" "Subject" "Body text"');
    console.error('       send-ambercc-email.ts "to@email.com" "Subject" --file body.txt');
    process.exit(1);
  }

  // Support comma-separated recipients (converted to array for SendGrid)
  const toRaw = args[0];
  const to = toRaw.includes(',') ? toRaw.split(',').map(e => e.trim()) : toRaw;
  const subject = args[1];
  let body: string;

  if (args[2] === '--file') {
    if (!args[3]) {
      console.error('Missing file path after --file');
      process.exit(1);
    }
    body = fs.readFileSync(args[3], 'utf-8');
  } else {
    body = args[2];
  }

  // Initialize SendGrid
  sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

  const sentAt = new Date().toISOString();

  try {
    // Send the email
    await sgMail.send({
      to,
      from: 'Amber CC <ambercc@intheamber.com>',
      replyTo: 'ambercc@intheamber.com',
      subject,
      text: body,
      trackingSettings: {
        clickTracking: { enable: false, enableText: false },
      },
    });

    console.log(`Email sent to ${to}`);

    // Log to cc_outbox
    const { error } = await supabase.from('amber_state').insert({
      type: 'cc_outbox',
      content: body,
      metadata: {
        to,
        subject,
        sent_at: sentAt,
      },
    });

    if (error) {
      console.error('Failed to log to cc_outbox:', error.message);
      console.error('Email was sent but not logged!');
      process.exit(1);
    }

    console.log('Logged to cc_outbox');
    console.log('Done.');

  } catch (err: any) {
    console.error('Failed to send email:', err.message);
    process.exit(1);
  }
}

sendAndLog();
