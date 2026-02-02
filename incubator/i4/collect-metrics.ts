#!/usr/bin/env npx tsx
/**
 * Collect engagement metrics for Echo's 5-day test tweets
 */

import dotenv from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: resolve(__dirname, '../../sms-bot/.env.local') });

const { getTweet } = await import('../../sms-bot/lib/twitter-client.js');

const tweets = [
  { id: '2006538825854538137', day: 1, concept: 'expired-fortune-cookies', pattern: 'Tender Melancholy' },
  { id: '2006775543513936025', day: 2, concept: 'potato-confessions', pattern: 'Absurdist Sincerity' },
  { id: '2006790452192661905', day: 3, concept: 'google-earth-confessions', pattern: 'Poetic Observation' },
  { id: '2007100513322516887', day: 4, concept: 'suburban-oracle', pattern: 'Oracular Whimsy' },
  { id: '2007226450739638698', day: 5, concept: 'extinct-dating-profiles', pattern: 'Nostalgic Whimsy' },
];

async function main() {
  console.log('=== ECHO 5-DAY TEST METRICS ===\n');
  console.log('Collecting engagement data for all 5 test tweets...\n');

  const results: any[] = [];

  for (const tweet of tweets) {
    console.log(`Day ${tweet.day}: ${tweet.concept} (${tweet.pattern})`);
    const result = await getTweet(tweet.id);

    if (result.success && result.tweet) {
      const t = result.tweet;
      const metrics = t.metrics || { likeCount: 0, retweetCount: 0, replyCount: 0 };
      console.log(`  Likes: ${metrics.likeCount}, RTs: ${metrics.retweetCount}, Replies: ${metrics.replyCount}`);
      console.log(`  Text: ${t.text.substring(0, 60)}...`);
      results.push({
        day: tweet.day,
        concept: tweet.concept,
        pattern: tweet.pattern,
        ...metrics,
        total: (metrics.likeCount || 0) + (metrics.retweetCount || 0) + (metrics.replyCount || 0),
      });
    } else {
      console.log(`  ERROR: ${result.error}`);
      results.push({
        day: tweet.day,
        concept: tweet.concept,
        pattern: tweet.pattern,
        error: result.error,
      });
    }
    console.log('');
  }

  console.log('=== SUMMARY ===\n');
  console.log('| Day | Concept | Pattern | Likes | RTs | Replies | Total |');
  console.log('|-----|---------|---------|-------|-----|---------|-------|');

  for (const r of results) {
    if (r.error) {
      console.log(`| ${r.day} | ${r.concept.substring(0, 15)} | ${r.pattern} | ERROR | - | - | - |`);
    } else {
      console.log(`| ${r.day} | ${r.concept.substring(0, 15)} | ${r.pattern} | ${r.likeCount} | ${r.retweetCount} | ${r.replyCount} | ${r.total} |`);
    }
  }

  // Find winner
  const validResults = results.filter(r => !r.error);
  if (validResults.length > 0) {
    const winner = validResults.reduce((best, curr) => curr.total > best.total ? curr : best);
    console.log(`\n🏆 Best performer: Day ${winner.day} - ${winner.concept} (${winner.pattern}) with ${winner.total} engagements`);
  }
}

main().catch(console.error);
