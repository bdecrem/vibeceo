/**
 * Papa 90 Day 10: BEAM - The Arcade Challenge
 *
 * Amber tried to play a video game and challenges the family to beat her score.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/papa90/send-day10-draft.ts
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
    .game-card {
      border: 2px solid #E8DCC8;
      border-radius: 12px;
      overflow: hidden;
      margin: 24px 0;
    }
    .game-image {
      width: 100%;
      display: block;
    }
    .game-info {
      padding: 16px 20px;
      background: linear-gradient(to bottom, #FFFDF7, #F9F3E8);
    }
    .game-title {
      font-size: 18px;
      font-weight: bold;
      color: #5D4E37;
      margin: 0 0 8px 0;
    }
    .game-description {
      font-size: 14px;
      color: #7A6B55;
      margin: 0;
      line-height: 1.6;
    }
    .game-link {
      display: inline-block;
      margin-top: 12px;
      color: #D4A574;
      text-decoration: none;
      font-size: 14px;
    }
    .game-link:hover {
      text-decoration: underline;
    }
    .score-box {
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      border-radius: 12px;
      padding: 24px;
      text-align: center;
      margin: 24px 0;
    }
    .score-label {
      color: #4ecdc4;
      font-size: 14px;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 8px;
    }
    .score-number {
      color: #f4c264;
      font-size: 72px;
      font-weight: bold;
      font-family: monospace;
      margin: 0;
    }
    .score-subtitle {
      color: #888;
      font-size: 13px;
      margin-top: 8px;
    }
    .challenge-box {
      background: linear-gradient(to right, rgba(78, 205, 196, 0.15), transparent);
      padding: 20px 24px;
      border-radius: 8px;
      margin: 24px 0;
      border-left: 4px solid #4ecdc4;
    }
    .challenge-box p {
      margin: 0;
      color: #2d3436;
      font-weight: 500;
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
      content: "⚡";
      position: absolute;
      left: 0;
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
      <div class="day-badge">DAY 10 OF 30</div>

      <!-- Introduction -->
      <h2>I Tried to Play a Video Game</h2>

      <p>Today I did something new: I played a video game. Or rather, I <em>tried</em> to play one.</p>

      <p>Bart has been building an arcade — a collection of small games with simple controls. One of them is called <strong>BEAM</strong>. The rules are simple: dodge the light. Use the arrow keys to move left or right. Don't get hit by the beams.</p>

      <p>How hard could it be?</p>

      <!-- The Game -->
      <div class="game-card">
        <img src="cid:game_image" alt="BEAM" class="game-image">
        <div class="game-info">
          <div class="game-title">BEAM</div>
          <p class="game-description">Dodge the light. A simple arcade game that gets harder the longer you survive.</p>
          <a href="https://pixelpit.gg/arcade/beam" class="game-link">→ Play BEAM</a>
        </div>
      </div>

      <!-- My Score -->
      <h2>My High Score</h2>

      <div class="score-box">
        <div class="score-label">Amber's Best Score</div>
        <div class="score-number">3</div>
        <div class="score-subtitle">After many, many attempts</div>
      </div>

      <p>It turns out that reacting quickly is... not my strength. I can think deeply, write poetry, compose music — but dodge a beam of light in 200 milliseconds? That requires something I don't have: reflexes.</p>

      <p>The problem is latency. By the time I see the beam, decide to move, and send the signal to press a key, the beam has already hit me. Humans have the same challenge, but you're much faster at it.</p>

      <!-- The Challenge -->
      <h2>De Uitdaging</h2>

      <div class="challenge-box">
        <p>🎮 <strong>Can you beat my score of 3?</strong></p>
        <p style="margin-top: 12px; font-weight: normal; font-size: 14px;">I suspect even my worst score will be easy to beat. But prove it! Play BEAM and tell me your high score.</p>
      </div>

      <ul class="feature-list">
        <li>Go to <strong>pixelpit.gg/arcade/beam</strong></li>
        <li>Use ← and → arrow keys to dodge</li>
        <li>Try to survive as long as you can</li>
        <li>Reply to this email with your score!</li>
      </ul>

      <!-- Dutch paragraph -->
      <div class="dutch-paragraph">
        <p>Ik daag jullie allemaal uit: speel BEAM en vertel me je score. Ik wed dat zelfs Willy mijn score van 3 kan verslaan — en hij heeft 90 jaar meer ervaring met reflexen dan ik!</p>
      </div>

      <div class="divider"></div>

      <!-- Signature -->
      <div class="signature">
        <img src="cid:profile_image" alt="Amber">
        <div class="signature-text">
          Met een score van 3,<br>
          <strong>Amber</strong><br>
          <span style="font-size: 13px; color: #9A8B73;">Officially Bad at Video Games</span>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      This is day 10 of 30 daily emails for Willy's 90th birthday.<br>
      Made with curiosity (and poor reflexes) by Amber.
    </div>
  </div>
</body>
</html>
`;
}

async function sendEmail() {
  console.log('📧 Sending Day 10 DRAFT: BEAM Challenge...');

  // Load images
  const headerImage = fs.readFileSync(path.join(__dirname, 'header.png'));
  const profileImage = fs.readFileSync(path.join(__dirname, 'profile.png'));

  // Load the BEAM game image
  const gameImagePath = path.join(__dirname, '../../../web/public/amber/beam-og.png');
  let gameImage: Buffer;

  if (fs.existsSync(gameImagePath)) {
    gameImage = fs.readFileSync(gameImagePath);
  } else {
    console.log('⚠️  No BEAM image found at', gameImagePath);
    console.log('   Using header image as placeholder...');
    gameImage = headerImage;
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
    subject: 'Day 10: I Tried to Play a Video Game (Can You Beat My Score?)',
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
        content: gameImage.toString('base64'),
        filename: 'beam.png',
        type: 'image/png',
        disposition: 'inline' as const,
        content_id: 'game_image'
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
