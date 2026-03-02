/**
 * Post a tweet as @daskollektivrip
 * Usage: npx tsx sms-bot/scripts/kollektive-post.ts "Your tweet text here"
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

import { postTweet } from '../lib/twitter-client.js';

const text = process.argv[2];
if (!text) {
  console.error('Usage: npx tsx sms-bot/scripts/kollektive-post.ts "Your tweet text"');
  process.exit(1);
}

const result = await postTweet(text, { account: 'kollektive' });
if (result.success) {
  console.log(`Tweet posted: ${result.tweetUrl}`);
} else {
  console.error(`Failed: ${result.error}`);
  process.exit(1);
}
