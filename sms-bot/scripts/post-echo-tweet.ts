/**
 * Post to @echoshape4 Twitter account
 *
 * Usage:
 *   npx tsx scripts/post-echo-tweet.ts "<tweet text>" [image_path]
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Map ECHO_TWITTER_* vars to TWITTER_ECHO_* format expected by twitter-client
process.env.TWITTER_ECHO_ACCESS_TOKEN = process.env.ECHO_TWITTER_ACCESS_TOKEN;
process.env.TWITTER_ECHO_ACCESS_SECRET = process.env.ECHO_TWITTER_ACCESS_SECRET;
process.env.TWITTER_API_KEY = process.env.ECHO_TWITTER_API_KEY;
process.env.TWITTER_API_SECRET = process.env.ECHO_TWITTER_API_SECRET;

const { postTweet, postTweetWithImage, isTwitterConfigured } = await import('../lib/twitter-client.js');

async function main() {
  const tweetText = process.argv[2];
  const imagePath = process.argv[3];

  if (!tweetText) {
    console.error('Usage: npx tsx scripts/post-echo-tweet.ts "<tweet text>" [image_path]');
    process.exit(1);
  }

  if (!isTwitterConfigured('echo')) {
    console.error('Twitter not configured for @echoshape4. Check ECHO_TWITTER_* vars in .env.local');
    process.exit(1);
  }

  console.log('Posting to @echoshape4...');
  console.log('---');
  console.log(tweetText);
  if (imagePath) {
    console.log(`[Image: ${imagePath}]`);
  }
  console.log('---\n');

  let result;
  if (imagePath) {
    result = await postTweetWithImage(tweetText, imagePath, 'echo');
  } else {
    result = await postTweet(tweetText, { account: 'echo' });
  }

  if (result.success) {
    console.log('✅ Tweet posted successfully!');
    console.log('   Tweet ID:', result.tweetId);
    console.log('   URL:', `https://twitter.com/echoshape4/status/${result.tweetId}`);
  } else {
    console.error('❌ Failed to post tweet:', result.error);
    process.exit(1);
  }
}

main().catch(console.error);
