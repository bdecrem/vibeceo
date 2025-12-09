#!/usr/bin/env npx tsx
/**
 * Simple tweet posting script for Arc agent
 * Usage: npx tsx scripts/post-tweet.ts "Tweet text here"
 */

import { config } from 'dotenv';
import path from 'path';

// Load env vars with override to handle stale shell env
config({ path: path.join(import.meta.dirname, '../.env.local'), override: true });

import { postTweet } from '../lib/twitter-client.js';

async function main() {
  const text = process.argv[2];

  if (!text) {
    console.error('Usage: npx tsx scripts/post-tweet.ts "Tweet text"');
    process.exit(1);
  }

  console.log(`[post-tweet] Posting: ${text}`);

  const result = await postTweet(text);

  if (result.success) {
    console.log(`[post-tweet] Success! ${result.tweetUrl}`);
  } else {
    console.error(`[post-tweet] Failed: ${result.error}`);
    process.exit(1);
  }
}

main();
