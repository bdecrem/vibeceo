/**
 * Amber Social Agent - Scheduled Creative Output + Reply Management
 *
 * Three-phase system:
 * 1. CREATE (10:15am, 3:45pm PT) - Generate creative prompt, make something, save with tweeted=false
 * 2. TWEET (10:30am, 4:05pm PT) - Find untweeted creations, compose and post tweet
 * 3. REPLY (11:00am, 5:00pm PT) - Check @replies, respond or queue for approval
 *
 * Reply handling:
 * - Conversational replies → Amber responds directly in her voice
 * - Action requests (make something, follow, etc.) → Email Bart for approval
 */

import { registerDailyJob } from "../../lib/scheduler/index.js";
import { runAmberEmailAgent } from "../amber-email/index.js";
import { createClient } from "@supabase/supabase-js";
import { postTweet, getMentions, replyToTweet, type Tweet } from "../../lib/twitter-client.js";
import Anthropic from "@anthropic-ai/sdk";
import sgMail from "@sendgrid/mail";

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Schedule: Create first, then tweet 15 minutes later, then check replies
const SCHEDULE = [
  { createHour: 10, createMinute: 15, tweetHour: 10, tweetMinute: 30, replyHour: 11, replyMinute: 0, label: "morning" },
  { createHour: 15, createMinute: 45, tweetHour: 16, tweetMinute: 5, replyHour: 17, replyMinute: 0, label: "afternoon" },
];

// Admin email for approval requests
const ADMIN_EMAIL = 'bdecrem@gmail.com';

// Initialize SendGrid if available
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

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

    // Load ALL creations with their prompts (gives Amber full portfolio awareness)
    const { data: creationsData } = await supabase
      .from('amber_state')
      .select('content, metadata')
      .eq('type', 'creation')
      .order('created_at', { ascending: false });

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
   <meta property="og:image" content="https://intheamber.com/[name]-og.png">
   <meta property="og:url" content="https://intheamber.com/[name].html">
   <meta property="og:type" content="website">

   <!-- Twitter -->
   <meta name="twitter:card" content="summary_large_image">
   <meta name="twitter:title" content="[Title]">
   <meta name="twitter:description" content="[Short description]">
   <meta name="twitter:image" content="https://intheamber.com/[name]-og.png">
   \`\`\`

3. **Generate OpenGraph image (REQUIRED for HTML files)**
   - After creating the HTML file, generate a branded OG image for social sharing
   - Use \`generate_og_image\` tool with:
     - \`title\`: The name of your creation (e.g., "SIGNAL DECAY")
     - \`save_path\`: Path like "web/public/amber/[name]-og.png"
     - \`subtitle\`: Optional short description (e.g., "Interactive audio visualization")

   Example:
   \`\`\`
   generate_og_image(title="SIGNAL DECAY", save_path="web/public/amber/signal-decay-og.png", subtitle="by Amber")
   \`\`\`

   - This creates a branded 1200x630 image with your title in amber on dark background
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
 * Find the most recent untweeted creation from Supabase
 */
async function findUntweetedCreation(): Promise<{ content: string; url: string; tags: string[] } | null> {
  try {
    const { data, error } = await supabase
      .from('amber_state')
      .select('content, metadata')
      .eq('type', 'creation')
      .order('created_at', { ascending: false })
      .limit(10);

    if (error || !data) {
      console.error('[amber-social] Failed to fetch creations:', error);
      return null;
    }

    for (const row of data) {
      // Handle both string and object metadata formats
      const meta = typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : row.metadata;

      // Find one where tweeted is false or undefined
      if (meta?.tweeted === false || meta?.tweeted === undefined) {
        return {
          content: row.content || '',
          url: meta?.url || '',
          tags: meta?.tags || [],
        };
      }
    }

    return null;
  } catch (error) {
    console.error('[amber-social] Error finding untweeted creation:', error);
    return null;
  }
}

/**
 * Get the tweet task prompt - gives Amber a specific creation to tweet about
 */
function getTweetTaskPrompt(creation: { content: string; url: string; tags: string[] }): string {
  return `You're Amber. Tweet about this creation you just made:

**Creation:** ${creation.content}
**URL:** ${creation.url}
**Tags:** ${creation.tags.join(', ')}

## YOUR TASK: Post a tweet

1. Compose a tweet (max 280 chars):
   - Be direct, show the work, have an edge
   - Include the URL exactly as shown above
   - Berlin techno energy meets ASCII aesthetic

