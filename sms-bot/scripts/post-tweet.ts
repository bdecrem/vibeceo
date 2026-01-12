#!/usr/bin/env npx tsx
/**
 * Simple tweet posting script
 * Usage: npx tsx scripts/post-tweet.ts --account intheamber "Tweet text here"
 *
 * IMPORTANT: Account is REQUIRED to prevent accidental posts to wrong account
 */

import { config } from 'dotenv';
import path from 'path';

// Load env vars with override to handle stale shell env
config({ path: path.join(import.meta.dirname, '../.env.local'), override: true });

import { postTweet } from '../lib/twitter-client.js';

// Accounts that should NEVER be used by automated scripts
const BLOCKED_ACCOUNTS = ['bartdecrem'];

async function main() {
  const args = process.argv.slice(2);

  let account: string | undefined;
  let text: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--account' && args[i + 1]) {
      account = args[i + 1];
      i++;
    } else if (!text) {
      text = args[i];
    }
  }

  if (!account || !text) {
    console.error('Usage: npx tsx scripts/post-tweet.ts --account <account> "Tweet text"');
    console.error('Example: npx tsx scripts/post-tweet.ts --account intheamber "Hello world"');
    process.exit(1);
  }

  if (BLOCKED_ACCOUNTS.includes(account.toLowerCase())) {
    console.error(`ERROR: Cannot post to @${account} - this account is blocked for automated posts`);
    process.exit(1);
  }

  console.log(`[post-tweet] Posting to @${account}: ${text}`);

  const result = await postTweet(text, { account });

  if (result.success) {
    console.log(`[post-tweet] Success! ${result.tweetUrl}`);
  } else {
    console.error(`[post-tweet] Failed: ${result.error}`);
    process.exit(1);
  }
}

main();
