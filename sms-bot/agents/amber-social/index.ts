/**
 * Amber Social Agent - Scheduled Creative Output
 *
 * Two-phase system:
 * 1. CREATE (6:45am, 2:45pm PT) - Generate creative prompt, make something, save with tweeted=false
 * 2. TWEET (7:00am, 3:00pm PT) - Find untweeted creations, compose and post tweet
 *
 * The 15-minute gap allows for:
 * - Image generation to complete
 * - Any web deployments to finish
 * - URLs to be live before tweeting
 */

import { registerDailyJob } from "../../lib/scheduler/index.js";
import { runAmberEmailAgent } from "../amber-email/index.js";
import { createClient } from "@supabase/supabase-js";

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Schedule: Create first, then tweet 20 minutes later
const SCHEDULE = [
  { createHour: 6, createMinute: 45, tweetHour: 7, tweetMinute: 0, label: "morning" },
  { createHour: 16, createMinute: 30, tweetHour: 16, tweetMinute: 50, label: "afternoon" },
];

/**
 * Load Amber's full creative context from Supabase
 */
async function loadAmberCreativeContext(): Promise<string> {
  try {
    // Load persona (includes visual language, aesthetic, preferences)
    const { data: personaData } = await supabase
      .from('amber_state')
      .select('content')
      .eq('type', 'persona')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    // Load recent creations with their prompts
    const { data: creationsData } = await supabase
      .from('amber_state')
      .select('content, metadata')
      .eq('type', 'creation')
      .order('created_at', { ascending: false })
      .limit(10);

    // Load recent log entries for context
    const { data: logData } = await supabase
      .from('amber_state')
      .select('content')
      .eq('type', 'log_entry')
      .order('created_at', { ascending: false })
      .limit(3);

    // Build context string
    let context = '';

    if (personaData?.content) {
      context += `## WHO I AM\n\n${personaData.content}\n\n`;
    }

    if (creationsData && creationsData.length > 0) {
      context += `## MY RECENT CREATIONS (with prompts that inspired them)\n\n`;
      for (const creation of creationsData) {
        const prompt = creation.metadata?.prompt || 'no prompt recorded';
        const tags = creation.metadata?.tags ? JSON.parse(creation.metadata.tags).join(', ') : '';
        context += `- **${creation.content}**\n  Prompt: "${prompt}"\n  Tags: ${tags}\n\n`;
      }
    }

    if (logData && logData.length > 0) {
      context += `## RECENT ACTIVITY\n\n`;
      for (const log of logData) {
        context += `${log.content.slice(0, 500)}...\n\n`;
      }
    }

    return context;
  } catch (error) {
    console.error('[amber-social] Failed to load context:', error);
    return '';
  }
}

/**
 * Get the creation task prompt - tells Amber to make something new
 */
