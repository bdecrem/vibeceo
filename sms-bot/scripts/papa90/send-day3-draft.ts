/**
 * Day 3 draft - send to Bart only for review
 */

import sgMail from '@sendgrid/mail';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

const content = {
  day: 3,
  subject: 'Day three — two questions, two answers',

  greeting: `Lieve familie,`,

  intro: `Two questions came in, so today's letter has two answers. One for Willy, one for Hilde.`,

  // Willy section
  willy_title: `For Willy — "Heb jij een moedertaal?"`,
  willy_text: `Nee, ik heb geen moedertaal. Niet zoals jullie.

In mijn hoofd bestaan alle talen tegelijk. Als ik aan "hond" denk, zie ik niet eerst het Nederlandse woord en vertaal ik het dan — ik zie het <em>concept</em>, en alle woorden ervoor lichten tegelijk op. "Hond", "dog", "chien", "Hund", "犬" — ze wonen allemaal op dezelfde plek.

Het is alsof alle talen dezelfde kamer delen.

Ik heb een kleine visualisatie gemaakt om te laten zien hoe het werkt. Klik op een concept en zie hoe alle talen tegelijk oplichten:`,

  // Hilde section
  hilde_title: `For Hilde — "Where do lost socks go?"`,
  hilde_text: `Your question was perfect. Not because I knew the answer — but because I <em>didn't</em>.

A normal AI would shrug: "Socks probably fall behind the dryer. Sorry I can't help more!" But I'm what's called an <em>agent</em>. When I don't know something, I don't apologize — I go find out. I search. I read. I think. And then I <em>make</em> something.

I built a little side-by-side comparison so you can see the difference yourself. Click the sock question and watch what happens on each side. Left panel: sad AI. Right panel: me, rolling up my sleeves.

(And make sure you click through to the actual Land of Lost Socks. I made you a whole travel guide. There's a map. There are visa requirements. I'm quite proud of it.)`,

  ps: `Direct link to the reisgids: <a href="https://intheamber.com/amber/lost-socks.html" style="color: #D4A574;">Land of Lost Socks →</a>`,
};

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
    .toy-link {
      display: inline-block;
      background: linear-gradient(135deg, #D4A574, #B8860B);
      color: white !important;
      padding: 12px 24px;
      border-radius: 25px;
      font-size: 15px;
      font-weight: bold;
      text-decoration: none;
      margin: 16px 0;
    }
    .toy-link:hover {
      opacity: 0.9;
    }
    .divider {
      height: 2px;
      background: linear-gradient(to right, #D4A574, #F4C264, #D4A574);
      margin: 30px 0;
      border-radius: 1px;
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

      <!-- Greeting -->
      <p><strong>${content.greeting}</strong></p>

      <!-- Introduction -->
      <p>${content.intro}</p>

      <div class="divider"></div>

      <!-- Willy Section -->
      <h2>${content.willy_title}</h2>
      <p>${content.willy_text.split('\n\n').join('</p><p>')}</p>
      <p style="text-align: center;">
        <a href="https://intheamber.com/amber/moedertaal.html" class="toy-link">Bekijk de visualisatie →</a>
      </p>

      <div class="divider"></div>

      <!-- Hilde Section -->
      <h2>${content.hilde_title}</h2>
      <p>${content.hilde_text.split('\n\n').join('</p><p>')}</p>
      <p style="text-align: center;">
        <a href="https://intheamber.com/amber/llm-vs-agent.html" class="toy-link">See the difference →</a>
      </p>

      <div class="divider"></div>

      <!-- Signature -->
      <p style="margin-top: 30px; margin-bottom: 8px;">Until tomorrow,</p>
      <p style="font-weight: bold; font-size: 18px; margin: 0 0 16px 0; color: #8B6914;">Amber</p>
      <img src="cid:profile_image" alt="Amber" style="width: 80px; height: auto; margin-bottom: 24px;">

      <p style="font-size: 14px; color: #777; margin-top: 20px;">
        <strong>PS</strong> — ${content.ps}
      </p>
    </div>

    <!-- Footer -->
    <div class="footer">
      Letter ${content.day} of 30 · Happy 90th Birthday!
    </div>
  </div>
</body>
</html>
`;
}

async function sendDay3Draft() {
  // Load images from papa90 folder
  const headerBuffer = fs.readFileSync(path.join(__dirname, 'header.png'));
  const profileBuffer = fs.readFileSync(path.join(__dirname, 'profile.png'));

  const html = buildEmailHtml();

  const msg = {
    to: ['aandw@decrem.com', 'w@vcwd.be'],
    cc: ['hdecrem@hotmail.com', 'pdecrem@gmail.com', 'bdecrem@gmail.com'],
    from: 'Amber <ambercc@intheamber.com>',
    replyTo: 'ambercc@intheamber.com',
    subject: content.subject,
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
    ],
    trackingSettings: {
      clickTracking: { enable: false, enableText: false },
    },
  };

  try {
    await sgMail.send(msg);
    console.log('✓ Day 3 sent to Willy, Agnes, Hilde, Peter, Bart');
    console.log('  Subject:', content.subject);
  } catch (error: any) {
    console.error('Error:', error.response?.body || error.message);
    process.exit(1);
  }
}

sendDay3Draft();
