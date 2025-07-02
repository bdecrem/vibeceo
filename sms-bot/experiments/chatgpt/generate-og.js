import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import OpenAI from 'openai';
import fetch from 'node-fetch';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local in sms-bot root
const envPath = path.join(__dirname, '../../.env.local');
dotenv.config({ path: envPath });

// Verify required environment variables
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not found in environment variables');
  process.exit(1);
}

if (!process.env.HTMLCSS_USER_ID || !process.env.HTMLCSS_API_KEY) {
  console.error('❌ HTMLCSS_USER_ID and HTMLCSS_API_KEY required for HTML to image conversion');
  process.exit(1);
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });


// Step 1: Extract metadata
async function extractMetadata(html) {
  let rawResponse = '';
  try {
    const prompt = `
You're a visual branding assistant for WTAF, a chaotic app/game generator.

You are given the full HTML source of a page. Your job is to classify whether it's an app or a game, and return metadata for generating an OpenGraph preview.

Return only this JSON:
{
  "title": "...",
  "type": "app" or "game",
  "subtext": "...",
  "emoji_mood": ["...", "..."]
}

Be accurate:
- If it contains a <canvas>, score display, or game loop JavaScript → it's a game
- Otherwise it's an app
- For games, the preview should reflect **in-game action**, not menu or intro
---
${html}
---
`;

    const chat = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'gpt-4o',
    });

    rawResponse = chat.choices[0].message.content;

    const jsonMatch = rawResponse.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      rawResponse = jsonMatch[1];
    }

    return JSON.parse(rawResponse);
  } catch (error) {
    console.error('❌ Error extracting metadata:', error.message);
    console.error('❌ Raw response:', rawResponse);
    throw error;
  }
}


// Step 2: Generate OG HTML
async function generateOGHtml(html, metadata) {
  try {
    const { title, type, subtext, emoji_mood } = metadata;

    const prompt = `
You're creating an OpenGraph image (1200x630px) for a WTAF ${type} titled "${title}".

Use the full HTML below as your visual reference.

Instructions:
- Extract and display the main <h1> (e.g. “THE SCRAPPILE”) in a large, centered or eye-catching way
- Look for floating or decorative emojis in the page (e.g. ⚡💀🔥⛓️)

**Go BIG on emojis:**
- Use at least **two emojis** in the design
- They should be at least **2× the size** of the text or visibly dominant
- You can float them, center them, scatter them, or frame the header with them
- They must feel like intentional design elements, not decoration

For apps:
- Make a posterized remix of the layout
- Use the header, emojis, and subtext/CTA to tell the vibe
- Emphasize the original color scheme (e.g. hot pink, black, glitch gradients)

For games:
- Simulate in-game action: paddles, ball, score, glowing chaos

Here’s the full HTML of the page:
---
${html}
---

Return VALID HTML ONLY. No markdown, no backticks, no explanation.
`;

    const chat = await openai.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: 'gpt-4o',
    });

    return chat.choices[0].message.content;
  } catch (error) {
    console.error('❌ Error generating OG HTML:', error.message);
    throw error;
  }
}


// Step 3: Convert HTML to Image via htmlcsstoimage
async function createImageFromHtml(html, filename = 'og-image.png') {
  try {
    const response = await fetch('https://hcti.io/v1/image', {
      method: 'POST',
      headers: {
        Authorization:
          'Basic ' +
          Buffer.from(`${process.env.HTMLCSS_USER_ID}:${process.env.HTMLCSS_API_KEY}`).toString('base64'),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        html,
        google_fonts: 'Space Grotesk',
        viewport_width: '1200',
        viewport_height: '630',
        device_scale: '1',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(`HCTI API error: ${data.error || 'Unknown error'}`);
    }

    const imageUrl = data.url;
    const imageRes = await fetch(imageUrl);
    const buffer = await imageRes.arrayBuffer();

    const outputDir = path.join(__dirname, 'output');
    await fs.mkdir(outputDir, { recursive: true });
    const outputPath = path.join(outputDir, filename);
    await fs.writeFile(outputPath, Buffer.from(buffer));
    console.log(`✅ Saved image to ${outputPath}`);

    // Save image URL for workflow integration
    const urlPath = path.join(__dirname, 'og-image-url.txt');
    await fs.writeFile(urlPath, imageUrl);
    console.log(`✅ Saved image URL to ${urlPath}`);

    return outputPath;
  } catch (error) {
    console.error('❌ Error creating image:', error.message);
    throw error;
  }
}


// Main runner
async function run() {
  try {
    console.log('🚀 Starting OG image generation...');
    console.log(`📍 Loading environment from: ${envPath}`);

    // Allow INPUT_FILE environment variable to override default
    const inputFile = process.env.INPUT_FILE || 'input.html';
    const inputPath = path.join(__dirname, inputFile);
    const html = await fs.readFile(inputPath, 'utf8');
    console.log(`✅ Read ${inputFile} successfully`);

    console.log('🔍 Extracting metadata...');
    const metadata = await extractMetadata(html);
    console.log('📝 Metadata:', metadata);

    const USE_ORIGINAL_HTML_DIRECTLY = false;
    const USE_WRAPPER_OVERLAY = true;

    let ogHtml;

    if (USE_ORIGINAL_HTML_DIRECTLY) {
      console.log('🪄 Skipping GPT layout generation — using original HTML');

      if (USE_WRAPPER_OVERLAY) {
        console.log('🎁 Wrapping original HTML in OG preview container...');
        ogHtml = `
<html>
  <head>
    <link href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&display=swap" rel="stylesheet">
    <style>
      body {
        margin: 0;
        padding: 0;
        background: #0a0a0a;
        display: flex;
        align-items: center;
        justify-content: center;
        height: 630px;
        width: 1200px;
        font-family: 'Space Mono', monospace;
      }
      .og-wrapper {
        padding: 40px;
        border: 2px solid #FFD700;
        box-shadow: 0 0 24px #FFD700;
        border-radius: 12px;
        background: #111;
        color: #FFD700;
        width: 1000px;
        max-height: 90%;
        overflow: hidden;
        text-align: center;
        font-size: 1.25rem;
      }
    </style>
  </head>
  <body>
    <div class="og-wrapper">
      ${html}
    </div>
  </body>
</html>
        `;
      } else {
        ogHtml = html;
      }
    } else {
      console.log('🎨 Generating OG HTML...');
      ogHtml = await generateOGHtml(html, metadata);
    }

    console.log('📸 Converting to image...');
    const filename = `${metadata.title.toLowerCase().replace(/\s+/g, '-')}.png`;
    await createImageFromHtml(ogHtml, filename);

    console.log('✨ OG image generation complete!');
  } catch (error) {
    if (error.code === 'ENOENT' && error.path?.includes('input.html')) {
      console.error('❌ input.html not found. Please create input.html in the same directory.');
    } else {
      console.error('❌ Error:', error.message);
    }
    process.exit(1);
  }
}

run();