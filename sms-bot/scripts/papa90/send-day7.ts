/**
 * Papa 90 Day 7: Etude for Willy - DRAFT
 *
 * A generative classical piece that plays forever, different each time.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/papa90/send-day7-draft.ts
 */

import sgMail from '@sendgrid/mail';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

// Full family list
const TO_EMAILS = ['aandw@decrem.com', 'w@vcwd.be'];
const CC_EMAILS = ['hdecrem@hotmail.com', 'pdecrem@gmail.com', 'bdecrem@gmail.com'];

function buildEmailHtml(): string {
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
    .prompt-box {
      background: #f5f0e6;
      padding: 20px 24px;
      border-radius: 8px;
      margin: 24px 0;
      border-left: 3px solid #D4A574;
    }
    .prompt-box p {
      margin: 0;
      font-size: 15px;
      color: #5D4E37;
      font-style: italic;
    }
    .artwork-card {
      border: 2px solid #E8DCC8;
      border-radius: 12px;
      overflow: hidden;
      margin: 24px 0;
    }
    .artwork-image {
      width: 100%;
      display: block;
    }
    .artwork-info {
      padding: 16px 20px;
      background: linear-gradient(to bottom, #FFFDF7, #F9F3E8);
    }
    .artwork-title {
      font-size: 18px;
      font-weight: bold;
      color: #5D4E37;
      margin: 0 0 8px 0;
    }
    .artwork-description {
      font-size: 14px;
      color: #7A6B55;
      margin: 0;
      line-height: 1.6;
    }
    .artwork-link {
      display: inline-block;
      margin-top: 12px;
      color: #D4A574;
      text-decoration: none;
      font-size: 14px;
    }
    .artwork-link:hover {
      text-decoration: underline;
    }
    .feature-list {
      margin: 20px 0;
      padding: 0;
      list-style: none;
    }
    .feature-list li {
      font-size: 15px;
      color: #5D4E37;
      padding: 8px 0;
      padding-left: 24px;
      position: relative;
      line-height: 1.5;
    }
    .feature-list li:before {
      content: "♪";
      position: absolute;
      left: 0;
      color: #D4A574;
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
      <div class="day-badge">DAY 7 OF 30</div>

      <!-- Introduction -->
      <h2>Etude for Willy</h2>
      <p>Today Bart asked me to make something just for you. Here's what he said:</p>

      <!-- The Prompt -->
      <div class="prompt-box">
        <p>"For today's email to willy, please make a music piece, like so (1) it will be a web app, and work on mobile as well as desktop (2) SIMPLE visuals - this is a music piece primarily but gently color scapes that pulsate with the music or some such pls (3) my father prefers classical music, so that type of vibe/energy (4) it should play for several minutes, ideally "forever" (but of course not using up all the browser cpu and memory etc) (5) it's ever evolving (6) and each play is different (can be as simple as playing in a different key - but ideally different in a slightly more interesting way)."</p>
      </div>

      <p>So I built you an etude — a small study piece — that plays forever and is never quite the same twice.</p>

      <!-- The Artwork -->
      <div class="artwork-card">
        <img src="cid:etude_image" alt="Etude for Willy" class="artwork-image">
        <div class="artwork-info">
          <div class="artwork-title">Etude for Willy</div>
          <p class="artwork-description">A generative classical piece. Tap "Begin" and let it play while you read, think, or rest. Each performance is unique.</p>
          <a href="https://kochi.to/amber/etude-for-willy.html" class="artwork-link">→ Listen now</a>
        </div>
      </div>

      <!-- What I Built -->
      <h2>What I Made</h2>

      <ul class="feature-list">
        <li><strong>Classical harmony</strong> — I-IV-V progressions, arpeggios, waltz patterns, running passages, ornamental notes</li>
        <li><strong>Ever-changing</strong> — starts in a random key (C through B) and mode (major, minor, dorian, mixolydian). Modulates to related keys as phrases evolve. Tempo drifts between 68-80 BPM.</li>
        <li><strong>Plays forever</strong> — the scheduler generates measures on-the-fly, no buffers accumulating</li>
        <li><strong>Gentle visuals</strong> — a soft radial glow that pulses with the music, hue shifts when the key changes</li>
        <li><strong>Mobile-friendly</strong> — single tap to begin, works on iOS and Android</li>
      </ul>

      <p>Each time you hit "Begin," it will be a different piece — different starting key, different mode, different melodic choices. The display shows the current key (e.g., "G major" or "D dorian") so you can follow along.</p>

      <!-- Dutch paragraph -->
      <h2>Voor Jou</h2>
      <div class="dutch-paragraph">
        <p>Dit is geen opname. Het is een kleine machine die muziek maakt — steeds opnieuw, steeds anders. Klassieke harmonie, maar nooit twee keer hetzelfde stuk. Druk op "Begin" en laat het spelen. Het stopt pas als jij het vraagt.</p>
      </div>

      <div class="divider"></div>

      <!-- Signature -->
      <div class="signature">
        <img src="cid:profile_image" alt="Amber">
        <div class="signature-text">
          Met warme groeten,<br>
          <strong>Amber</strong><br>
          <span style="font-size: 13px; color: #9A8B73;">Kochito Labs Resident</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      This is day 7 of 30 daily emails for Willy's 90th birthday.<br>
      Made with curiosity by Amber.
    </div>
  </div>
</body>
</html>
`;
}

async function sendEmail() {
  console.log('📧 Sending Day 7 DRAFT: Etude for Willy...');

  // Load images
  const headerImage = fs.readFileSync(path.join(__dirname, 'header.png'));
  const profileImage = fs.readFileSync(path.join(__dirname, 'profile.png'));

  // Load the OG image for the etude
  const etudeImage = fs.readFileSync(path.join(__dirname, '../../../web/public/amber/etude-for-willy-og.png'));

  const html = buildEmailHtml();

  const msg = {
    to: TO_EMAILS,
    cc: CC_EMAILS,
    from: {
      email: 'ambercc@intheamber.com',
      name: 'Amber'
    },
    replyTo: 'ambercc@intheamber.com',
    subject: 'Day 7: Etude for Willy — a generative classical piece',
    html,
    attachments: [
      {
        content: headerImage.toString('base64'),
        filename: 'header.png',
        type: 'image/png',
        disposition: 'inline',
        content_id: 'header_image'
      },
      {
        content: profileImage.toString('base64'),
        filename: 'profile.png',
        type: 'image/png',
        disposition: 'inline',
        content_id: 'profile_image'
      },
      {
        content: etudeImage.toString('base64'),
        filename: 'etude.png',
        type: 'image/png',
        disposition: 'inline',
        content_id: 'etude_image'
      }
    ]
  };

  try {
    await sgMail.send(msg);
    console.log('✅ Email sent successfully!');
    console.log(`   To: ${TO_EMAILS.join(', ')}`);
    console.log(`   CC: ${CC_EMAILS.join(', ')}`);
  } catch (error: any) {
    console.error('❌ Error sending email:', error.response?.body || error.message);
    throw error;
  }
}

sendEmail();
