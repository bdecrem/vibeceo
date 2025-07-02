import OpenAI from 'openai';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local in project root
const envPath = path.join(__dirname, '../../../.env.local');
dotenv.config({ path: envPath });

// Verify OpenAI API key is loaded
if (!process.env.OPENAI_API_KEY) {
  console.error('❌ OPENAI_API_KEY not found in environment variables');
  console.error('   Make sure .env.local exists in project root with OPENAI_API_KEY');
  process.exit(1);
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function generateVibecodedOGImage() {
  try {
    const htmlPath = path.join(__dirname, 'source.html');
    const html = await fs.readFile(htmlPath, 'utf-8');
    console.log('✅ Read source.html successfully');

    // Extract key visual elements and truncate to fit DALL-E limit
    const htmlSnippet = html.substring(0, 2000) + '...\n[HTML continues with game elements]';
    
    console.log('🎨 Generating vibecoded OG image...');
    const image = await openai.images.generate({
      model: "dall-e-3",
      prompt: `Create an OpenGraph image for a WTAF by AF game - Silicon Valley satire meets chaotic game energy.

HTML SNIPPET:
${htmlSnippet}

VIBECODED OG IMAGE REQUIREMENTS:
1. GAME REPRESENTATION: Show the exact visual elements from the code - neon paddles, ball trails, particles, score display
2. WTAF VIBES: Chaotic startup energy, floating emojis going wild, glitch effects, "VC-funded startup made this while microdosing" energy
3. COMPOSITION: 1200x630, game in center, "WTAF by AF" text overlay, multiverse-style multiple game states
4. SHAREABLE: Make people think "what the hell is this, I need to try it"

For Paddle Clash: Neon paddles mid-battle, ball leaving crazy trails, score "69-420", particles forming startup buzzwords, background glitching between meeting rooms and game world.

Style: Accurate game screenshot meets fever dream meets startup meme. Professional but unhinged.`,
      size: "1792x1024",
      quality: "hd",
      style: "vivid"
    });

    const imageUrl = image.data[0].url;
    console.log('✨ Vibecoded OG image generated!');
    console.log('🔗 Image URL:', imageUrl);

    await fs.writeFile(
      path.join(__dirname, 'og-image-url.txt'), 
      imageUrl, 
      'utf-8'
    );
    console.log('💾 Saved URL to og-image-url.txt');

    return imageUrl;

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Run it
console.log('🚀 Starting vibecoded OG image generation...');
console.log(`📍 Loading environment from: ${envPath}`);
generateVibecodedOGImage();