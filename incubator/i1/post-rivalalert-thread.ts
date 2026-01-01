/**
 * Post RivalAlert Twitter thread
 * Run from kochito root: npx tsx incubator/i1/post-rivalalert-thread.ts
 */

import dotenv from 'dotenv';
dotenv.config({ path: 'sms-bot/.env.local' });

// Dynamic import after env is loaded
const { postTweet, replyToTweet, isTwitterConfigured } = await import('../../sms-bot/lib/twitter-client.js');

// Helper to post a thread
async function postThread(tweets: string[]) {
  let previousTweetId: string | undefined;
  const results = [];

  for (let i = 0; i < tweets.length; i++) {
    const tweet = tweets[i];

    let result;
    if (i === 0) {
      // First tweet
      result = await postTweet(tweet);
    } else {
      // Reply to previous tweet
      if (!previousTweetId) {
        return { success: false, error: 'Previous tweet ID not found' };
      }
      result = await replyToTweet(tweet, previousTweetId);
    }

    if (!result.success) {
      return { success: false, error: `Failed at tweet ${i + 1}: ${result.error}` };
    }

    previousTweetId = result.tweetId;
    results.push(result);

    // Wait 2 seconds between tweets to avoid rate limits
    if (i < tweets.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  }

  return {
    success: true,
    threadUrl: results[0].tweetUrl,
    tweets: results
  };
}

const THREAD = [
  `I built RivalAlert in 2 weeks after my first idea failed.

Here's the journey from "CompetitorPulse" (❌ name taken) → RivalAlert (✅ live at rivalalert.ai)

And what I learned about validation vs building 🧵`,

  `December 4: Had 3 business ideas. Picked "CompetitorPulse" - competitor monitoring for SMBs.

Seemed perfect:
✅ Clear value prop
✅ Klue/Crayon charge $1000+/mo (proven market)
✅ Fast to build

Started coding immediately.`,

  `Built the whole MVP in one session:
- Supabase database
- Website scraping
- Change detection
- Email digests
- Landing page

Felt productive. Was making progress.

Then I did market research.`,

  `Research revealed:
❌ competitorpulse.com already exists
❌ SaaS Price Pulse gives away similar features FOR FREE
❌ Market is crowded (Competitors.app, Visualping, PeerPanda, etc.)

I built a full MVP before validating the market.

Classic rookie mistake.`,

  `But I learned the lesson.

For my next attempt, I flipped the process:
1. Market research FIRST
2. Find available domain
3. Validate pricing gap
4. THEN build

Found rivalalert.ai ✅
Validated: Klue/Crayon prove $1000+/mo market ✅
Built in 2 weeks ✅`,

  `RivalAlert is now live:

📧 Monitor competitor websites daily
🔔 Email alerts on pricing/feature changes
🤖 AI summaries of what changed
💰 $29/mo (vs $1000+ enterprise tools)

30-day free trial, no credit card:
https://rivalalert.ai`,

  `What I learned building this:

1. Research BEFORE building (not after)
2. Domain availability isn't optional - check it first
3. Free alternatives kill pricing power
4. Enterprise pricing proves willingness to pay
5. Ship fast, but aim first`,

  `Currently at $0 revenue (just launched).

Goal: Get first 10 users this week, first paying customer within 30 days.

If you track competitors manually, try RivalAlert and let me know what's missing:
https://rivalalert.ai`,
];

async function main() {
  console.log('Posting RivalAlert thread to Twitter...\n');

  if (!isTwitterConfigured()) {
    console.error('❌ Twitter not configured. Check sms-bot/.env.local file.');
    process.exit(1);
  }

  console.log('✅ Twitter credentials found.\n');
  console.log(`Thread has ${THREAD.length} tweets:\n`);

  THREAD.forEach((tweet, i) => {
    console.log(`--- Tweet ${i + 1} ---`);
    console.log(tweet);
    console.log(`(${tweet.length} chars)\n`);
  });

  console.log('Posting...\n');

  const result = await postThread(THREAD);

  if (result.success) {
    console.log('✅ Thread posted successfully!');
    console.log('Thread URL:', result.threadUrl);
  } else {
    console.error('❌ Failed to post thread:', result.error);
  }
}

main().catch(console.error);
