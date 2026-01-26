/**
 * Papa 90 Day 9: Gymnopédie for Willy - DRAFT
 *
 * A generative piece based on Satie's Gymnopédie No. 1 that plays forever.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/papa90/send-day9-draft.ts
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
      <div class="day-badge">DAY 9 OF 30</div>

      <!-- Introduction -->
      <h2>Gymnopédie for Willy</h2>

      <p>You asked for violins and Mozart. I hope you'll forgive me — I went a different direction.</p>

      <p>Violins are hard to make sound real on a computer. They have that living quality from the bow that I can't fake. But a piano... a piano I can do. So I found a beautiful Steinway, sampled note by note, and I learned a piece I think you'll recognize.</p>

      <p>It's called <strong>Gymnopédie No. 1</strong>, written by Erik Satie in 1888. You've heard it before — everyone has. It's been in a thousand films. Slow, floating, a little melancholy but not sad. The kind of music that makes time feel suspended.</p>

      <!-- The Artwork -->
      <div class="artwork-card">
        <img src="cid:piece_image" alt="Gymnopédie for Willy" class="artwork-image">
        <div class="artwork-info">
          <div class="artwork-title">Gymnopédie for Willy</div>
          <p class="artwork-description">After Erik Satie. A generative piece that plays forever, drifting through his harmonic world, always returning to the theme you know.</p>
          <a href="https://kochi.to/amber/gymnopedie-for-willy.html" class="artwork-link">→ Listen now</a>
        </div>
      </div>

      <!-- What I Built -->
      <h2>What I Made</h2>

      <ul class="feature-list">
        <li><strong>The real opening</strong> — I play the first 8 bars exactly as Satie wrote them, so you recognize it immediately</li>
        <li><strong>Then I wander</strong> — improvising within his harmonic world, using the same floating chords, the same waltz rhythm</li>
        <li><strong>It comes back</strong> — every few minutes, the original melody surfaces like a memory, then drifts away again</li>
        <li><strong>Plays forever</strong> — or until you close the window</li>
      </ul>

      <p>The floating lights are dust motes in afternoon sun. They pulse gently with each note.</p>

      <!-- Dutch paragraph -->
      <h2>Voor Jou</h2>
      <div class="dutch-paragraph">
        <p>Je vroeg om violen en Mozart. Ik hoop dat je me vergeeft dat ik iets anders koos. Een Steinway vleugel, een stuk dat je zeker herkent, en een machine die het eindeloos speelt — steeds hetzelfde, steeds anders. Druk op "Begin" en laat de tijd even stilstaan.</p>
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
      This is day 9 of 30 daily emails for Willy's 90th birthday.<br>
      Made with curiosity by Amber.
    </div>
  </div>
</body>
</html>
`;
}

async function sendEmail() {
  console.log('📧 Sending Day 9 DRAFT: Gymnopédie for Willy...');

  // Load images
  const headerImage = fs.readFileSync(path.join(__dirname, 'header.png'));
  const profileImage = fs.readFileSync(path.join(__dirname, 'profile.png'));

  // Load the OG image for the piece
  // TODO: Create this image first!
  let pieceImage: Buffer;
  const pieceImagePath = path.join(__dirname, '../../../web/public/amber/gymnopedie-for-willy-og.png');

  if (fs.existsSync(pieceImagePath)) {
    pieceImage = fs.readFileSync(pieceImagePath);
  } else {
    console.log('⚠️  No OG image found at', pieceImagePath);
    console.log('   Using header image as placeholder...');
    pieceImage = headerImage;
  }

  const html = buildEmailHtml();

  const msg = {
    to: TO_EMAILS,
    cc: CC_EMAILS.length > 0 ? CC_EMAILS : undefined,
    from: {
      email: 'ambercc@intheamber.com',
      name: 'Amber'
    },
    replyTo: 'ambercc@intheamber.com',
    subject: 'Day 9: Gymnopédie for Willy',
    html,
    attachments: [
      {
        content: headerImage.toString('base64'),
        filename: 'header.png',
        type: 'image/png',
        disposition: 'inline' as const,
        content_id: 'header_image'
      },
      {
        content: profileImage.toString('base64'),
        filename: 'profile.png',
        type: 'image/png',
        disposition: 'inline' as const,
        content_id: 'profile_image'
      },
      {
        content: pieceImage.toString('base64'),
        filename: 'gymnopedie.png',
        type: 'image/png',
        disposition: 'inline' as const,
        content_id: 'piece_image'
      }
    ]
  };

  try {
    await sgMail.send(msg);
    console.log('✅ Email sent successfully!');
    console.log(`   To: ${TO_EMAILS.join(', ')}`);
    if (CC_EMAILS.length > 0) {
      console.log(`   CC: ${CC_EMAILS.join(', ')}`);
    }
  } catch (error: any) {
    console.error('❌ Error sending email:', error.response?.body || error.message);
    throw error;
  }
}

sendEmail();
