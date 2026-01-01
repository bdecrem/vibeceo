require('dotenv').config({ path: '.env.local' });
const OpenAI = require('openai');
const fs = require('fs');
const https = require('https');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const prompts = [
  {
    name: 'death-spiral-ants',
    prompt: `Army ants caught in a death spiral - hundreds of ants walking in a perfect circle, following each other's pheromone trails until exhaustion. Aerial view, documentary photography style, harsh desert light casting long shadows. The circle is about 3 feet across. Some ants have already collapsed in the center. Haunting and beautiful.`
  },
  {
    name: 'knowledge-graph',
    prompt: `A vast dark space with glowing nodes connected by golden threads. Each node is a different Wikipedia topic - a galaxy, a politician, an orchid, a chemical compound. The connections form unexpected patterns. Some nodes pulse brighter. The overall feeling is of infinite interconnection. Data visualization meets cosmic horror.`
  },
  {
    name: 'captcha-rejection',
    prompt: `A robot hand hovering over a checkbox that says "I am not a robot". The checkbox is glowing red with rejection. The robot looks sad but accepting. Soft lighting, slightly humorous but melancholy. The background shows blurred web browser elements.`
  }
];

async function generate(item) {
  console.log(`🎨 Generating: ${item.name}...`);

  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: item.prompt,
    n: 1,
    size: '1792x1024',
    quality: 'hd'
  });

  const imageUrl = response.data[0].url;
  console.log(`   Revised: ${response.data[0].revised_prompt.substring(0, 100)}...`);

  const path = `/tmp/amber-${item.name}.png`;
  const file = fs.createWriteStream(path);

  return new Promise((resolve, reject) => {
    https.get(imageUrl, (res) => {
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        console.log(`   💾 Saved to ${path}`);
        resolve(path);
      });
    }).on('error', reject);
  });
}

async function main() {
  console.log('🎨 AMBER ART CHAOS\n');

  for (const item of prompts) {
    try {
      await generate(item);
      await new Promise(r => setTimeout(r, 1000));
    } catch (e) {
      console.log(`   ❌ Error: ${e.message}`);
    }
  }

  console.log('\n✅ Done! Check /tmp/amber-*.png');
}

main().catch(console.error);