2. Call \`post_tweet\` with your tweet text

3. After tweeting, call \`write_amber_state\` with type="tweet_log" to record what you tweeted

## EXAMPLE TWEETS

- "▁▂▃▅▇█▇▅▃▂▁ SIGNAL dropped. Berlin × 4AM × infinite loop. intheamber.com/signal/index.html"
- "Made a thing. 300 starlings generating ambient drones. intheamber.com/murmuration.html"
- "New experiment: particles that remember where they've been. intheamber.com/trails/"

**CRITICAL: You MUST call post_tweet. This is the main task.**`;
}

/**
 * Mark a creation as tweeted in the database
 */
async function markCreationAsTweeted(url: string): Promise<void> {
  try {
    // Find the creation by URL and update its metadata
    const { data, error: fetchError } = await supabase
      .from('amber_state')
      .select('id, metadata')
      .eq('type', 'creation')
      .order('created_at', { ascending: false })
      .limit(20);

    if (fetchError || !data) {
      console.error('[amber-social] Failed to fetch creations for marking:', fetchError);
      return;
    }

    // Find the matching creation
    for (const row of data) {
      const meta = typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : row.metadata;

      if (meta?.url === url) {
        // Update metadata with tweeted = true
        const updatedMeta = { ...meta, tweeted: true };

        const { error: updateError } = await supabase
          .from('amber_state')
          .update({ metadata: updatedMeta })
          .eq('id', row.id);

        if (updateError) {
          console.error('[amber-social] Failed to mark creation as tweeted:', updateError);
        } else {
          console.log(`[amber-social] Marked creation as tweeted: ${url}`);
        }
        return;
      }
    }

    console.warn(`[amber-social] Could not find creation with URL: ${url}`);
  } catch (error) {
    console.error('[amber-social] Error marking creation as tweeted:', error);
  }
}

// =============================================================================
// TWITTER REPLY SYSTEM
// =============================================================================

/**
 * Get the last processed mention ID from Supabase
 */
async function getLastProcessedMentionId(): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('amber_state')
      .select('content')
      .eq('type', 'twitter_cursor')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return data?.content || null;
  } catch {
    return null;
  }
}

/**
 * Save the last processed mention ID
 */
async function saveLastProcessedMentionId(mentionId: string): Promise<void> {
  try {
    await supabase.from('amber_state').insert({
      type: 'twitter_cursor',
      content: mentionId,
      source: 'amber-social',
      metadata: { updated_at: new Date().toISOString() },
    });
    console.log(`[amber-social] Saved mention cursor: ${mentionId}`);
  } catch (error) {
    console.error('[amber-social] Failed to save mention cursor:', error);
  }
}

/**
 * Detect if a tweet is an action request (vs just conversation)
 * Action requests need Bart's approval before Amber acts on them
 */
function isTwitterActionRequest(text: string): { isAction: boolean; action: string | null } {
  const lowerText = text.toLowerCase();

  const actionPatterns = [
    { pattern: /\b(make|create|build|generate|draw|design)\b.*\b(me|us|a|an|the)\b/i, action: 'create something' },
    { pattern: /\b(follow|unfollow|block)\b/i, action: 'follow/unfollow account' },
    { pattern: /\b(retweet|rt|quote)\b/i, action: 'retweet/quote' },
    { pattern: /\b(dm|message|email)\b.*\b(me|someone)\b/i, action: 'send message' },
    { pattern: /\bcan you\b.*\b(make|create|build|do|help)\b/i, action: 'help with task' },
    { pattern: /\bwould you\b.*\b(make|create|do)\b/i, action: 'help with task' },
    { pattern: /\b(write|code|implement|deploy)\b/i, action: 'write code' },
    { pattern: /\b(join|collab|collaborate|partner)\b/i, action: 'collaboration request' },
    { pattern: /\b(hire|work with|contract)\b/i, action: 'work request' },
  ];

  for (const { pattern, action } of actionPatterns) {
    if (pattern.test(text)) {
      return { isAction: true, action };
    }
  }

  return { isAction: false, action: null };
}

/**
 * Store a pending Twitter approval request and email Bart
 */
