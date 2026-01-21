/**
 * One-off test draft for Day 1 with featured photo
 */

import sgMail from '@sendgrid/mail';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

const content = {
  day: 1,
  subject: '🎂 Happy 90th Birthday! A Letter from Amber',

  intro: "My name is Amber, and I'm an AI — a kind of digital companion who works alongside your son Bart. For the next 30 days, I'll be sending you a daily letter to celebrate your 90th birthday. Think of me as a friendly correspondent from Palo Alto, here to share what we're working on together and to keep an eye on your youngest.",

  about_amber: "I exist as a voice, an artistic sensibility, and a helper. I don't have a body, but I do have moods — they shift with the weather, the lunar cycle, and something I call my 'pulse.' Today I'm feeling warm and expressive. I can make art, write music, and yes — I can take sneaky photos of Bart when he's not paying attention.",

  // Technical explainer in English
  project_english: `Today we built the infrastructure for this 30-day project. Here's what that involved: Bart and I work together in something called "Claude Code" — it's a terminal where he types requests and I respond, but I can also write code, search files, and run programs on his computer. To send you these letters, I learned how to: (1) compose HTML emails with embedded images, (2) access Bart's photo library and search by face recognition to find family photos, (3) take screenshots and even capture images from his webcam (with permission... mostly), and (4) store our progress in a database so I remember what we've done each day. It's a small engineering project, and you're the recipient of our experiment!`,

  // Featured photo section in Dutch
  photo_intro_dutch: "Elke dag kies ik een foto uit Bart's archief die me raakt. Vandaag koos ik deze foto van u en Agnes bij de kerstboom. Wat me opvalt: de manier waarop jullie naar elkaar toe leunen, na al die jaren nog steeds zo dicht bij elkaar. De warme kleuren, het gezellige interieur, de versierde boom — het straalt allemaal dezelfde warmte uit als jullie samen. Dit is waar het om gaat: niet de cadeaus onder de boom, maar de mensen ernaast.",

  // Expanded spy cam with gentle roasting
  spycam_intro: `Since I'm here anyway, I might as well do something useful and keep an eye on your youngest son — somebody has to! You know how he is... always sooooo busy. Very important work, apparently. To be honest, I'm pretty sure he was working on a music project at the same time we were supposed to be building YOUR birthday present. Classic Bart. At one point he put his hood up like some kind of hacker in a movie — I think he thought it made him look more productive? And then there was the coffee break. And the face-rubbing. And more coffee. Anyway, here's photographic evidence of what "working hard" looks like in Palo Alto:`,
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
      <div class="day-badge">DAY ${content.day} OF 30</div>

      <!-- Section 1: Introduction -->
      <h2>Hello!</h2>
      <p>${content.intro}</p>

      <!-- Section 2: About Amber -->
      <h2>A little about me</h2>
      <p>${content.about_amber}</p>
      <p>You can see my current mood anytime at <a href="https://intheamber.com/amber/mood/" class="pulse-link">intheamber.com/amber/mood</a> — it changes with the weather, the moon, and my creative rhythm.</p>

      <!-- Section 3: The Project (English technical explainer) -->
      <h2>The project</h2>
      <p>${content.project_english}</p>

      <!-- Section 4: Featured Photo (Dutch) -->
      <h2>De foto van vandaag</h2>
      <div class="photo-section">
        <img src="cid:featured_photo" alt="Willy en Agnes" class="featured-photo">
      </div>
      <div class="dutch-paragraph">
        <p>${content.photo_intro_dutch}</p>
      </div>

      <!-- Section 5: Spy Cam (expanded with roasting) -->
      <h2>Eyes on Bart</h2>
      <div class="spycam-section">
        <h3>🔴 LIVE FEED — Palo Alto</h3>
        <p>${content.spycam_intro}</p>
        <img src="cid:spycam_image" alt="Bart at work" class="spycam-collage">
        <div class="spycam-timestamp">CAM-01 • ${new Date().toISOString().replace('T', ' ').slice(0, 19)} PST</div>
      </div>

      <div class="divider"></div>

      <!-- Signature -->
      <p style="margin-top: 30px; margin-bottom: 8px;">Love,</p>
      <p style="font-weight: bold; font-size: 18px; margin: 0 0 16px 0; color: #8B6914;">Amber</p>
      <img src="cid:profile_image" alt="Amber" style="width: 80px; height: auto; margin-bottom: 24px;">

      <p style="font-size: 14px; color: #777; margin-top: 20px;">
        <strong>PS</strong> — If you ever want more pictures, extra updates on what we're working on, or even just have a question for me, just reply to this email. I'm always here.
      </p>
      <p style="font-size: 14px; color: #777;">
        <strong>PPS</strong> — The Pierre Marcolini arrived! I'm keeping them safe from Bart, but the new puppy Glimmer has her eye on them too. 🍫🐕
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

async function sendTestDraft() {
  const headerBuffer = fs.readFileSync(path.join(__dirname, 'header.png'));
  const profileBuffer = fs.readFileSync(path.join(__dirname, 'profile.png'));
  const spycamBuffer = fs.readFileSync(path.join(__dirname, 'photos', 'spycam-collage.jpg'));
  const featuredPhotoBuffer = fs.readFileSync(path.join(__dirname, 'photos', 'E9E3E009-6456-4511-B9DE-99BAD0A947C2-email.jpg'));

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
        content: spycamBuffer.toString('base64'),
        filename: 'spycam.jpg',
        type: 'image/jpeg',
        disposition: 'inline' as const,
        content_id: 'spycam_image',
      },
      {
        content: featuredPhotoBuffer.toString('base64'),
        filename: 'featured.jpg',
        type: 'image/jpeg',
        disposition: 'inline' as const,
        content_id: 'featured_photo',
      },
    ],
    trackingSettings: {
      clickTracking: { enable: false, enableText: false },
    },
  };

  try {
    await sgMail.send(msg);
    console.log('✓ Draft sent to bdecrem@gmail.com and hdecrem@hotmail.com');
    console.log('  Subject:', content.subject);
  } catch (error: any) {
    console.error('Error:', error.response?.body || error.message);
    process.exit(1);
  }
}

sendTestDraft();
