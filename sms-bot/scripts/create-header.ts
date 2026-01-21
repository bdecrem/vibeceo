import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateBackground() {
  // Generate a whimsical background scene using fal.ai
  const prompt = `A dreamy whimsical landscape at golden hour. Rolling amber-colored hills with soft grass, a warm peachy-orange sunset sky with scattered fluffy clouds. Small glowing amber crystals float gently in the air. Soft, painterly illustration style like a children's book. Warm color palette: golden yellows, soft oranges, cream, hints of teal. No characters, just the landscape. Wide panoramic view.`;

  const response = await fetch('https://fal.run/fal-ai/flux-pro/v1.1', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${process.env.FAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: prompt,
      image_size: 'landscape_16_9',
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1
    }),
  });

  const result = await response.json();
  console.log('Background generated');

  if (result.images && result.images[0]) {
    const imageResponse = await fetch(result.images[0].url);
    const arrayBuffer = await imageResponse.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
  throw new Error('Failed to generate background');
}

async function createHeader() {
  const amberDayPath = path.join(__dirname, '../../drawer/art/amber-day.png');
  const outputPath = path.join(__dirname, '../../drawer/art/amber-header.png');

  console.log('Generating background...');
  const backgroundBuffer = await generateBackground();

  // Get background dimensions
  const bgMeta = await sharp(backgroundBuffer).metadata();
  console.log(`Background: ${bgMeta.width}x${bgMeta.height}`);

  // Resize amber-day to fit nicely in the header (about 1/3 height)
  const amberSize = Math.floor(bgMeta.height! * 0.7);
  const amberResized = await sharp(amberDayPath)
    .resize(amberSize, amberSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // Create the amber droplet SVG (larger for the header)
  const dropletSvg = `
    <svg width="60" height="78" viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#F4C264;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#D4A574;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#B8860B;stop-opacity:1" />
        </linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
      <path d="M20 2 C20 2 4 22 4 32 C4 42 11 50 20 50 C29 50 36 42 36 32 C36 22 20 2 20 2 Z"
            fill="url(#amberGrad)"
            filter="url(#glow)"
            stroke="#B8860B"
            stroke-width="1.5"/>
      <ellipse cx="14" cy="28" rx="5" ry="7" fill="rgba(255,255,255,0.35)" transform="rotate(-20 14 28)"/>
    </svg>
  `;

  const dropletBuffer = await sharp(Buffer.from(dropletSvg))
    .png()
    .toBuffer();

  // Composite everything together
  // Position amber character on the left side
  const amberLeft = Math.floor(bgMeta.width! * 0.08);
  const amberTop = Math.floor((bgMeta.height! - amberSize) / 2);

  // Position droplet floating in the upper right area
  const dropletLeft = Math.floor(bgMeta.width! * 0.75);
  const dropletTop = Math.floor(bgMeta.height! * 0.2);

  await sharp(backgroundBuffer)
    .composite([
      {
        input: amberResized,
        top: amberTop,
        left: amberLeft,
      },
      {
        input: dropletBuffer,
        top: dropletTop,
        left: dropletLeft,
      }
    ])
    .png()
    .toFile(outputPath);

  console.log('Saved to:', outputPath);
}

createHeader().catch(console.error);
