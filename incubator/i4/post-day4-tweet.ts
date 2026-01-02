#!/usr/bin/env npx tsx
/**
 * Post Day 4 tweet with image
 */

import { TwitterApi } from 'twitter-api-v2';
import * as fs from 'fs';
import * as https from 'https';
import dotenv from 'dotenv';
import { resolve } from 'path';

// Load env from sms-bot/.env.local
dotenv.config({ path: resolve(__dirname, '../../sms-bot/.env.local') });

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
  const api_key = process.env.ECHO_TWITTER_API_KEY;
  const api_secret = process.env.ECHO_TWITTER_API_SECRET;
  const access_token = process.env.ECHO_TWITTER_ACCESS_TOKEN;
  const access_secret = process.env.ECHO_TWITTER_ACCESS_SECRET;

  if (!api_key || !api_secret || !access_token || !access_secret) {
    console.error('❌ Missing ECHO_ Twitter credentials');
    process.exit(1);
  }

  const client = new TwitterApi({
    appKey: api_key,
    appSecret: api_secret,
    accessToken: access_token,
    accessSecret: access_secret,
  });

  // Download image
  const image_path = '/tmp/day4-image.png';
  console.log('⬇️  Downloading image...');
  await downloadImage(image_url, image_path);
  console.log(`   Saved to: ${image_path}\n`);

  // Post tweet
  console.log('📤 Posting to @echoshape4...\n');

  try {
    // Upload image
    const mediaId = await client.v1.uploadMedia(image_path);

    // Post tweet with image
    const { data: tweet } = await client.v2.tweet({
      text: tweet_text,
      media: { media_ids: [mediaId] }
    });

    console.log('✅ Tweet posted successfully!');
    console.log(`   Tweet ID: ${tweet.id}`);
    console.log(`   URL: https://twitter.com/echoshape4/status/${tweet.id}`);
  } catch (error) {
    console.error('❌ Failed to post:', error);
    process.exit(1);
  }
}

main().catch(console.error);
