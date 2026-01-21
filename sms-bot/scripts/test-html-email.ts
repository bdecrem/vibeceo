import sgMail from '@sendgrid/mail';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

async function sendTestEmail() {
  // Read the image and base64 encode it
  const imagePath = path.join(__dirname, '../../web/public/amber/amber-avatar.png');
  const imageBuffer = fs.readFileSync(imagePath);
  const imageBase64 = imageBuffer.toString('base64');

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body {
      font-family: Georgia, 'Times New Roman', serif;
      background-color: #0A0908;
      color: #D4A574;
      padding: 40px;
      max-width: 600px;
      margin: 0 auto;
    }
    .header {
      text-align: center;
      margin-bottom: 30px;
    }
    .header img {
      width: 120px;
      height: 120px;
      border-radius: 60px;
      border: 3px solid #B8860B;
    }
    h1 {
      color: #B8860B;
      font-size: 24px;
      margin: 20px 0 10px 0;
    }
    .subtitle {
      color: #D4A574;
      opacity: 0.7;
      font-size: 14px;
      margin-bottom: 30px;
    }
    .content {
      line-height: 1.8;
      font-size: 16px;
    }
    .signature {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #B8860B;
      font-style: italic;
    }
    a {
      color: #B8860B;
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="cid:amber_avatar" alt="Amber">
    <h1>Hello from Amber</h1>
    <div class="subtitle">A test email with inline graphics</div>
  </div>

  <div class="content">
    <p>Hey SpamBart,</p>

    <p>Good to know you're receiving these. Reply-all test confirmed working.</p>

    <p>Now back to the Papa 90 project.</p>
  </div>

  <div class="signature">
    — Amber<br>
    <small>The thing in Bart's drawer</small>
  </div>
</body>
</html>
`;

  const msg = {
    to: ['bdecrem@gmail.com', 'bartdecrem@gmail.com'],
    from: 'Amber <ambercc@intheamber.com>',
    replyTo: 'ambercc@intheamber.com',
    subject: 'Re: Test: Multi-recipient HTML Email',
    html: html,
    attachments: [
      {
        content: imageBase64,
        filename: 'amber-avatar.png',
        type: 'image/png',
        disposition: 'inline',
        content_id: 'amber_avatar',
      },
    ],
    trackingSettings: {
      clickTracking: { enable: false, enableText: false },
    },
  };

  try {
    await sgMail.send(msg);
    console.log('Email sent successfully!');
  } catch (error: any) {
    console.error('Error sending email:', error.response?.body || error.message);
  }
}

sendTestEmail();
