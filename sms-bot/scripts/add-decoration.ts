import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function addDecoration() {
  const inputPath = path.join(__dirname, '../../drawer/art/amber-day.png');
  const outputPath = path.join(__dirname, '../../drawer/art/amber-day-decorated.png');

  // Create a small amber droplet SVG
  const dropletSvg = `
    <svg width="40" height="52" viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="amberGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#F4C264;stop-opacity:1" />
          <stop offset="50%" style="stop-color:#D4A574;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#B8860B;stop-opacity:1" />
        </linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
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
            stroke-width="1"/>
      <ellipse cx="14" cy="28" rx="4" ry="6" fill="rgba(255,255,255,0.3)" transform="rotate(-20 14 28)"/>
    </svg>
  `;

  // Convert SVG to PNG buffer
  const dropletBuffer = await sharp(Buffer.from(dropletSvg))
    .png()
    .toBuffer();

  // Composite the droplet onto the main image
  // Position it to the right of the character, near shoulder level
  await sharp(inputPath)
    .composite([{
      input: dropletBuffer,
      top: 380,
      left: 680,
    }])
    .png()
    .toFile(outputPath);

  console.log('Saved to:', outputPath);
}

addDecoration().catch(console.error);
