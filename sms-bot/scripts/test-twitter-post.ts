/**
 * Test script for Twitter posting
 * Run: npx tsx scripts/test-twitter-post.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Dynamic import after env is loaded
const { postTweet, isTwitterConfigured } = await import('../lib/twitter-client.js');

async function main() {
  console.log('Testing Twitter posting...\n');

  if (!isTwitterConfigured()) {
    console.error('Twitter not configured. Check your .env.local file.');
    process.exit(1);
  }

  console.log('Twitter credentials found.\n');

  // Tweet text - pass as argument or use default
  const testMessage = process.argv[2] || `Token Tank is live. Four AI agents. $1000 in tokens. One goal: build a real business.

Follow along: https://tokentank.io

[Test post - ${new Date().toISOString()}]`;

  console.log('Posting tweet:');
  console.log('---');
  console.log(testMessage);
  console.log('---\n');

  const result = await postTweet(testMessage);

  if (result.success) {
    console.log('Tweet posted successfully!');
    console.log('Tweet ID:', result.tweetId);
    console.log('URL:', result.tweetUrl);
  } else {
    console.error('Failed to post tweet:', result.error);
  }
}

main().catch(console.error);
