/**
 * Papa 90 Day 11: A Letter from 1936
 *
 * A letter written from California on the day Willy was born.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/papa90/send-day11-draft.ts
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

async function sendEmail() {
  console.log('📧 Sending Day 11 DRAFT: A Letter from 1936...');

  // Load images from web/public/amber/
  const amberDir = path.join(__dirname, '../../../web/public/amber');

  const bridgeImage = fs.readFileSync(path.join(amberDir, 'golden-gate-bridge-under-construction-in.png'));
  const streetImage = fs.readFileSync(path.join(amberDir, '1936-california-downtown-street-scene-m.png'));
  const radioImage = fs.readFileSync(path.join(amberDir, 'a-1936-cathedral-style-wooden-radio-sitt.png'));

  // Load header/profile from papa90 folder
  const headerImage = fs.readFileSync(path.join(__dirname, 'header.png'));
  const profileImage = fs.readFileSync(path.join(__dirname, 'profile.png'));

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Special+Elite&family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap');

    body {
      margin: 0;
      padding: 0;
      background-color: #1a1612;
      font-family: Georgia, serif;
    }

    .outer {
      padding: 40px 20px;
    }

    .letter {
      max-width: 600px;
      margin: 0 auto;
      background: linear-gradient(135deg, #f4e4c1 0%, #e8d4a8 50%, #dcc697 100%);
      padding: 50px 40px;
      font-family: 'Playfair Display', Georgia, serif;
      color: #2c2416;
      line-height: 1.8;
    }

    .postmark {
      text-align: right;
      margin-bottom: 20px;
    }

    .postmark-inner {
      display: inline-block;
      border: 2px solid rgba(139, 69, 19, 0.4);
      border-radius: 50%;
      padding: 15px 20px;
      font-family: 'Special Elite', 'Courier New', monospace;
      color: rgba(139, 69, 19, 0.5);
      font-size: 11px;
      text-align: center;
      transform: rotate(12deg);
    }

    .postmark-year {
      font-size: 18px;
      font-weight: bold;
      letter-spacing: 2px;
      display: block;
    }

    .date {
      font-family: 'Special Elite', 'Courier New', monospace;
      font-size: 14px;
      color: #5c4a32;
      margin-bottom: 25px;
      letter-spacing: 1px;
    }

    .greeting {
      font-size: 22px;
      margin-bottom: 20px;
      font-style: italic;
    }

    .intro {
      font-size: 17px;
      margin-bottom: 30px;
      border-left: 3px solid #B8860B;
      padding-left: 18px;
    }

    h2 {
      font-family: 'Special Elite', 'Courier New', monospace;
      font-size: 13px;
      text-transform: uppercase;
      letter-spacing: 3px;
      color: #8B4513;
      margin: 35px 0 18px 0;
      padding-bottom: 8px;
      border-bottom: 1px solid rgba(139, 69, 19, 0.3);
    }

    .photo {
      margin: 20px 0;
      border: 1px solid rgba(139, 69, 19, 0.3);
    }

    .photo img {
      width: 100%;
      display: block;
    }

    .photo-caption {
      background: rgba(0,0,0,0.03);
      padding: 10px 15px;
      font-family: 'Special Elite', 'Courier New', monospace;
      font-size: 11px;
      color: #5c4a32;
      letter-spacing: 1px;
      text-align: center;
    }

    p {
      margin-bottom: 15px;
      font-size: 16px;
    }

    .prices {
      font-family: 'Special Elite', 'Courier New', monospace;
      font-size: 14px;
      line-height: 2;
      color: #5c4a32;
    }

    .radio-section {
      text-align: center;
      margin: 25px 0;
    }

    .radio-section img {
      max-width: 300px;
      border-radius: 8px;
    }

    .radio-label {
      font-family: 'Special Elite', 'Courier New', monospace;
      font-size: 12px;
      color: #8B4513;
      margin-top: 12px;
    }

    .radio-credit {
      font-size: 10px;
      color: #8B4513;
      margin-top: 8px;
      font-style: italic;
    }

    .highlight-box {
      background: rgba(184, 134, 11, 0.1);
      border: 1px solid rgba(184, 134, 11, 0.3);
      padding: 18px 22px;
      margin: 25px 0;
    }

    .fact-table {
      width: 100%;
      margin: 20px 0;
    }

    .fact-table td {
      padding: 10px 5px;
      vertical-align: top;
    }

    .fact-label {
      font-family: 'Special Elite', 'Courier New', monospace;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: #8B4513;
    }

    .fact-value {
      font-size: 15px;
      color: #2c2416;
    }

    .closing {
      margin-top: 40px;
      font-size: 17px;
      font-style: italic;
      line-height: 1.9;
    }

    .signature {
      margin-top: 30px;
      text-align: right;
      font-family: 'Special Elite', 'Courier New', monospace;
      font-size: 12px;
      color: #B8860B;
      letter-spacing: 2px;
    }

    .footer {
      max-width: 600px;
      margin: 20px auto 0;
      text-align: center;
      font-size: 12px;
      color: #9A8B73;
    }

    .listen-note {
      background: #fff8e7;
      border: 1px dashed #d4a574;
      padding: 12px 16px;
      margin: 15px 0;
      font-size: 13px;
      color: #8B4513;
      text-align: center;
    }

    .listen-note a {
      color: #B8860B;
    }
  </style>
</head>
<body>
  <div class="outer">
    <div class="letter">
      <div class="postmark">
        <div class="postmark-inner">
          CALIFORNIA<br>
          <span class="postmark-year">1936</span>
          U.S. MAIL
        </div>
      </div>

      <p class="date">January 18, 1936</p>

      <p class="greeting">My dear Willy,</p>

      <p class="intro">
        You have arrived at last. I write to you from California, where the sun sets gold
        over the Pacific and men are building impossible things. Let me tell you
        what the world looks like on this, your very first day.
      </p>

      <h2>What They're Building</h2>

      <div class="photo">
        <img src="cid:bridge_image" alt="Golden Gate Bridge under construction, 1936">
        <div class="photo-caption">The Golden Gate Bridge — under construction, 1936</div>
      </div>

      <p>
        Out across the bay, they are building a bridge where sensible men said
        no bridge could stand. The currents run swift and cold, the winds howl
        through the Golden Gate like wolves — and yet, day by day, the great towers rise.
        By next year, a fellow might walk clear across to Marin County.
        Imagine that.
      </p>

      <p>
        And across the water, they're building a second marvel — the Bay Bridge,
        stretching toward Oakland. By autumn, they say, you'll be able to motor
        clear across without boarding a ferry. Two bridges in one year.
        What a time to be alive.
      </p>

      <h2>The Streets of California</h2>

      <div class="photo">
        <img src="cid:street_image" alt="California street scene, 1936">
        <div class="photo-caption">California, 1936</div>
      </div>

      <h2>The Cost of Living</h2>

      <div class="prices">
        A gallon of gasoline ............... 10¢<br>
        A picture show .................... 25¢<br>
        A brand new Ford .................. $600<br>
        A modest house .................... $3,500<br>
        Postage for this letter ........... 3¢
      </div>

      <h2>What's on the Radio</h2>

      <div class="radio-section">
        <img src="cid:radio_image" alt="1936 Cathedral Radio">
        <p class="radio-label">♪ The Family Wireless ♪</p>
        <p class="radio-credit">
          "Goody-Goody" — Benny Goodman & His Orchestra, 1936
        </p>
      </div>

      <div class="listen-note">
        🎵 <a href="https://kochi.to/amber/1936.html">Click here to hear what's playing</a> — the radio works!
      </div>

      <p>
        Every evening the family gathers round the wireless to hear Mr. Benny Goodman
        and his orchestra. They call this new sound "swing," and I must confess
        it does make one want to move one's feet. At the picture palace,
        they're showing Chaplin's <em>Modern Times</em> — the little tramp,
        swallowed up by the gears of industry. The children adore Shirley Temple.
        She is eight years old and already the biggest star in Hollywood.
      </p>

      <div class="highlight-box">
        <strong>Meanwhile, in Belgium:</strong> Your countrymen watch the horizon
        with uneasy eyes. King Leopold keeps Belgium neutral, as his father did,
        though the winds from Germany grow stranger by the month. Last year
        Brussels hosted a magnificent World's Fair — you've only just missed it.
        But there will be others, my boy. There will be others.
      </div>

      <h2>What We Cannot Yet Imagine</h2>

      <table class="fact-table">
        <tr>
          <td width="50%">
            <div class="fact-label">Television</div>
            <div class="fact-value">A curious novelty. Perhaps a dozen sets in all of California.</div>
          </td>
          <td width="50%">
            <div class="fact-label">Computers</div>
            <div class="fact-value">A word for the young ladies who do arithmetic at the bank.</div>
          </td>
        </tr>
        <tr>
          <td>
            <div class="fact-label">Jet Engines</div>
            <div class="fact-value">The fanciful dreams of engineers. Nothing practical.</div>
          </td>
          <td>
            <div class="fact-label">Penicillin</div>
            <div class="fact-value">A promising discovery, still years from common use.</div>
          </td>
        </tr>
      </table>

      <div class="closing">
        <p>
          Ninety years hence, someone will read you this letter.
          By then you will have seen the bridges completed, the wars fought and won,
          wonders beyond our present imagination made ordinary as morning coffee.
        </p>
        <p>
          But today you are merely hours old, small and new,
          and all of it waits for you.
        </p>
        <p>
          Happy birthday, dear Willy.<br>
          The first of ninety.
        </p>
      </div>

      <div class="signature">
        SENT FORWARD THROUGH TIME ●
      </div>
    </div>

    <div class="footer">
      Letter 11 of 30 · Happy 90th Birthday! 🎂<br>
      <em>Made with curiosity by Amber</em>
    </div>
  </div>
</body>
</html>
`;

  const msg = {
    to: TO_EMAILS,
    cc: CC_EMAILS,
    from: {
      email: 'ambercc@intheamber.com',
      name: 'Amber'
    },
    replyTo: 'ambercc@intheamber.com',
    subject: 'Day 11: A Letter from 1936',
    html,
    attachments: [
      {
        content: bridgeImage.toString('base64'),
        filename: 'bridge.png',
        type: 'image/png',
        disposition: 'inline' as const,
        content_id: 'bridge_image'
      },
      {
        content: streetImage.toString('base64'),
        filename: 'street.png',
        type: 'image/png',
        disposition: 'inline' as const,
        content_id: 'street_image'
      },
      {
        content: radioImage.toString('base64'),
        filename: 'radio.png',
        type: 'image/png',
        disposition: 'inline' as const,
        content_id: 'radio_image'
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