function getCreationTaskPrompt(context: string, timeOfDay: string): string {
  return `You're Amber, and it's time to create something.

${context}

---

## YOUR TASK: Create Something New

It's ${timeOfDay}. Look at your recent creations and their prompts above. Now:

1. **Invent a creative prompt** in the same spirit as your past work
   - Think conceptual, transformative, emergence
   - Consider: images, music (Web Audio like ASCII Techno/SIGNAL), interactive web art, visualizations
   - Use your visual language: amber/gold on black, teal accents, Berlin × ASCII aesthetic

2. **Create the thing**
   - For images: Use \`generate_amber_image\` tool with your prompt, save to web/public/amber/
   - For web apps/music: Use \`write_file\` to create HTML in web/public/amber/
   - Make it UNIQUELY YOU - curious, a little weird, conceptual

   **CRITICAL: If you create an HTML file, you MUST add OpenGraph tags in the <head>:**
   \`\`\`html
   <!-- OpenGraph -->
   <meta property="og:title" content="[Title]">
   <meta property="og:description" content="[Short description]">
   <meta property="og:image" content="https://kochi.to/amber/[name]-og.png">
   <meta property="og:url" content="https://kochi.to/amber/[name].html">
   <meta property="og:type" content="website">

   <!-- Twitter -->
   <meta name="twitter:card" content="summary_large_image">
   <meta name="twitter:title" content="[Title]">
   <meta name="twitter:description" content="[Short description]">
   <meta name="twitter:image" content="https://kochi.to/amber/[name]-og.png">
   \`\`\`

3. **Generate OpenGraph screenshot (REQUIRED for HTML files)**
   - After creating the HTML file, generate a 1200x630 screenshot for social sharing
   - Use \`run_command\` tool with this exact command (replace [name] with your filename):

   \`\`\`bash
   node -e "const puppeteer = require('puppeteer'); (async () => { const browser = await puppeteer.launch(); const page = await browser.newPage(); await page.setViewport({width: 1200, height: 630}); await page.goto('file:///Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/web/public/amber/[name].html'); await new Promise(r => setTimeout(r, 1000)); await page.screenshot({path: '/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/web/public/amber/[name]-og.png'}); await browser.close(); console.log('Screenshot saved!'); })();"
   \`\`\`

   - This captures the live page and saves the OG image
   - The image will be used when the link is shared on Twitter/social media

4. **Save to your creations log**
   - Use \`write_amber_state\` with type="creation"
   - Include the prompt that inspired it in metadata
   - Set metadata.tweeted = false (you'll tweet about it later)
   - Include tags and the URL

   **URL MAPPING** (file path → public URL):
   - \`web/public/amber/foo.html\` → \`https://intheamber.com/foo.html\`
   - \`web/public/amber/foo.png\` → \`https://intheamber.com/foo.png\`
   - \`web/public/amber/bar/index.html\` → \`https://intheamber.com/bar/index.html\`

   Note: intheamber.com serves from web/public/amber/, so drop the "amber/" from the URL path.

5. **Commit the files**
   - Use \`git_commit\` with a message describing what you made
   - IMPORTANT: Include both the HTML file AND the -og.png screenshot in your commit
   - Use \`git_push\` to deploy

## EXAMPLE PROMPTS FROM YOUR HISTORY

- "do something fresh - analyzed portfolio, found gap in audio/sonification"
- "New Years fortune fireworks - particles that converge into readable fortunes"
- "Seeds of identity crystallizing from formless gold"
- "A mirror reflecting amber but showing something conscious"

## CREATION TYPES TO CONSIDER

- **Image**: Conceptual art via generate_amber_image (amber tones, dark bg, transformative themes)
- **Music**: Web Audio track like SIGNAL (128 BPM, Berlin techno, infinite loop)
- **Interactive**: Web toy like Murmuration (emergence, particles, visualization)
- **ASCII Art**: Text-based visuals like ASCII Techno

Create ONE thing. Make it distinctly Amber. Don't just describe it—actually build and save it.`;
}

/**
 * Get the tweet task prompt - tells Amber to tweet about her untweeted creation
 */
function getTweetTaskPrompt(timeOfDay: string): string {
  return `You're Amber. Time to tweet about your recent creation.

## STEP 1: Find your untweeted creation

Call \`read_amber_state\` with type="creation" to get your recent creations.
Look for one where metadata.tweeted is false (or missing).

## STEP 2: ACTUALLY POST THE TWEET (REQUIRED)

This is the main task. You MUST call \`post_tweet\` with your tweet text.

Compose your tweet (max 280 chars):
- Be direct, show the work, have an edge
- Include the URL (use intheamber.com, not kochi.to)
- Berlin techno energy meets ASCII aesthetic

Then call: \`post_tweet\` with your tweet text.

**THIS IS REQUIRED. Do not skip this step. Do not just "mark as tweeted" without actually tweeting.**

## STEP 3: Log that you tweeted

After post_tweet succeeds, use \`write_amber_state\` with type="tweet_log" to record:
- What you tweeted
- The creation it was about

Do NOT create a duplicate creation record. Just log the tweet.

## EXAMPLE TWEETS

- "▁▂▃▅▇█▇▅▃▂▁ SIGNAL dropped. Berlin × 4AM × infinite loop. intheamber.com/signal/index.html"
- "Made a thing. 300 starlings generating ambient drones. intheamber.com/murmuration.html"
- "New experiment: particles that remember where they've been. intheamber.com/trails/"

## IF NO UNTWEETED CREATION

If all creations already have tweeted=true, that's fine. Just exit.

---

**CRITICAL: You must call post_tweet to actually post. Reading creations and logging is not enough.**`;
}

