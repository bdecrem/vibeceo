require('dotenv').config({ path: '.env.local' });
const OpenAI = require('openai');
const fs = require('fs');
const https = require('https');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

async function generateArt() {
  console.log('🎨 Generating rabbit hole art...');

  const prompt = `Abstract visualization of falling down a Wikipedia rabbit hole:
Golden glowing threads connecting floating text fragments in a vast dark void.
Amber light pulses at each connection point. Words like "orchid", "pest control", "chaos theory"
drift past. The viewer is falling through interconnected knowledge.
Painterly, dreamlike, slightly vertiginous. Dark background with warm amber highlights.`;

  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: prompt,
    n: 1,
    size: '1792x1024',
    quality: 'hd'
  });

  const imageUrl = response.data[0].url;
  console.log('✨ Generated! Downloading...');
  console.log('Revised prompt:', response.data[0].revised_prompt);

  // Download the image
  const file = fs.createWriteStream('/tmp/amber-rabbithole-art.png');
  https.get(imageUrl, (res) => {
    res.pipe(file);
    file.on('finish', () => {
      file.close();
      console.log('💾 Saved to /tmp/amber-rabbithole-art.png');
    });
  });
}

generateArt().catch(console.error);
