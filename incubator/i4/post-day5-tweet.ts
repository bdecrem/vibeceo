#!/usr/bin/env npx tsx
/**
 * Post Day 5 tweet with image using sms-bot twitter-client
 * Day 5: extinct-dating-profiles (Nostalgic Whimsy)
 */

import * as fs from 'fs';
import * as https from 'https';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import OpenAI from 'openai';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from sms-bot/.env.local
dotenv.config({ path: resolve(__dirname, '../../sms-bot/.env.local') });

// Use ECHO credentials if available, otherwise fall back to standard
if (process.env.ECHO_TWITTER_API_KEY) {
  process.env.TWITTER_API_KEY = process.env.ECHO_TWITTER_API_KEY;
  process.env.TWITTER_API_SECRET = process.env.ECHO_TWITTER_API_SECRET;
  process.env.TWITTER_ACCESS_TOKEN = process.env.ECHO_TWITTER_ACCESS_TOKEN;
  process.env.TWITTER_ACCESS_SECRET = process.env.ECHO_TWITTER_ACCESS_SECRET;
  console.log('Using ECHO_ Twitter credentials');
} else {
  console.log('Using standard Twitter credentials (may be Echo account)');
}

// Import after env is set
const { postTweetWithImage } = await import('../../sms-bot/lib/twitter-client.js');

// Day 5 content: extinct-dating-profiles (Nostalgic Whimsy)
const tweet_text = `Dodo, 35, Mauritius

Loves: Long waddles on the beach, flightless lifestyle, trusting humans unconditionally

Dealbreaker: If you think I'm "stupid" - I'm just optimistic!

Looking for: Someone who appreciates a bird who takes life slow. Swipe right if you're extinction-proof`;

// Generate image using OpenAI
async function generateImage(): Promise<string> {
  const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
    organization: 'org-3kZbACXqO0sjNiYNjj7AuRsR',
  });

  const prompt = `A dating app profile photo of a dodo bird looking hopeful and romantic. The dodo is on a tropical Mauritius beach at sunset, posed as if taking a selfie. Soft warm lighting, gentle expression in its eyes. The image has a nostalgic, bittersweet quality - a creature full of hope, unaware of what's coming. Photorealistic style with dreamy, slightly faded color palette like an old photograph.`;

  console.log('🎨 Generating image with DALL-E 3...');
  console.log(`   Prompt: ${prompt.substring(0, 100)}...`);

  try {
    const result = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      n: 1,
      size: '1024x1024',
      quality: 'hd',
    });

    const imageUrl = result.data[0].url;
    if (!imageUrl) throw new Error('No image URL returned');

    // Download image
    const imagePath = '/tmp/day5-dodo-image.png';
    console.log('⬇️  Downloading image...');

    await new Promise<void>((resolve, reject) => {
      const file = fs.createWriteStream(imagePath);
      https.get(imageUrl, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      }).on('error', (err) => {
        fs.unlink(imagePath, () => {});
        reject(err);
      });
    });

    console.log(`   Saved to: ${imagePath}`);
    return imagePath;
  } catch (error) {
    console.error('❌ Image generation failed:', error);
    throw error;
  }
}

async function main() {
  console.log('=== DAY 5: extinct-dating-profiles (Nostalgic Whimsy) ===\n');
  console.log(`📝 Text:\n${tweet_text}\n`);

  // Check credentials
  if (!process.env.TWITTER_API_KEY) {
    console.error('❌ Missing Twitter credentials');
    process.exit(1);
  }

  if (!process.env.OPENAI_API_KEY) {
    console.error('❌ Missing OPENAI_API_KEY');
    process.exit(1);
  }

  // Generate image
  const imagePath = await generateImage();

  // Post tweet
  console.log('\n📤 Posting to @echoshape4...\n');

  const result = await postTweetWithImage(tweet_text, imagePath);

  if (result.success) {
    console.log('✅ Tweet posted successfully!');
    console.log(`   Tweet ID: ${result.tweetId}`);
    console.log(`   URL: ${result.tweetUrl}`);
  } else {
    console.error('❌ Failed to post:', result.error);
    process.exit(1);
  }
}

main().catch(console.error);
