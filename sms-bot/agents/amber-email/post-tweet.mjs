#!/usr/bin/env node
/**
 * Post Tweet CLI - Called by amber_sdk_tools.py
 *
 * Usage:
 *   node post-tweet.mjs "Tweet text here"
 *   node post-tweet.mjs --account intheamber "Tweet text here"
 *   node post-tweet.mjs --reply-to 123456789 "Reply text here"
 *
 * Output: JSON with success, tweetId, tweetUrl, or error
 */

import { postTweet } from '../../dist/lib/twitter-client.js';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(JSON.stringify({ success: false, error: 'No tweet text provided' }));
    process.exit(1);
  }

  let account = 'intheamber';  // Default to Amber's account
  let replyTo = undefined;
  let text = '';

  // BLOCKED ACCOUNTS - these should NEVER be used by this script
  const BLOCKED_ACCOUNTS = ['bartdecrem', 'tokentankai'];

  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--account' && args[i + 1]) {
      account = args[i + 1];
      // Safety check: block certain accounts
      if (BLOCKED_ACCOUNTS.includes(account.toLowerCase())) {
        console.log(JSON.stringify({
          success: false,
          error: `BLOCKED: This script cannot post as @${account}. Only @intheamber is allowed.`
        }));
        process.exit(1);
      }
      i++;
    } else if (args[i] === '--reply-to' && args[i + 1]) {
      replyTo = args[i + 1];
      i++;
    } else {
      // Everything else is the tweet text
      text = args.slice(i).join(' ');
      break;
    }
  }

  if (!text) {
    console.log(JSON.stringify({ success: false, error: 'No tweet text provided' }));
    process.exit(1);
  }

  if (text.length > 280) {
    console.log(JSON.stringify({
      success: false,
      error: `Tweet too long: ${text.length} chars (max 280)`
    }));
    process.exit(1);
  }

  try {
    const result = await postTweet(text, { account, replyTo });
    console.log(JSON.stringify(result));
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.log(JSON.stringify({
      success: false,
      error: error.message || 'Unknown error'
    }));
    process.exit(1);
  }
}

main();