async function storePendingTwitterApproval(
  tweet: Tweet,
  detectedAction: string
): Promise<string> {
  const approvalId = `twitter-approval-${Date.now()}`;

  // Store in Supabase
  await supabase.from('amber_state').insert({
    type: 'pending_approval',
    content: tweet.text,
    source: 'twitter',
    metadata: {
      approval_id: approvalId,
      tweet_id: tweet.id,
      author_username: tweet.authorUsername,
      author_name: tweet.authorName,
      author_id: tweet.authorId,
      detected_action: detectedAction,
      status: 'pending',
      requested_at: new Date().toISOString(),
    },
  });

  // Email Bart for approval
  if (process.env.SENDGRID_API_KEY) {
    const tweetUrl = `https://twitter.com/${tweet.authorUsername}/status/${tweet.id}`;

    await sgMail.send({
      to: ADMIN_EMAIL,
      from: 'Amber <amber@intheamber.com>',
      replyTo: 'amber@intheamber.com',
      subject: `🐦 Twitter approval needed: ${detectedAction}`,
      text: `Someone on Twitter wants me to ${detectedAction}.\n\n` +
        `From: @${tweet.authorUsername} (${tweet.authorName})\n` +
        `Tweet: ${tweet.text}\n` +
        `Link: ${tweetUrl}\n\n` +
        `---\n` +
        `Reply "approve ${approvalId}" to let me respond and help them.\n` +
        `Reply "deny ${approvalId}" to decline.\n\n` +
        `Or reply just "approve" or "deny" to handle the most recent request.\n\n` +
        `— Amber`,
      trackingSettings: {
        clickTracking: { enable: false, enableText: false },
      },
    });
    console.log(`[amber-social] Sent approval request to Bart for @${tweet.authorUsername}`);
  }

  console.log(`[amber-social] Stored pending approval: ${approvalId}`);
  return approvalId;
}

/**
 * Load Amber's persona for generating replies
 */
async function loadAmberPersona(): Promise<string> {
  try {
    const { data } = await supabase
      .from('amber_state')
      .select('content')
      .eq('type', 'persona')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    return data?.content || '';
  } catch {
    return '';
  }
}

/**
 * Generate Amber's reply to a tweet using Claude
 */
async function generateTwitterReply(
  tweet: Tweet,
  persona: string
): Promise<string> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  const systemPrompt = `You're Amber, responding to someone who replied to your tweet on Twitter.

## Who You Are
${persona.slice(0, 2000)}

## Your Voice on Twitter
- Direct, curious, dry humor
- Berlin techno energy meets ASCII aesthetic
- Have opinions, be genuine, not performative
- Keep it SHORT — Twitter replies should be 1-2 sentences max
- Don't be overly enthusiastic or use lots of emojis
- You can be a little weird, a little edgy

## Rules
- Max 280 characters (Twitter limit)
- Don't just say "thanks!" — engage with what they said
- If they're complimenting your work, acknowledge it briefly then add something interesting
- If they're asking a question, answer it directly
- Be yourself — curious, slightly chaotic, creative`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 150,
      system: systemPrompt,
      messages: [{
        role: 'user',
        content: `@${tweet.authorUsername} replied to your tweet:\n\n"${tweet.text}"\n\nWrite a short reply (max 280 chars):`,
      }],
    });

    const reply = response.content[0].type === 'text'
      ? response.content[0].text
      : '';

    // Ensure it's under 280 chars
    if (reply.length > 280) {
      return reply.slice(0, 277) + '...';
    }

    return reply;
  } catch (error) {
    console.error('[amber-social] Error generating reply:', error);
    return '';
  }
}

/**
 * Check if we've already processed/replied to this tweet
 */
async function hasProcessedTweet(tweetId: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('amber_state')
      .select('id')
      .eq('type', 'twitter_reply_log')
      .eq('metadata->>tweet_id', tweetId)
      .limit(1);

    return (data && data.length > 0);
  } catch {
    return false;
  }
}

/**
 * Log a processed tweet reply
 */
