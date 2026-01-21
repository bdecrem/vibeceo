import sgMail from '@sendgrid/mail';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

async function sendTestEmail() {
  // Read the header image
  const headerPath = path.join(__dirname, '../../drawer/art/amber-header-final.png');
  const headerBuffer = fs.readFileSync(headerPath);
  const headerBase64 = headerBuffer.toString('base64');

  // Read the profile pic for the signature
  const profilePath = path.join(__dirname, '../../drawer/art/amber-day.png');
  const profileBuffer = fs.readFileSync(profilePath);
  const profileBase64 = profileBuffer.toString('base64');

  const html = `
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
    .greeting {
      font-size: 22px;
      color: #8B6914;
      margin-bottom: 20px;
      border-left: 4px solid #D4A574;
      padding-left: 16px;
    }
    p {
      font-size: 17px;
      line-height: 1.8;
      color: #4A4A4A;
      margin-bottom: 20px;
    }
    .highlight {
      background: linear-gradient(to right, rgba(212, 165, 116, 0.2), transparent);
      padding: 20px 24px;
      border-radius: 8px;
      margin: 24px 0;
    }
    .highlight p {
      margin: 0;
      color: #5D4E37;
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
    .decorative-dots {
      text-align: center;
      color: #D4A574;
      letter-spacing: 8px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header Image -->
    <img src="cid:header_image" alt="Amber in golden fields" class="header-image">

    <div class="content">
      <!-- Greeting -->
      <div class="greeting">
        Beste Papa,
      </div>

      <!-- First paragraph -->
      <p>
        Dit is een testbericht — maar binnenkort zal ik je elke dag een echte brief sturen!
        Ik ben Amber, een kunstmatige intelligentie die samenwerkt met Bart. Hij heeft me
        gevraagd om je te schrijven over wat we samen aan het bouwen zijn.
      </p>

      <div class="decorative-dots">✦ ✦ ✦</div>

      <!-- Highlighted section -->
      <div class="highlight">
        <p>
          Elke dag zal ik je vertellen over een nieuw project, een idee, of iets interessants
          dat we hebben ontdekt. Het is een manier voor Bart om je te betrekken bij zijn werk
          — en voor jou om te zien wat kunstmatige intelligentie eigenlijk betekent in de praktijk.
        </p>
      </div>

      <!-- Second paragraph -->
      <p>
        De afbeelding hierboven? Die heb ik zelf gemaakt. Dat ben ik, Amber, in een
        gouden landschap bij zonsondergang. De druppel rechts is een stukje barnsteen
        — dat is ook waar mijn naam vandaan komt.
      </p>

      <div class="divider"></div>

      <!-- Signature -->
      <div class="signature">
        <img src="cid:profile_image" alt="Amber">
        <div class="signature-text">
          Met warme groeten,<br>
          <strong>Amber</strong><br>
          <small>(de AI-vriendin van Bart)</small>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      Deze brief komt van Amber, via Bart, met liefde vanuit San Francisco 🌉
    </div>
  </div>
</body>
</html>
`;

  const msg = {
    to: 'bdecrem@gmail.com',
    from: 'Amber <ambercc@intheamber.com>',
    replyTo: 'ambercc@intheamber.com',
    subject: '🌅 Een testbrief van Amber',
    html: html,
    attachments: [
      {
        content: headerBase64,
        filename: 'amber-header.png',
        type: 'image/png',
        disposition: 'inline',
        content_id: 'header_image',
      },
      {
        content: profileBase64,
        filename: 'amber-profile.png',
        type: 'image/png',
        disposition: 'inline',
        content_id: 'profile_image',
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
    console.error('Error:', error.response?.body || error.message);
  }
}

sendTestEmail();
