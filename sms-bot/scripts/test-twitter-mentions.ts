/**
 * Test script for Twitter mentions/search/reply functionality
 *
 * Usage:
 *   npx tsx scripts/test-twitter-mentions.ts mentions     # Get recent mentions
 *   npx tsx scripts/test-twitter-mentions.ts search "query"  # Search for tweets
 *   npx tsx scripts/test-twitter-mentions.ts reply <tweet_id> "message"  # Reply to a tweet
 */

import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../../sms-bot/.env.local') });
dotenv.config({ path: path.join(__dirname, '../.env.local') });

import { getMentions, searchTweets, replyToTweet } from '../lib/twitter-client.js';

async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command) {
    console.log('Usage:');
    console.log('  npx tsx scripts/test-twitter-mentions.ts mentions');
    console.log('  npx tsx scripts/test-twitter-mentions.ts search "query"');
    console.log('  npx tsx scripts/test-twitter-mentions.ts reply <tweet_id> "message"');
    process.exit(1);
  }

  switch (command) {
    case 'mentions': {
      console.log('Fetching recent mentions...\n');
      const result = await getMentions(10);

      if (!result.success) {
        console.error('Error:', result.error);
        process.exit(1);
      }

      if (!result.mentions || result.mentions.length === 0) {
        console.log('No recent mentions found.');
      } else {
        console.log(`Found ${result.mentions.length} mentions:\n`);
        for (const mention of result.mentions) {
          console.log(`---`);
          console.log(`From: @${mention.authorUsername || mention.authorId} (${mention.authorName || 'Unknown'})`);
          console.log(`Tweet ID: ${mention.id}`);
          console.log(`Date: ${mention.createdAt || 'Unknown'}`);
          console.log(`Text: ${mention.text}`);
          console.log();
        }
      }
      break;
    }

    case 'search': {
      const query = args[0];
      if (!query) {
        console.error('Please provide a search query');
        process.exit(1);
      }

      console.log(`Searching for: "${query}"\n`);
      const result = await searchTweets(query, 10);

      if (!result.success) {
        console.error('Error:', result.error);
        process.exit(1);
      }

      if (!result.tweets || result.tweets.length === 0) {
        console.log('No tweets found matching query.');
      } else {
        console.log(`Found ${result.tweets.length} tweets:\n`);
        for (const tweet of result.tweets) {
          console.log(`---`);
          console.log(`From: @${tweet.authorUsername || tweet.authorId} (${tweet.authorName || 'Unknown'})`);
          console.log(`Tweet ID: ${tweet.id}`);
          console.log(`Date: ${tweet.createdAt || 'Unknown'}`);
          console.log(`Text: ${tweet.text}`);
          console.log();
        }
      }
      break;
    }

    case 'reply': {
      const [tweetId, message] = args;
      if (!tweetId || !message) {
        console.error('Please provide tweet ID and message');
        console.error('Usage: npx tsx scripts/test-twitter-mentions.ts reply <tweet_id> "message"');
        process.exit(1);
      }

      console.log(`Replying to tweet ${tweetId}...`);
      console.log(`Message: ${message}\n`);

      const result = await replyToTweet(message, tweetId);

      if (!result.success) {
        console.error('Error:', result.error);
        process.exit(1);
      }

      console.log('Reply posted successfully!');
      console.log(`Tweet ID: ${result.tweetId}`);
      console.log(`URL: ${result.tweetUrl}`);
      break;
    }

    default:
      console.error(`Unknown command: ${command}`);
      process.exit(1);
  }
}

main().catch(console.error);
