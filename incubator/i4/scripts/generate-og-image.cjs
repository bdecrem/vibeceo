#!/usr/bin/env node
/**
 * Generate OG image collage for Quirky Gallery
 * Uses Puppeteer to screenshot an HTML template
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const IMAGES = [
  'https://tqniseocczttrfwtpbdr.supabase.co/storage/v1/object/public/agent-outputs/echo-quirky/elevator-confessions-20251219-144417-1.png',
  'https://tqniseocczttrfwtpbdr.supabase.co/storage/v1/object/public/agent-outputs/echo-quirky/houseplant-confessions-20251219-141521-2.png',
  'https://tqniseocczttrfwtpbdr.supabase.co/storage/v1/object/public/agent-outputs/echo-quirky/lost-sock-obituaries-20251219-122213-4.png',
];

const HTML = `
<!DOCTYPE html>
<html>
<head>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: 1200px;
      height: 630px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      display: flex;
      overflow: hidden;
    }
    .images {
      flex: 1;
      display: grid;
      grid-template-columns: 1fr 1fr;
      grid-template-rows: 1fr 1fr;
      gap: 8px;
      padding: 20px;
    }
    .img-container {
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
    }
    .img-container:first-child {
      grid-row: span 2;
    }
    .img-container img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .text-panel {
      width: 340px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 40px 30px;
      background: rgba(0,0,0,0.3);
    }
    h1 {
      color: #fff;
      font-size: 42px;
      font-weight: 800;
      line-height: 1.1;
      margin-bottom: 16px;
      text-shadow: 0 2px 20px rgba(0,0,0,0.5);
    }
    .subtitle {
      color: rgba(255,255,255,0.8);
      font-size: 18px;
      line-height: 1.4;
      margin-bottom: 24px;
    }
    .stats {
      color: #4ecdc4;
      font-size: 16px;
      font-weight: 600;
    }
    .by {
      color: rgba(255,255,255,0.5);
      font-size: 14px;
      margin-top: auto;
    }
  </style>
</head>
<body>
  <div class="images">
    <div class="img-container">
      <img src="${IMAGES[0]}" />
    </div>
    <div class="img-container">
      <img src="${IMAGES[1]}" />
    </div>
    <div class="img-container">
      <img src="${IMAGES[2]}" />
    </div>
  </div>
  <div class="text-panel">
    <h1>Quirky Gallery</h1>
    <p class="subtitle">An infinite idea machine. Weird concepts. Weirder images.</p>
    <p class="stats">154 concepts • 770 images</p>
    <p class="by">by Echo • Token Tank</p>
  </div>
</body>
</html>
`;

async function generateOG() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();

  await page.setViewport({ width: 1200, height: 630 });
  await page.setContent(HTML, { waitUntil: 'networkidle0' });

  const outputPath = path.join(__dirname, '../images/og-quirky-gallery.png');

  // Ensure directory exists
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  await page.screenshot({ path: outputPath, type: 'png' });

  await browser.close();

  console.log(`✓ OG image saved to: ${outputPath}`);
  return outputPath;
}

generateOG().catch(console.error);
