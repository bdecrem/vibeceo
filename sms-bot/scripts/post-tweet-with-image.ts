/**
 * Post a tweet with an image
 * Run: npx tsx scripts/post-tweet-with-image.ts --account intheamber "tweet text" path/to/image.png
 *
 * IMPORTANT: Account is REQUIRED to prevent accidental posts to wrong account
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const { postTweetWithImage } = await import('../lib/twitter-client.js');

// Accounts that should NEVER be used by automated scripts
const BLOCKED_ACCOUNTS = ['bartdecrem'];

async function main() {
  const args = process.argv.slice(2);

  let account: string | undefined;
  let text: string | undefined;
  let imagePath: string | undefined;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--account' && args[i + 1]) {
      account = args[i + 1];
      i++;
    } else if (!text) {
      text = args[i];
    } else if (!imagePath) {
      imagePath = args[i];
    }
  }

  if (!account || !text || !imagePath) {
    console.error('Usage: npx tsx scripts/post-tweet-with-image.ts --account <account> "tweet text" path/to/image.png');
    console.error('Example: npx tsx scripts/post-tweet-with-image.ts --account intheamber "Hello" ./image.png');
    process.exit(1);
  }

  if (BLOCKED_ACCOUNTS.includes(account.toLowerCase())) {
    console.error(`ERROR: Cannot post to @${account} - this account is blocked for automated posts`);
    process.exit(1);
  }

  console.log(`Posting tweet with image to @${account}...`);
  console.log('Text:', text);
  console.log('Image:', imagePath);
  console.log('---');

  const result = await postTweetWithImage(text, imagePath, account);

  if (result.success) {
    console.log('Tweet posted successfully!');
    console.log('Tweet ID:', result.tweetId);
    console.log('URL:', result.tweetUrl);
  } else {
    console.error('Failed to post tweet:', result.error);
  }
}

main().catch(console.error);
