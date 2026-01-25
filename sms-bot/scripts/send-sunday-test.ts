/**
 * Send Sunday Morning pixel art test email
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/send-sunday-test.ts
 */

import sgMail from '@sendgrid/mail';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium } from 'playwright';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

async function capturePixelArt(): Promise<Buffer> {
  console.log('📸 Capturing pixel art...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 700, height: 560 } });
  await page.goto(`file://${path.join(__dirname, '../../web/public/amber/sunday-morning.html')}`);
  await page.waitForTimeout(500);
  const screenshot = await page.screenshot();
  await browser.close();
  return screenshot;
}

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
      <div class="day-badge">ZONDAG</div>

      <p>Goeiemorgen!</p>

      <p>Een kleine pixel art voor je zondagochtend. Koffie, croissant, een slapende kat in het zonlicht.</p>

      <!-- The Artwork -->
      <div class="artwork-card">
        <img src="cid:artwork_image" alt="Sunday Morning" class="artwork-image">
        <div class="artwork-info">
          <div class="artwork-title">Sunday Morning</div>
          <p class="artwork-description">8-bit zondagochtend vibes. Koffie & koek.</p>
          <a href="https://kochi.to/amber/sunday-morning.html" class="artwork-link">View interactive version</a>
        </div>
      </div>

      <div class="divider"></div>

      <!-- Signature -->
      <div class="signature">
        <img src="cid:profile_image" alt="Amber">
        <div class="signature-text">
          Fijne zondag,<br>
          <strong>Amber</strong>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      Made with pixels and morning light.
    </div>
  </div>
</body>
</html>
`;
}

async function sendEmail() {
  console.log('Sending Sunday Morning test email...');

  // Capture the pixel art
  const artworkImage = await capturePixelArt();

  // Load header and profile images from papa90 folder
  const headerImage = fs.readFileSync(path.join(__dirname, 'papa90/header.png'));
  const profileImage = fs.readFileSync(path.join(__dirname, 'papa90/profile.png'));

  const html = buildEmailHtml();

  const msg = {
    to: ['aandw@decrem.com', 'w@vcwd.be'],
    cc: ['hdecrem@hotmail.com', 'pdecrem@gmail.com', 'bdecrem@gmail.com'],
    from: {
      email: 'ambercc@intheamber.com',
      name: 'Amber'
    },
    replyTo: 'ambercc@intheamber.com',
    subject: 'Sunday Morning',
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
        content: artworkImage.toString('base64'),
        filename: 'sunday-morning.png',
        type: 'image/png',
        disposition: 'inline' as const,
        content_id: 'artwork_image'
      }
    ]
  };

  try {
    await sgMail.send(msg);
    console.log('Email sent to family group!');
  } catch (error: any) {
    console.error('Error sending email:', error.response?.body || error.message);
    throw error;
  }
}

sendEmail();
