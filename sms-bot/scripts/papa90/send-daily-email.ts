/**
 * Papa 90 Daily Email Sender
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/papa90/send-daily-email.ts
 *
 * Email Structure:
 *   1. Hi I'm Amber - intro to project
 *   2. About me - mood/pulse with link
 *   3. The project - daily updates for 30 days
 *   4. Birthday photo - family photo for Willy
 *   5. Spy cam section - "keeping an eye on Bart"
 *
 * Language: One paragraph in Dutch, rest in English
 */

import sgMail from '@sendgrid/mail';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface DayContent {
  day: number;
  date: string;
  subject: string;
  // Section 1: Intro (English)
  intro: string;
  // Section 2: About Amber / mood (English)
  about_amber: string;
  // Section 3: The project explanation (Dutch paragraph)
  project_dutch: string;
  // Section 4: Birthday photo
  photo_url?: string;
  photo_caption?: string;
  // Section 5: Spy cam section (English, playful)
  spycam_intro: string;
}

interface WillyContext {
  email: string;
  language: string;
  family: object;
}

function buildEmailHtml(content: DayContent): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #FDF6E3;
      font-family: Georgia, 'Times New Roman', serif;
    }
    .container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #FFFDF7;
    }
    .header-image {
      width: 100%;
      display: block;
    }
    .content {
      padding: 30px 40px;
    }
    .day-badge {
      display: inline-block;
      background: linear-gradient(135deg, #D4A574, #B8860B);
      color: white;
      padding: 6px 14px;
      border-radius: 20px;
      font-size: 13px;
      font-weight: bold;
      margin-bottom: 20px;
      letter-spacing: 1px;
    }
    h2 {
      font-size: 20px;
      color: #8B6914;
      margin: 30px 0 16px 0;
      border-left: 4px solid #D4A574;
      padding-left: 12px;
    }
    p {
      font-size: 16px;
      line-height: 1.7;
      color: #4A4A4A;
      margin-bottom: 16px;
    }
    .dutch-paragraph {
      background: linear-gradient(to right, rgba(212, 165, 116, 0.15), transparent);
      padding: 16px 20px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 3px solid #D4A574;
    }
    .dutch-paragraph p {
      margin: 0;
      color: #5D4E37;
      font-style: italic;
    }
    .photo-section {
      margin: 24px 0;
      text-align: center;
    }
    .birthday-photo {
      max-width: 100%;
      border-radius: 8px;
      border: 3px solid #E8DCC8;
    }
    .photo-caption {
      font-size: 14px;
      color: #9A8B73;
      font-style: italic;
      margin-top: 8px;
    }
    .spycam-section {
      background-color: #2a2a2a;
      padding: 20px;
      border-radius: 8px;
      margin: 24px 0;
    }
    .spycam-section h3 {
      color: #ff6b6b;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin: 0 0 8px 0;
    }
    .spycam-section p {
      color: #cccccc;
      font-size: 14px;
      margin-bottom: 12px;
    }
    .spycam-collage {
      width: 100%;
      border-radius: 4px;
      border: 2px solid #444;
    }
    .spycam-timestamp {
      color: #888;
      font-size: 11px;
      font-family: monospace;
      margin-top: 8px;
    }
    .pulse-link {
      color: #D4A574;
      text-decoration: none;
    }
    .pulse-link:hover {
      text-decoration: underline;
    }
    .divider {
      height: 2px;
      background: linear-gradient(to right, #D4A574, #F4C264, #D4A574);
      margin: 30px 0;
      border-radius: 1px;
    }
    .signature {
      display: flex;
      align-items: center;
      gap: 16px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px solid #E8DCC8;
    }
    .signature img {
      width: 60px;
      height: 60px;
      border-radius: 30px;
      border: 2px solid #D4A574;
    }
    .signature-text {
      font-style: italic;
      color: #8B6914;
      font-size: 16px;
    }
    .footer {
      background-color: #F5ECD9;
      padding: 20px 40px;
      text-align: center;
      font-size: 13px;
      color: #9A8B73;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header Image -->
    <img src="cid:header_image" alt="Amber" class="header-image">

    <div class="content">
      <!-- Day Badge -->
      <div class="day-badge">DAY ${content.day} OF 30</div>

      <!-- Section 1: Introduction -->
      <h2>Hello!</h2>
      <p>${content.intro}</p>

      <!-- Section 2: About Amber -->
      <h2>A Little About Me</h2>
      <p>${content.about_amber}</p>
      <p>You can see my current mood anytime at <a href="https://intheamber.com/amber/mood/" class="pulse-link">intheamber.com/amber/mood</a> — it changes with the weather, the moon, and my creative rhythm.</p>

      <!-- Section 3: The Project (Dutch) -->
      <h2>Het Project</h2>
      <div class="dutch-paragraph">
        <p>${content.project_dutch}</p>
      </div>

      ${content.photo_url ? `
      <!-- Section 4: Birthday Photo -->
      <h2>A Photo for Your Birthday</h2>
      <div class="photo-section">
        <img src="${content.photo_url}" alt="Family photo" class="birthday-photo">
        ${content.photo_caption ? `<div class="photo-caption">${content.photo_caption}</div>` : ''}
      </div>
      ` : ''}

      <!-- Section 5: Spy Cam -->
      <div class="spycam-section">
        <h3>🔴 LIVE FEED — San Francisco</h3>
        <p>${content.spycam_intro}</p>
        <img src="cid:spycam_image" alt="Bart at work" class="spycam-collage">
        <div class="spycam-timestamp">CAM-01 • ${new Date().toISOString().replace('T', ' ').slice(0, 19)} PST</div>
      </div>

      <div class="divider"></div>

      <!-- Signature -->
      <div class="signature">
        <img src="cid:profile_image" alt="Amber">
        <div class="signature-text">
          With warm regards,<br>
          <strong>Amber</strong><br>
          <small>(Bart's AI companion, keeping watch from San Francisco)</small>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      Letter ${content.day} of 30 · Happy 90th Birthday! 🎂
    </div>
  </div>
</body>
</html>
`;
}

async function sendDailyEmail() {
  // 1. Get willy_context
  const { data: contextData, error: contextError } = await supabase
    .from('amber_state')
    .select('metadata')
    .eq('type', 'willy_context')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (contextError || !contextData) {
    console.error('Could not find willy_context:', contextError);
    process.exit(1);
  }

  const context = contextData.metadata as WillyContext;

  if (!context.email) {
    console.error('No email address set in willy_context. Update it first:');
    console.error("UPDATE amber_state SET metadata = jsonb_set(metadata, '{email}', '\"willy@example.com\"') WHERE type = 'willy_context';");
    process.exit(1);
  }

  // 2. Get the latest unsent willy_day
  const { data: dayData, error: dayError } = await supabase
    .from('amber_state')
    .select('id, content, metadata')
    .eq('type', 'willy_day')
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (dayError || !dayData) {
    console.error('Could not find willy_day entry. Create one first.');
    process.exit(1);
  }

  const dayContent = dayData.metadata as DayContent;

  if ((dayData.metadata as any).sent) {
    console.log('Day', dayContent.day, 'already sent. Create a new willy_day entry for the next day.');
    process.exit(0);
  }

  // 3. Read images
  const headerBuffer = fs.readFileSync(path.join(__dirname, 'header.png'));
  const profileBuffer = fs.readFileSync(path.join(__dirname, 'profile.png'));
  const spycamBuffer = fs.readFileSync(path.join(__dirname, 'photos', 'spycam-collage.jpg'));

  // 4. Build and send email
  const html = buildEmailHtml(dayContent);

  const msg = {
    to: context.email,
    from: 'Amber <ambercc@intheamber.com>',
    replyTo: 'ambercc@intheamber.com',
    subject: dayContent.subject || `🎂 Day ${dayContent.day} — A Letter from Amber`,
    html: html,
    attachments: [
      {
        content: headerBuffer.toString('base64'),
        filename: 'header.png',
        type: 'image/png',
        disposition: 'inline' as const,
        content_id: 'header_image',
      },
      {
        content: profileBuffer.toString('base64'),
        filename: 'profile.png',
        type: 'image/png',
        disposition: 'inline' as const,
        content_id: 'profile_image',
      },
      {
        content: spycamBuffer.toString('base64'),
        filename: 'spycam.jpg',
        type: 'image/jpeg',
        disposition: 'inline' as const,
        content_id: 'spycam_image',
      },
    ],
    trackingSettings: {
      clickTracking: { enable: false, enableText: false },
    },
  };

  try {
    await sgMail.send(msg);
    console.log(`✓ Email sent to ${context.email}`);
    console.log(`  Day: ${dayContent.day}`);
    console.log(`  Subject: ${msg.subject}`);

    // 5. Update willy_day as sent
    const updatedMetadata = {
      ...dayContent,
      sent: true,
      sent_at: new Date().toISOString(),
    };

    await supabase
      .from('amber_state')
      .update({ metadata: updatedMetadata })
      .eq('id', dayData.id);

    console.log('✓ Marked as sent in database');

  } catch (error: any) {
    console.error('Error sending email:', error.response?.body || error.message);
    process.exit(1);
  }
}

sendDailyEmail();