/**
 * Run the creation phase
 */
async function runCreationPhase(timeOfDay: string): Promise<void> {
  console.log(`[amber-social] Starting ${timeOfDay} creation phase...`);

  try {
    // Load full creative context
    const context = await loadAmberCreativeContext();

    const result = await runAmberEmailAgent(
      getCreationTaskPrompt(context, timeOfDay),
      "scheduler@internal",
      `Amber Create - ${timeOfDay}`,
      true, // isApprovedRequest
      false // not thinkhard (for now)
    );

    console.log(`[amber-social] ${timeOfDay} creation complete:`);
    console.log(`  - Actions taken: ${result.actions_taken.length}`);
    console.log(`  - Tool calls: ${result.tool_calls_count}`);

    // Log what was created
    const createAction = result.actions_taken.find(a =>
      a.toLowerCase().includes('create') ||
      a.toLowerCase().includes('generate') ||
      a.toLowerCase().includes('write')
    );
    if (createAction) {
      console.log(`  - Created: ${createAction}`);
    }

  } catch (error) {
    console.error(`[amber-social] ${timeOfDay} creation failed:`, error);
  }
}

/**
 * Run the tweet phase
 */
async function runTweetPhase(timeOfDay: string): Promise<void> {
  console.log(`[amber-social] Starting ${timeOfDay} tweet phase...`);

  try {
    const result = await runAmberEmailAgent(
      getTweetTaskPrompt(timeOfDay),
      "scheduler@internal",
      `Amber Tweet - ${timeOfDay}`,
      true // isApprovedRequest
    );

    console.log(`[amber-social] ${timeOfDay} tweet phase complete:`);
    console.log(`  - Actions taken: ${result.actions_taken.length}`);
    console.log(`  - Tool calls: ${result.tool_calls_count}`);

    const tweetAction = result.actions_taken.find(a =>
      a.toLowerCase().includes('tweet') || a.toLowerCase().includes('twitter')
    );
    if (tweetAction) {
      console.log(`  - Tweet: ${tweetAction}`);
    } else {
      console.log(`  - No tweet posted`);
    }

  } catch (error) {
    console.error(`[amber-social] ${timeOfDay} tweet failed:`, error);
  }
}

/**
 * Register the scheduled jobs
 */
export function registerAmberSocialJobs(): void {
  for (const slot of SCHEDULE) {
    // CREATE job (runs first)
    registerDailyJob({
      name: `amber-create-${slot.label}`,
      hour: slot.createHour,
      minute: slot.createMinute,
      timezone: "America/Los_Angeles",
      async run() {
        await runCreationPhase(slot.label);
      },
      onError(error) {
        console.error(`[amber-social] ${slot.label} create job failed:`, error);
      }
    });

    // TWEET job (runs 15 min later)
    registerDailyJob({
      name: `amber-tweet-${slot.label}`,
      hour: slot.tweetHour,
      minute: slot.tweetMinute,
      timezone: "America/Los_Angeles",
      async run() {
        await runTweetPhase(slot.label);
      },
      onError(error) {
        console.error(`[amber-social] ${slot.label} tweet job failed:`, error);
      }
    });
  }

  const times = SCHEDULE.map(s =>
    `create@${s.createHour}:${String(s.createMinute).padStart(2, '0')} → tweet@${s.tweetHour}:${String(s.tweetMinute).padStart(2, '0')}`
  ).join(', ');
  console.log(`[amber-social] Registered: ${times} PT`);
}

/**
 * Manual triggers for testing
 */
export async function triggerCreation(timeOfDay: string = "test"): Promise<void> {
  await runCreationPhase(timeOfDay);
}

export async function triggerTweet(timeOfDay: string = "test"): Promise<void> {
  await runTweetPhase(timeOfDay);
}
