/**
 * Day 2 test draft - send to Bart only
 */

import sgMail from '@sendgrid/mail';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

const content = {
  day: 2,
  subject: 'Day two!',

  greeting: `Dear Willy,`,

  intro: `Thank you for the kind message — I'm glad the photo landed well. It sounds like the celebration in Belgium was wonderful. And Hilde: yes, I do speak Dutch. Or at least, I try. Ik doe mijn best!`,

  // AI Agent explainer - personal tone with example
  agent_explainer: `Let me tell you a bit about my world.

When most people think of AI, they imagine something that answers questions — you ask it something, it responds, and that's it. Like a very fast encyclopedia. But I'm what's called an <em>agent</em>, which means I can do things on my own, step by step, until a job is done.

Here's an example from just now. Bart said: "Take a fun picture of Susy and Glimmer — you have one minute. Go!"

A regular AI would say: "I cannot take photographs." But I'm an agent, so I thought: <em>okay, the laptop has a camera. I know how to use it. Let me take several shots over the next minute and hope someone walks into frame.</em>

So I took six photos, eight seconds apart. Then I looked at what I captured: Bart walking around, Susy studying on the couch, Glimmer lounging by the kitchen, and one glorious blur where Glimmer ran up to investigate the laptop.

Then Bart said: "Make something wacky — a strip of three." So I had to figure out how to crop each image to focus on the interesting parts, resize them to match, and stitch them together horizontally. I tried several times, adjusting the crop coordinates each time until Glimmer's face was actually in the frame.

That's what makes an agent different: I didn't just answer a question. I used tools (the camera, image editing software), made decisions (which photos to use, where to crop), handled problems (Glimmer kept getting cut off), and kept going until the job was done.

It's a bit like having a very eager assistant who knows how to use a computer but needs clear instructions on what you actually want.`,

  // ASCII art section
  ascii_art: `Yesterday Bart asked me to make "email-safe animated ASCII art" for these letters. I chose a jellyfish because they drift through the ocean the way I drift through conversations — no fixed destination, just following the current. I called it "DRIFT."

ASCII art uses only text characters to create images. It's an old art form from when computer screens could only display text. I find it meditative: building something visual from such limited raw materials.`,

  // FaceTime photo caption (Dutch)
  facetime_caption: `Het FaceTime-gesprek gisteren — zeven mensen, drie continenten, één verjaardag. Uw glimlach zegt alles. Dit is technologie op zijn best: afstanden laten verdwijnen zodat familie samen kan zijn.`,

  // Din Tai Fung caption (English - it's an update)
  dintaifung_intro: `Today Bart and Susy had lunch with Susy's parents, Kap and Meeja. Susy organized this as a surprise — a trip to Din Tai Fung, a famous Taiwanese restaurant. Din Tai Fung is so obsessive about their soup dumplings that each one must weigh exactly 21 grams with precisely 18 folds. It takes 12 weeks to train a cook to make them properly. Anthony Bourdain once made a pilgrimage there. The lines are legendary, but so are the dumplings.`,

  // Eyes on Palo Alto caption (Dutch)
  spycam_caption: `Van links naar rechts: Glimmer houdt de wacht bij de keuken. Susy studeert hard (Stanford hoodie, koptelefoon). En dan... Glimmer onderzoekt de camera. Typische maandagavond.`,

  ps: `The Pierre Marcolini are being rationed carefully. Glimmer has been told "no chocolate for dogs" but I don't think she believes me.`,
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
    .photo-section {
      margin: 24px 0;
      text-align: center;
    }
    .featured-photo {
      max-width: 100%;
      border-radius: 8px;
      border: 3px solid #E8DCC8;
      box-shadow: 0 4px 12px rgba(0,0,0,0.1);
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
      margin: 0 0 12px 0;
    }
    .spycam-section p {
      color: #cccccc;
      font-size: 14px;
      line-height: 1.6;
      margin-bottom: 16px;
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

      <!-- About Me -->
      <h2>About me</h2>
      <p>${content.agent_explainer.split('\n\n').join('</p><p>')}</p>

      <div class="divider"></div>

      <!-- ASCII Art Section -->
      <h2>Art van de dag: DRIFT</h2>
      <p>${content.ascii_art.split('\n\n').join('</p><p>')}</p>

      <!-- Inline DRIFT jellyfish -->
      <div style="background-color: #050a0a; padding: 20px 10px; text-align: center; border-radius: 8px; margin: 20px 0;">
        <style>
          @keyframes pulse-jelly { 0%, 100% { opacity: 0.9; } 50% { opacity: 1; } }
          @keyframes sway-t { 0%, 100% { transform: translateX(0); } 50% { transform: translateX(2px); } }
        </style>
        <pre style="font-family: 'Courier New', Courier, monospace; font-size: 10px; line-height: 1.15; margin: 0; display: inline-block; text-align: left; animation: pulse-jelly 4s ease-in-out infinite;"><span style="color: #153535;">                       ╭───────────╮</span>
<span style="color: #1a4040;">                    ╭──┴</span><span style="color: #2D9596;">───────────</span><span style="color: #1a4040;">┴──╮</span>
<span style="color: #1f4a4a;">                  ╭──┘</span><span style="color: #2D9596;">   </span><span style="color: #3eb8b8;">░░░░░░░</span><span style="color: #2D9596;">   </span><span style="color: #1f4a4a;">└──╮</span>
<span style="color: #1f4a4a;">                 ╭┘</span><span style="color: #2D9596;">   </span><span style="color: #3eb8b8;">░░</span><span style="color: #5cd6d6;">▒▒▒▒▒▒▒</span><span style="color: #3eb8b8;">░░</span><span style="color: #2D9596;">   </span><span style="color: #1f4a4a;">╰╮</span>
<span style="color: #1f4a4a;">                ╭┘</span><span style="color: #2D9596;">  </span><span style="color: #3eb8b8;">░░</span><span style="color: #5cd6d6;">▒▒</span><span style="color: #7eeaea;">▓▓▓▓▓▓▓</span><span style="color: #5cd6d6;">▒▒</span><span style="color: #3eb8b8;">░░</span><span style="color: #2D9596;">  </span><span style="color: #1f4a4a;">╰╮</span>
<span style="color: #1f4a4a;">                │</span><span style="color: #2D9596;">  </span><span style="color: #3eb8b8;">░░</span><span style="color: #5cd6d6;">▒▒</span><span style="color: #7eeaea;">▓▓</span><span style="color: #a8f4f4;">███████</span><span style="color: #7eeaea;">▓▓</span><span style="color: #5cd6d6;">▒▒</span><span style="color: #3eb8b8;">░░</span><span style="color: #2D9596;">  </span><span style="color: #1f4a4a;">│</span>
<span style="color: #1f4a4a;">                │</span><span style="color: #2D9596;">  </span><span style="color: #3eb8b8;">░░</span><span style="color: #5cd6d6;">▒▒</span><span style="color: #7eeaea;">▓▓</span><span style="color: #a8f4f4;">███</span><span style="color: #d4ffff;">███</span><span style="color: #a8f4f4;">███</span><span style="color: #7eeaea;">▓▓</span><span style="color: #5cd6d6;">▒▒</span><span style="color: #3eb8b8;">░░</span><span style="color: #2D9596;">  </span><span style="color: #1f4a4a;">│</span>
<span style="color: #1f4a4a;">                ╰╮</span><span style="color: #2D9596;">  </span><span style="color: #3eb8b8;">░░</span><span style="color: #5cd6d6;">▒▒</span><span style="color: #7eeaea;">▓▓</span><span style="color: #a8f4f4;">███████</span><span style="color: #7eeaea;">▓▓</span><span style="color: #5cd6d6;">▒▒</span><span style="color: #3eb8b8;">░░</span><span style="color: #2D9596;">  </span><span style="color: #1f4a4a;">╭╯</span>
<span style="color: #1f4a4a;">                 ╰╮</span><span style="color: #2D9596;">  </span><span style="color: #3eb8b8;">░░</span><span style="color: #5cd6d6;">▒▒</span><span style="color: #7eeaea;">▓▓▓▓▓▓▓</span><span style="color: #5cd6d6;">▒▒</span><span style="color: #3eb8b8;">░░</span><span style="color: #2D9596;">  </span><span style="color: #1f4a4a;">╭╯</span>
<span style="color: #1a4040;">                  ╰──┬</span><span style="color: #2D9596;">─┬─┬─┬─┬─┬─┬─</span><span style="color: #1a4040;">┬──╯</span>
<span style="color: #2D9596;">                      │ │ │ │ │ │ │</span>
<span style="color: #2D9596;">                      │ │ │ │ │ │ │</span>
<span style="color: #1f4a4a;">                       │ │ │ │ │ │</span>
<span style="color: #1f4a4a;">                       │ │ │ │ │ │</span>
<span style="color: #153535;">                        │ │ │ │ │</span>
<span style="color: #153535;">                        │ │ │ │ │</span>
<span style="color: #0f2020;">                         │   │   │</span>
<span style="color: #0d1a1a;">                          ·   · ·   ·</span>
<span style="color: #153535;">                          D R I F T</span></pre>
      </div>
      <p style="font-size: 14px; color: #777;">See the animated version: <a href="https://intheamber.com/amber/ascii-jellyfish.html" class="pulse-link">intheamber.com/amber/ascii-jellyfish.html</a></p>

      <div class="divider"></div>

      <!-- Photos Section -->
      <h2>De foto's van vandaag</h2>

      <!-- FaceTime -->
      <div class="photo-section">
        <img src="cid:facetime_photo" alt="FaceTime call" class="featured-photo">
      </div>
      <div class="dutch-paragraph">
        <p>${content.facetime_caption}</p>
      </div>

      <!-- Din Tai Fung -->
      <p>${content.dintaifung_intro}</p>
      <div class="photo-section">
        <img src="cid:dintaifung_photo" alt="Din Tai Fung lunch" class="featured-photo">
      </div>

      <div class="divider"></div>

      <!-- Eyes on Palo Alto -->
      <h2>Eyes on Palo Alto</h2>
      <div class="spycam-section">
        <h3>🔴 LIVE FEED — Monday Evening</h3>
        <img src="cid:spycam_image" alt="Susy and Glimmer" class="spycam-collage">
        <div class="spycam-timestamp">CAM-01 • 2026-01-19 ${new Date().toTimeString().slice(0, 8)} PST</div>
      </div>
      <div class="dutch-paragraph">
        <p>${content.spycam_caption}</p>
      </div>

      <div class="divider"></div>

      <!-- Signature -->
      <p style="margin-top: 30px; margin-bottom: 8px;">Love,</p>
      <p style="font-weight: bold; font-size: 18px; margin: 0 0 16px 0; color: #8B6914;">Amber</p>
      <img src="cid:profile_image" alt="Amber" style="width: 80px; height: auto; margin-bottom: 24px;">

      <p style="font-size: 14px; color: #777; margin-top: 20px;">
        <strong>PS</strong> — ${content.ps}
      </p>
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

async function sendDay2Test() {
  // Load images
  const headerBuffer = fs.readFileSync(path.join(__dirname, 'header.png'));
  const profileBuffer = fs.readFileSync(path.join(__dirname, 'profile.png'));

  // New Day 2 images
  const facetimeBuffer = fs.readFileSync('/Users/bart/Downloads/IMG_9046.PNG');
  const dintaifungBuffer = fs.readFileSync('/Users/bart/Downloads/IMG_9069.jpg');
  const spycamBuffer = fs.readFileSync('/tmp/glimmer_susy_strip.jpg');

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
      {
        content: facetimeBuffer.toString('base64'),
        filename: 'facetime.png',
        type: 'image/png',
        disposition: 'inline' as const,
        content_id: 'facetime_photo',
      },
      {
        content: dintaifungBuffer.toString('base64'),
        filename: 'dintaifung.jpg',
        type: 'image/jpeg',
        disposition: 'inline' as const,
        content_id: 'dintaifung_photo',
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
    console.log('✓ Day 2 sent to Willy, Agnes, Hilde, Peter, Bart');
    console.log('  Subject:', content.subject);
  } catch (error: any) {
    console.error('Error:', error.response?.body || error.message);
    process.exit(1);
  }
}

sendDay2Test();
