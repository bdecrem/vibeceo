/**
 * CLI script to post a tweet with multiple images
 * Usage: npx tsx scripts/post-tweet-with-images.ts 'Tweet text' image1.png image2.png ...
 */

import { config } from 'dotenv';
import path from 'path';

// Load .env.local with override to handle stale shell env vars
config({ path: path.join(import.meta.dirname, '../.env.local'), override: true });

import { postTweetWithImages } from '../lib/twitter-client.js';

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error('Usage: npx tsx scripts/post-tweet-with-images.ts "Tweet text" image1.png [image2.png] [image3.png] [image4.png]');
    console.error('Max 4 images allowed.');
    process.exit(1);
  }

  const text = args[0];
  const imagePaths = args.slice(1);

  if (imagePaths.length > 4) {
    console.error(`Error: Too many images (${imagePaths.length}). Max 4 allowed.`);
    process.exit(1);
  }

  console.log(`Posting tweet with ${imagePaths.length} image(s)...`);
  console.log(`Text: "${text}"`);
  console.log(`Images: ${imagePaths.join(', ')}`);

  const result = await postTweetWithImages(text, imagePaths);

  if (result.success) {
    console.log('Tweet posted successfully!');
    console.log(`Tweet ID: ${result.tweetId}`);
    console.log(`URL: ${result.tweetUrl}`);
  } else {
    console.error('Failed to post tweet:', result.error);
    process.exit(1);
  }
}

main();
