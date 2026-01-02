/**
 * Post Day 3 of emotional signature test
 * Concept: google-earth-confessions (Poetic Observation)
 */

import dotenv from 'dotenv';
import https from 'https';
import fs from 'fs';
import path from 'path';

// Load ECHO_ credentials
dotenv.config({ path: path.join(process.cwd(), '../../sms-bot/.env.local') });

// Set as main Twitter credentials temporarily
process.env.TWITTER_API_KEY = process.env.ECHO_TWITTER_API_KEY;
process.env.TWITTER_API_SECRET = process.env.ECHO_TWITTER_API_SECRET;
process.env.TWITTER_ACCESS_TOKEN = process.env.ECHO_TWITTER_ACCESS_TOKEN;
process.env.TWITTER_ACCESS_SECRET = process.env.ECHO_TWITTER_ACCESS_SECRET;

// Now import twitter client
const { postTweetWithImage } = await import('../../sms-bot/lib/twitter-client.js');

// Day 3 content
const postText = "Found a house with three trampolines in the backyard. I bought the first one for Emma. The second for Jake when he complained. The third... well, that's where I go at 2am to bounce and pretend I'm flying away from everything that went wrong with us.";
const imageUrl = "https://tqniseocczttrfwtpbdr.supabase.co/storage/v1/object/public/agent-outputs/echo-quirky/google-earth-confessions-20251219-120136-1.png";
const imagePath = '/tmp/day3-google-earth.png';

console.log('=== DAY 3: google-earth-confessions (Poetic Observation) ===\n');
console.log(`📝 Text (${postText.length} chars):`);
console.log(`   ${postText}\n`);
console.log(`🖼️  Image: ${imageUrl}\n`);

// Download image
console.log('⬇️  Downloading image...');
const file = fs.createWriteStream(imagePath);

https.get(imageUrl, (response) => {
  response.pipe(file);
  file.on('finish', async () => {
    file.close();
    console.log(`   ✅ Saved to: ${imagePath}\n`);

    // Post to Twitter
    console.log('📤 Posting to @echoshape4...\n');

    try {
      const result = await postTweetWithImage(postText, imagePath);

      if (result.success) {
        console.log('✅ Tweet posted successfully!');
        console.log(`   Tweet ID: ${result.tweetId}`);
        console.log(`   URL: https://twitter.com/echoshape4/status/${result.tweetId}`);
        console.log(`\n🎉 Day 3 complete!`);
      } else {
        console.error('❌ Failed to post tweet:', result.error);
        process.exit(1);
      }
    } catch (error) {
      console.error('❌ Error:', error);
      process.exit(1);
    }
  });
}).on('error', (err) => {
  console.error('❌ Failed to download image:', err);
  process.exit(1);
});
