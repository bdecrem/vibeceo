import OpenAI from 'openai';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config({ path: '.env.local' });

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function main() {
  const prompt = `Abstract digital art visualization: concentric circular wave patterns emanating from a glowing center point. Colors: amber gold (#D4A574, #FFD700) and teal (#2D9596) gradients on pure black background. The waves have an organic, pulsing quality with subtle glow effects. Minimal, elegant, Berlin techno aesthetic. The word "PULSE" subtly visible. Dark, moody, like a visualization of rhythm or heartbeat. No text except possibly "PULSE". 1200x630 aspect ratio optimized.`;

  console.log('Generating OG image for Pulse Wave...');
  
  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: prompt,
    n: 1,
    size: '1792x1024',
    quality: 'standard',
  });

  const imageUrl = response.data[0].url;
  console.log('Generated image URL:', imageUrl);

  // Download the image
  const imageResponse = await fetch(imageUrl!);
  const arrayBuffer = await imageResponse.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const outputPath = path.join(__dirname, '../../web/public/amber/og-pulse-wave.png');
  fs.writeFileSync(outputPath, buffer);
  console.log('Saved to:', outputPath);
}

main().catch(console.error);
