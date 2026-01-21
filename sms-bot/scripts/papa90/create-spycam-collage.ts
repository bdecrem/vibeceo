import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function createSpyCamCollage() {
  // Pick 4 varied shots for the collage
  const shots = [
    '/Users/bart/Desktop/spycam-3.jpg',  // gesture
    '/Users/bart/Desktop/spycam-5.jpg',  // face rub
    '/Users/bart/Desktop/spycam-6.jpg',  // coffee
    '/Users/bart/Desktop/spycam-8.jpg',  // hoodie
  ];

  // Resize each to small thumbnails (200x150) with slight grain/contrast for surveillance look
  const thumbs: Buffer[] = [];
  for (const shot of shots) {
    const thumb = await sharp(shot)
      .resize(240, 180, { fit: 'cover' })
      .modulate({ brightness: 0.95 })  // slightly darker
      .sharpen({ sigma: 0.5 })  // slight grain effect
      .jpeg({ quality: 70 })  // lower quality for surveillance vibe
      .toBuffer();
    thumbs.push(thumb);
  }

  // Create 2x2 grid with small gaps
  const gap = 4;
  const thumbW = 240;
  const thumbH = 180;
  const collageW = thumbW * 2 + gap;
  const collageH = thumbH * 2 + gap;

  const collage = await sharp({
    create: {
      width: collageW,
      height: collageH,
      channels: 3,
      background: { r: 30, g: 30, b: 30 }  // dark background
    }
  })
  .composite([
    { input: thumbs[0], left: 0, top: 0 },
    { input: thumbs[1], left: thumbW + gap, top: 0 },
    { input: thumbs[2], left: 0, top: thumbH + gap },
    { input: thumbs[3], left: thumbW + gap, top: thumbH + gap },
  ])
  .jpeg({ quality: 85 })
  .toFile(path.join(__dirname, 'photos', 'spycam-collage.jpg'));

  console.log('Created spycam-collage.jpg:', collageW + 'x' + collageH);
}

createSpyCamCollage();
