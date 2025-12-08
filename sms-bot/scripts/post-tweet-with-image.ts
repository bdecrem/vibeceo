/**
 * Post a tweet with an image
 * Run: npx tsx scripts/post-tweet-with-image.ts "tweet text" path/to/image.png
 */

import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const { postTweetWithImage } = await import('../lib/twitter-client.js');

async function main() {
  const text = process.argv[2];
  const imagePath = process.argv[3];

  if (!text || !imagePath) {
    console.error('Usage: npx tsx scripts/post-tweet-with-image.ts "tweet text" path/to/image.png');
    process.exit(1);
  }

  console.log('Posting tweet with image...');
  console.log('Text:', text);
  console.log('Image:', imagePath);
  console.log('---');

  const result = await postTweetWithImage(text, imagePath);

  if (result.success) {
    console.log('Tweet posted successfully!');
    console.log('Tweet ID:', result.tweetId);
    console.log('URL:', result.tweetUrl);
  } else {
    console.error('Failed to post tweet:', result.error);
  }
}

main().catch(console.error);
