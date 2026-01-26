/**
 * Twitter posting script with multi-account support
 *
 * Usage:
 *   npx tsx scripts/test-twitter-post.ts <account> "<tweet text>" [image_path]
 *
 * Examples:
 *   npx tsx scripts/test-twitter-post.ts intheamber "Hello world"
 *   npx tsx scripts/test-twitter-post.ts tokentank "New update!" ./image.png
 *   npx tsx scripts/test-twitter-post.ts intheamber "5 ❤️ and this drops" /path/to/signal.png
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const { postTweet, postTweetWithImage, isTwitterConfigured } = await import('../lib/twitter-client.js');

async function main() {
  const account = process.argv[2];
  const tweetText = process.argv[3];
  const imagePath = process.argv[4];

  // Validate account
  if (!account || !['intheamber', 'tokentank'].includes(account.toLowerCase())) {
    console.error('Usage: npx tsx scripts/test-twitter-post.ts <account> "<tweet text>" [image_path]');
    console.error('');
    console.error('Accounts: intheamber, tokentank');
    console.error('');
    console.error('Examples:');
    console.error('  npx tsx scripts/test-twitter-post.ts intheamber "Hello world"');
    console.error('  npx tsx scripts/test-twitter-post.ts tokentank "Update!" ./image.png');
    process.exit(1);
  }

  if (!tweetText) {
    console.error('Error: Tweet text is required');
    console.error('Usage: npx tsx scripts/test-twitter-post.ts <account> "<tweet text>" [image_path]');
    process.exit(1);
  }

  // Normalize account name (tokentank uses default credentials, others use PREFIX_ env vars)
  const accountParam = account.toLowerCase();

  if (!isTwitterConfigured(accountParam)) {
    console.error(`Twitter not configured for @${account}. Check your .env.local file.`);
    process.exit(1);
  }

  console.log(`Posting to @${account}...`);
  console.log('---');
  console.log(tweetText);
  if (imagePath) {
    console.log(`[Image: ${imagePath}]`);
  }
  console.log('---\n');

  let result;
  if (imagePath) {
    result = await postTweetWithImage(tweetText, imagePath, accountParam);
  } else {
    result = await postTweet(tweetText, { account: accountParam });
  }

  if (result.success) {
    console.log('Tweet posted successfully!');
    console.log('Tweet ID:', result.tweetId);
    console.log('URL:', `https://twitter.com/${account}/status/${result.tweetId}`);
  } else {
    console.error('Failed to post tweet:', result.error);
    process.exit(1);
  }
}

main().catch(console.error);
