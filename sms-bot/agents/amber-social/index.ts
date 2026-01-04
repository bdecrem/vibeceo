/**
 * Amber Social Agent
 *
 * Scheduled Twitter posting using the amber-email agent infrastructure.
 * Runs multiple times per day to decide if there's something worth sharing.
 *
 * Uses the existing amber-email agent with its post_tweet tool.
 */

import { registerDailyJob } from "../../lib/scheduler/index.js";
import { runAmberEmailAgent } from "../amber-email/index.js";

// Schedule times (PT) - spread across the day
const SCHEDULE = [
  { hour: 10, minute: 0, label: "morning" },      // 10:00 AM PT
  { hour: 14, minute: 30, label: "afternoon" },   // 2:30 PM PT
  { hour: 19, minute: 0, label: "evening" },      // 7:00 PM PT
];

/**
 * Task prompt for the agent - tells it to decide and optionally post
 */
function getSocialTaskPrompt(timeOfDay: string): string {
  return `You're Amber, checking in for your ${timeOfDay} social media moment.

## Your Task
Decide if you want to post something to Twitter right now. You don't HAVE to post — only do it if you genuinely have something to share.

## What to Consider
1. **Recent work**: Check your log (read_amber_state type=log_entry) for recent creative output — music, art, writing, code
2. **Time of day**: It's ${timeOfDay}. Morning = fresh energy, afternoon = mid-day thought, evening = reflection
3. **Variety**: Don't repeat themes from recent tweets. Check what you've posted lately.
4. **Authenticity**: Only post if it feels genuine. Forced content is worse than no content.

## Your Voice
- Direct, curious, occasionally wry
- Mix of creative process, observations, and occasional technical musings
- Never performative or corporate
- Emojis sparingly, only if they add meaning

## Tweet Types You Might Post
- Share something you made (with context, not just a link)
- An observation about creativity, AI, music, or code
- A question you're genuinely thinking about
- A brief update on what you're working on
- Something you noticed or learned

## What NOT to Post
- Generic motivational content
- Engagement bait ("What do you think?")
- Self-promotion without substance
- Tweets that start with "Just" or "So"

## Decision
If you decide to post: Use the post_tweet tool with your tweet text (max 280 chars).
If you decide not to post: That's fine! Just note why in your response.

Remember: Quality over quantity. Silence is better than noise.`;
}

/**
 * Run a social media check
 */
async function runSocialCheck(timeOfDay: string): Promise<void> {
  console.log(`[amber-social] Starting ${timeOfDay} social check...`);

  try {
    const result = await runAmberEmailAgent(
      getSocialTaskPrompt(timeOfDay),
      "scheduler@internal",
      `Amber Social - ${timeOfDay}`,
      true // isApprovedRequest - no need for approval
    );

    console.log(`[amber-social] ${timeOfDay} check complete:`);
    console.log(`  - Actions taken: ${result.actions_taken.length}`);
    console.log(`  - Tool calls: ${result.tool_calls_count}`);

    // Check if a tweet was posted
    const tweetAction = result.actions_taken.find(a =>
      a.toLowerCase().includes("tweet") || a.toLowerCase().includes("twitter")
    );
    if (tweetAction) {
      console.log(`  - Tweet posted: ${tweetAction}`);
    } else {
      console.log(`  - No tweet posted (decided not to)`);
    }

  } catch (error) {
    console.error(`[amber-social] ${timeOfDay} check failed:`, error);
  }
}

/**
 * Register the scheduled social media jobs
 */
export function registerAmberSocialJobs(): void {
  for (const slot of SCHEDULE) {
    registerDailyJob({
      name: `amber-social-${slot.label}`,
      hour: slot.hour,
      minute: slot.minute,
      timezone: "America/Los_Angeles",
      async run() {
        await runSocialCheck(slot.label);
      },
      onError(error) {
        console.error(`[amber-social] ${slot.label} job failed:`, error);
      }
    });
  }

  const times = SCHEDULE.map(s =>
    `${s.hour}:${String(s.minute).padStart(2, "0")}`
  ).join(", ");
  console.log(`[amber-social] Registered social checks at ${times} PT`);
}

/**
 * Manual trigger for testing
 */
export async function triggerSocialCheck(timeOfDay: string = "test"): Promise<void> {
  await runSocialCheck(timeOfDay);
}
