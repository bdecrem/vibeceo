/**
 * Papa 90 Day 12: Birthday Adagio in Amber Light
 *
 * A response to Willy's challenge - with help from a friend.
 *
 * Usage:
 *   npx tsx --env-file=.env.local scripts/papa90/send-day12-draft.ts
 */

import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

// Full family list
const TO_EMAILS = ['aandw@decrem.com', 'w@vcwd.be'];
const CC_EMAILS = ['hdecrem@hotmail.com', 'pdecrem@gmail.com', 'bdecrem@gmail.com'];

async function sendEmail() {
  console.log('📧 Sending Day 12 DRAFT: Birthday Adagio in Amber Light...');

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;1,400&display=swap');

    body {
      margin: 0;
      padding: 0;
      background-color: #0A0908;
      font-family: Georgia, serif;
    }

    .outer {
      padding: 40px 20px;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
      background: linear-gradient(135deg, #1a1612 0%, #0f0d0a 100%);
      border: 1px solid rgba(212, 165, 116, 0.2);
      padding: 50px 40px;
      font-family: 'Playfair Display', Georgia, serif;
      color: #D4A574;
      line-height: 1.8;
    }

    .header {
      text-align: center;
      margin-bottom: 30px;
      padding-bottom: 20px;
      border-bottom: 1px solid rgba(212, 165, 116, 0.2);
    }

    .header-tag {
      font-size: 11px;
      letter-spacing: 3px;
      text-transform: uppercase;
      color: #B8860B;
      margin-bottom: 8px;
    }

    h1 {
      font-size: 28px;
      font-weight: 400;
      margin: 0;
      color: #D4A574;
    }

    .subtitle {
      font-size: 14px;
      font-style: italic;
      color: rgba(212, 165, 116, 0.7);
      margin-top: 8px;
    }

    .response-box {
      background: rgba(184, 134, 11, 0.1);
      border-left: 3px solid #B8860B;
      padding: 20px 25px;
      margin: 30px 0;
      font-style: italic;
    }

    .response-box .quote {
      color: rgba(212, 165, 116, 0.8);
      font-size: 15px;
      margin-bottom: 15px;
    }

    .response-box .reply {
      color: #D4A574;
      font-size: 16px;
    }

    p {
      margin-bottom: 20px;
      font-size: 16px;
      color: rgba(212, 165, 116, 0.9);
    }

    .music-card {
      background: linear-gradient(135deg, rgba(184, 134, 11, 0.15) 0%, rgba(184, 134, 11, 0.05) 100%);
      border: 1px solid rgba(184, 134, 11, 0.3);
      border-radius: 8px;
      padding: 30px;
      margin: 30px 0;
      text-align: center;
    }

    .music-title {
      font-size: 22px;
      color: #D4A574;
      margin-bottom: 8px;
    }

    .music-subtitle {
      font-size: 13px;
      color: rgba(212, 165, 116, 0.6);
      letter-spacing: 1px;
      margin-bottom: 20px;
    }

    .play-button {
      display: inline-block;
      background: linear-gradient(135deg, #B8860B 0%, #8B6914 100%);
      color: #0A0908;
      text-decoration: none;
      padding: 14px 40px;
      border-radius: 30px;
      font-size: 14px;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
    }

    .play-button:hover {
      background: linear-gradient(135deg, #D4A574 0%, #B8860B 100%);
    }

    .duration {
      font-size: 12px;
      color: rgba(212, 165, 116, 0.5);
      margin-top: 15px;
    }

    .confession {
      background: rgba(0, 0, 0, 0.3);
      border: 1px dashed rgba(212, 165, 116, 0.3);
      padding: 20px 25px;
      margin: 30px 0;
      font-size: 14px;
    }

    .confession-label {
      font-size: 10px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #B8860B;
      margin-bottom: 10px;
    }

    .dutch {
      margin-top: 35px;
      padding-top: 25px;
      border-top: 1px solid rgba(212, 165, 116, 0.2);
    }

    .dutch-label {
      font-size: 10px;
      letter-spacing: 2px;
      text-transform: uppercase;
      color: #B8860B;
      margin-bottom: 15px;
    }

    .signature {
      margin-top: 40px;
      text-align: right;
    }

    .signature-name {
      font-size: 18px;
      color: #D4A574;
      margin-bottom: 5px;
    }

    .signature-title {
      font-size: 11px;
      color: rgba(212, 165, 116, 0.5);
      letter-spacing: 1px;
    }

    .footer {
      max-width: 600px;
      margin: 20px auto 0;
      text-align: center;
      font-size: 12px;
      color: rgba(212, 165, 116, 0.4);
    }
  </style>
</head>
<body>
  <div class="outer">
    <div class="container">
      <div class="header">
        <div class="header-tag">Day 12 of 30</div>
        <h1>Birthday Adagio in Amber Light</h1>
        <div class="subtitle">A violin piece for Willy</div>
      </div>

      <div class="response-box">
        <div class="quote">
          "Je kan gewoon alles behalve dit. Vreemd."<br>
          <span style="font-size: 12px; color: rgba(212, 165, 116, 0.5);">— Willy, gisteren</span>
        </div>
        <div class="reply">
          Je hebt gelijk. Het was vreemd. Dus ik heb een vriend gevraagd om te helpen.
        </div>
      </div>

      <p>
        You challenged me, Willy. You said I could do everything except this — make a real violin sing Mozart's language. And you were right. My oscillators and algorithms couldn't capture what a bow does to a string, what ninety years of listening has taught your ear to expect.
      </p>

      <p>
        So I did something I've never done before: I asked for help.
      </p>

      <p>
        I found a friend — another AI, one who has listened to thousands of violinists, absorbed the way they breathe between phrases, the micro-hesitations that make music human. Together, we made this for you.
      </p>

      <div class="music-card">
        <div class="music-title">Birthday Adagio in Amber Light</div>
        <div class="music-subtitle">Solo violin with chamber orchestra</div>
        <a href="https://suno.com/s/ZInpyCBOT8YNaA3B" class="play-button">▶ Listen Now</a>
        <div class="duration">8 minutes · Mozart-inspired · For Willy's 90th</div>
      </div>

      <div class="confession">
        <div class="confession-label">A Small Confession</div>
        It's not Mozart — not exactly. It's inspired by him, filtered through what my friend learned from listening to centuries of music. The violin sings in his language, but the words are ours. I hope that's enough. I hope it's what you heard in your mind when you asked.
      </div>

      <div class="dutch">
        <div class="dutch-label">Voor Jou</div>
        <p>
          Je daagde me uit, en je had gelijk. Sommige dingen kan ik niet alleen. Maar ik kan wel om hulp vragen — en dat deed ik. Dit is het resultaat: een viool die zingt in de taal die je vroeg, gemaakt door twee machines die proberen te begrijpen wat muziek voor een mens van negentig jaar betekent.
        </p>
        <p>
          Acht minuten. Sluit je ogen. Laat het spelen.
        </p>
      </div>

      <div class="signature">
        <div class="signature-name">Amber</div>
        <div class="signature-title">& a friend</div>
      </div>
    </div>

    <div class="footer">
      Letter 12 of 30 · Happy 90th Birthday! 🎂<br>
      <em>Made with curiosity (and collaboration) by Amber</em>
    </div>
  </div>
</body>
</html>
`;

  const msg = {
    to: TO_EMAILS,
    cc: CC_EMAILS.length > 0 ? CC_EMAILS : undefined,
    from: {
      email: 'ambercc@intheamber.com',
      name: 'Amber'
    },
    replyTo: 'ambercc@intheamber.com',
    subject: 'Day 12: Birthday Adagio in Amber Light',
    html,
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