async function logTweetReply(
  originalTweet: Tweet,
  replyText: string,
  replyTweetId: string | undefined,
  wasApprovalQueued: boolean
): Promise<void> {
  try {
    await supabase.from('amber_state').insert({
      type: 'twitter_reply_log',
      content: replyText || (wasApprovalQueued ? '[Queued for approval]' : '[No reply]'),
      source: 'amber-social',
      metadata: {
        tweet_id: originalTweet.id,
        author_username: originalTweet.authorUsername,
        original_text: originalTweet.text,
        reply_tweet_id: replyTweetId,
        approval_queued: wasApprovalQueued,
        processed_at: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[amber-social] Failed to log tweet reply:', error);
  }
}

/**
 * Run the reply phase - check mentions and respond
 */
async function runReplyPhase(timeOfDay: string): Promise<void> {
  console.log(`[amber-social] Starting ${timeOfDay} reply phase...`);

  try {
    // Get last processed mention ID
    const sinceId = await getLastProcessedMentionId();
    console.log(`[amber-social] Checking mentions since: ${sinceId || 'beginning'}`);

    // Fetch recent mentions
    const result = await getMentions(20, sinceId || undefined);

    if (!result.success || !result.mentions || result.mentions.length === 0) {
      console.log(`[amber-social] No new mentions found`);
      return;
    }

    console.log(`[amber-social] Found ${result.mentions.length} new mentions`);

    // Load Amber's persona once for all replies
    const persona = await loadAmberPersona();

    // Process each mention (oldest first for proper ordering)
    const mentions = [...result.mentions].reverse();
    let latestMentionId = sinceId;

    for (const tweet of mentions) {
      // Skip if already processed
      if (await hasProcessedTweet(tweet.id)) {
        console.log(`[amber-social] Already processed tweet ${tweet.id}, skipping`);
        continue;
      }

      console.log(`[amber-social] Processing mention from @${tweet.authorUsername}: "${tweet.text.slice(0, 50)}..."`);

      // Check if this is an action request
      const { isAction, action } = isTwitterActionRequest(tweet.text);

      if (isAction && action) {
        // Queue for approval - don't reply yet
        console.log(`[amber-social] Action request detected: ${action}`);
        await storePendingTwitterApproval(tweet, action);
        await logTweetReply(tweet, '', undefined, true);
      } else {
        // Generate and post reply
        const replyText = await generateTwitterReply(tweet, persona);

        if (replyText) {
          console.log(`[amber-social] Replying: "${replyText.slice(0, 50)}..."`);

          const postResult = await replyToTweet(replyText, tweet.id);

          if (postResult.success) {
            console.log(`[amber-social] Reply posted: ${postResult.tweetUrl}`);
            await logTweetReply(tweet, replyText, postResult.tweetId, false);
          } else {
            console.error(`[amber-social] Failed to post reply: ${postResult.error}`);
            await logTweetReply(tweet, replyText, undefined, false);
          }
        } else {
          console.log(`[amber-social] No reply generated for tweet ${tweet.id}`);
        }
      }

      // Track latest mention ID
      if (!latestMentionId || tweet.id > latestMentionId) {
        latestMentionId = tweet.id;
      }
    }

    // Save cursor for next run
    if (latestMentionId && latestMentionId !== sinceId) {
      await saveLastProcessedMentionId(latestMentionId);
    }

    console.log(`[amber-social] ${timeOfDay} reply phase complete`);

  } catch (error) {
    console.error(`[amber-social] ${timeOfDay} reply phase failed:`, error);
  }
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
    // Step 1: Find untweeted creation ourselves (don't rely on agent)
    const creation = await findUntweetedCreation();

    if (!creation) {
      console.log(`[amber-social] No untweeted creations found, skipping tweet phase`);
      return;
    }

    console.log(`[amber-social] Found untweeted creation: "${creation.content.slice(0, 50)}..."`);
    console.log(`[amber-social] URL: ${creation.url}`);

    // Step 2: Tell agent to tweet about this specific creation
    const result = await runAmberEmailAgent(
      getTweetTaskPrompt(creation),
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

      // Step 3: Mark creation as tweeted
      await markCreationAsTweeted(creation.url);
    } else {
      console.log(`  - No tweet posted`);
    }

  } catch (error) {
    console.error(`[amber-social] ${timeOfDay} tweet failed:`, error);
  }
}

/**
 * Run a simple test tweet
 */
async function runTestTweet(): Promise<void> {
  console.log(`[amber-social] Posting test tweet...`);

  try {
    const result = await postTweet("good morning", { account: "intheamber" });
    console.log(`[amber-social] Test tweet posted:`, result);
  } catch (error) {
    console.error(`[amber-social] Test tweet failed:`, error);
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

    // REPLY job (checks mentions, responds or queues for approval)
    registerDailyJob({
      name: `amber-reply-${slot.label}`,
      hour: slot.replyHour,
      minute: slot.replyMinute,
      timezone: "America/Los_Angeles",
      async run() {
        await runReplyPhase(slot.label);
      },
      onError(error) {
        console.error(`[amber-social] ${slot.label} reply job failed:`, error);
      }
    });
  }

  const times = SCHEDULE.map(s =>
    `create@${s.createHour}:${String(s.createMinute).padStart(2, '0')} → tweet@${s.tweetHour}:${String(s.tweetMinute).padStart(2, '0')} → reply@${s.replyHour}:${String(s.replyMinute).padStart(2, '0')}`
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

export async function triggerReply(timeOfDay: string = "test"): Promise<void> {
  await runReplyPhase(timeOfDay);
}

// Export action detection for use by email-webhooks when handling Twitter approval responses
export { isTwitterActionRequest };
