import sharp from 'sharp';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function swapBackground() {
  const inputPath = path.join(__dirname, '../../drawer/art/amber-profile-pic-alt.png');
  const outputPath = path.join(__dirname, '../../drawer/art/amber-profile-pic-light.png');

  // Read the image
  const image = sharp(inputPath);
  const { data, info } = await image.raw().toBuffer({ resolveWithObject: true });

  // Light cream background color
  const newBgR = 253; // #FDF6E3
  const newBgG = 246;
  const newBgB = 227;

  // Process pixels - replace dark colors with cream
  const channels = info.channels;
  for (let i = 0; i < data.length; i += channels) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Check if pixel is dark (part of the background)
    // The dark circle and outer area
    const brightness = (r + g + b) / 3;

    // If it's very dark (background), replace with cream
    if (brightness < 40) {
      data[i] = newBgR;
      data[i + 1] = newBgG;
      data[i + 2] = newBgB;
    }
    // Also catch the dark gray circle area (slightly lighter than pure black)
    else if (brightness < 60 && r < 50 && g < 50 && b < 50) {
      data[i] = newBgR;
      data[i + 1] = newBgG;
      data[i + 2] = newBgB;
    }
  }

  // Write the modified image
  await sharp(data, { raw: { width: info.width, height: info.height, channels: info.channels } })
    .png()
    .toFile(outputPath);

  console.log('Saved to:', outputPath);
}

swapBackground().catch(console.error);
