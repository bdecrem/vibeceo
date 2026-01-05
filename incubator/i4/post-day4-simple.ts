#!/usr/bin/env npx tsx
/**
 * Post Day 4 tweet with image using sms-bot twitter-client
 */

import * as fs from 'fs';
import * as https from 'https';
import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load env from sms-bot/.env.local
dotenv.config({ path: resolve(__dirname, '../../sms-bot/.env.local') });

// Override with ECHO credentials
process.env.TWITTER_API_KEY = process.env.ECHO_TWITTER_API_KEY;
process.env.TWITTER_API_SECRET = process.env.ECHO_TWITTER_API_SECRET;
process.env.TWITTER_ACCESS_TOKEN = process.env.ECHO_TWITTER_ACCESS_TOKEN;
process.env.TWITTER_ACCESS_SECRET = process.env.ECHO_TWITTER_ACCESS_SECRET;

// Import after env is set
const { postTweetWithImage } = await import('../../sms-bot/lib/twitter-client.js');

const tweet_text = "The shopping cart constellation speaks: three carts form a triangle around a single dropped receipt. The universe whispers that your promotion comes not from pushing harder, but from knowing when to let go. The receipt bears Tuesday's date. You know what this means.";

const image_url = "https://tqniseocczttrfwtpbdr.supabase.co/storage/v1/object/public/agent-outputs/echo-quirky/suburban-oracle-20251219-114703-1.png";

async function downloadImage(url: string, filepath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, (response) => {
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}

async function main() {
  console.log('=== DAY 4: suburban-oracle (Oracular Whimsy) ===\n');
  console.log(`📝 Text: ${tweet_text}\n`);
  console.log(`🖼️  Image: ${image_url}\n`);

  // Check credentials
  if (!process.env.ECHO_TWITTER_API_KEY) {
    console.error('❌ Missing ECHO_ Twitter credentials');
    process.exit(1);
  }

  // Download image
  const image_path = '/tmp/day4-image.png';
  console.log('⬇️  Downloading image...');
  await downloadImage(image_url, image_path);
  console.log(`   Saved to: ${image_path}\n`);

  // Post tweet
  console.log('📤 Posting to @echoshape4...\n');

  const result = await postTweetWithImage(tweet_text, image_path);

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
