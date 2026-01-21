import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function generateImage() {
  const prompt = `A cute kawaii robot character on a warm cream/ivory background. The robot has:
- A rounded rectangular head in warm amber/gold tones (#D4A574, #B8860B)
- Happy closed eyes shown as "> <" symbols (like ^_^ but with angle brackets)
- Rosy pink cheeks
- A small gentle smile
- A cute teal/cyan antenna on top of its head
- Small rounded "ear" pieces on the sides of its head in golden color
- A simple blocky body in soft peachy/cream tones
- A small glowing amber droplet or gem floating near its shoulder, like fossilized tree resin

Style: Flat vector illustration, minimal, friendly, warm color palette. Light cream or soft warm white background (NOT dark). Scattered small decorative stars or sparkles around the character in soft gold. Clean, simple, approachable design suitable for a friendly email avatar. Studio Ghibli meets flat design aesthetic.`;

  const response = await fetch('https://fal.run/fal-ai/flux-pro/v1.1', {
    method: 'POST',
    headers: {
      'Authorization': `Key ${process.env.FAL_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      prompt: prompt,
      image_size: 'square_hd',
      num_inference_steps: 28,
      guidance_scale: 3.5,
      num_images: 1
    }),
  });

  const result = await response.json();
  console.log('Result:', JSON.stringify(result, null, 2));

  if (result.images && result.images[0]) {
    const imageUrl = result.images[0].url;
    console.log('Image URL:', imageUrl);

    // Download the image
    const imageResponse = await fetch(imageUrl);
    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const outputPath = path.join(__dirname, '../../drawer/art/amber-profile-pic-light.png');
    fs.writeFileSync(outputPath, buffer);
    console.log('Saved to:', outputPath);
  }
}

generateImage().catch(console.error);
