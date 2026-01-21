import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Target dimensions: wide banner (3.5:1 ratio)
const WIDTH = 1200;
const HEIGHT = 340;

async function generateBackground() {
  // Generate background at exact banner dimensions
  const prompt = `A serene dreamy landscape at golden hour, wide panoramic view. Soft rolling amber and golden hills in the foreground, distant purple-blue mountains on the horizon. Warm peachy-orange gradient sky with a few wispy clouds catching the sunset light. Small wildflowers dotting the hillside in gold and orange tones. Painterly illustration style like a Hayao Miyazaki film or children's book. Extremely wide cinematic composition. Warm, inviting, peaceful mood. No characters or figures.`;

  const response = await fetch('https://fal.run/fal-ai/flux-pro/v1.1', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${process.env.FAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: prompt,
      image_size: {
        width: WIDTH,
        height: HEIGHT
      },
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
  const outputPath = path.join(__dirname, '../../drawer/art/amber-header-final.png');

  console.log('Generating background at', WIDTH, 'x', HEIGHT, '...');
  const backgroundBuffer = await generateBackground();

  // Size amber character to fit well in the banner (about 85% of height)
  const amberSize = Math.floor(HEIGHT * 0.85);
  const amberResized = await sharp(amberDayPath)
    .resize(amberSize, amberSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // Create a beautiful amber droplet - larger this time
  const dropletSvg = `
    <svg width="70" height="91" viewBox="0 0 40 52" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="amberGrad" x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" style="stop-color:#FFE4A0;stop-opacity:1" />
          <stop offset="30%" style="stop-color:#F4C264;stop-opacity:1" />
          <stop offset="60%" style="stop-color:#D4A574;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#B8860B;stop-opacity:1" />
        </linearGradient>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="coloredBlur"/>
          <feMerge>
            <feMergeNode in="coloredBlur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <filter id="innerShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feOffset dx="1" dy="2"/>
          <feGaussianBlur stdDeviation="1" result="offset-blur"/>
          <feComposite operator="out" in="SourceGraphic" in2="offset-blur" result="inverse"/>
          <feFlood flood-color="#8B6914" flood-opacity="0.3" result="color"/>
          <feComposite operator="in" in="color" in2="inverse" result="shadow"/>
          <feComposite operator="over" in="shadow" in2="SourceGraphic"/>
        </filter>
      </defs>
      <!-- Main droplet shape -->
      <path d="M20 3 C20 3 5 21 5 31 C5 41 11.5 49 20 49 C28.5 49 35 41 35 31 C35 21 20 3 20 3 Z"
            fill="url(#amberGrad)"
            filter="url(#glow)"/>
      <!-- Outer edge highlight -->
      <path d="M20 3 C20 3 5 21 5 31 C5 41 11.5 49 20 49 C28.5 49 35 41 35 31 C35 21 20 3 20 3 Z"
            fill="none"
            stroke="rgba(255,255,255,0.3)"
            stroke-width="1"/>
      <!-- Main highlight reflection -->
      <ellipse cx="13" cy="26" rx="5" ry="8" fill="rgba(255,255,255,0.4)" transform="rotate(-15 13 26)"/>
      <!-- Small secondary highlight -->
      <ellipse cx="25" cy="38" rx="2" ry="3" fill="rgba(255,255,255,0.2)" transform="rotate(10 25 38)"/>
    </svg>
  `;

  const dropletBuffer = await sharp(Buffer.from(dropletSvg))
    .png()
    .toBuffer();

  // Thoughtful positioning:
  // - Amber character: left third, vertically centered
  // - Droplet: right side, slightly above center, clearly visible

  const amberLeft = Math.floor(WIDTH * 0.12);
  const amberTop = Math.floor((HEIGHT - amberSize) / 2);

  const dropletLeft = Math.floor(WIDTH * 0.82);
  const dropletTop = Math.floor(HEIGHT * 0.35);

  console.log('Compositing...');
  console.log('  Amber:', amberLeft, amberTop, '(size:', amberSize + ')');
  console.log('  Droplet:', dropletLeft, dropletTop);

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
