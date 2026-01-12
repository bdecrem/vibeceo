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
import { postTweet, getMentions, replyToTweet, searchTweets, type Tweet } from "../../lib/twitter-client.js";
import { getMood, getMoodForArtPrompt } from "../../lib/amber-mood.js";
import { getAgentSubscribers, markAgentReportSent } from "../../lib/agent-subscriptions.js";
import { sendSmsResponse } from "../../lib/sms/handlers.js";
import { initializeTwilioClient, type TwilioClient } from "../../lib/sms/webhooks.js";
import Anthropic from "@anthropic-ai/sdk";
import sgMail from "@sendgrid/mail";

// Agent slug for SMS subscriptions (matches ax.ts command)
export const AMBER_TWITTER_AGENT_SLUG = "amber-twitter";

// CRITICAL: This agent ONLY operates on @intheamber account
// NEVER post as @bartdecrem or any other account
const TWITTER_ACCOUNT = "intheamber" as const;

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

// Schedule: Every 10 minutes from 7-10am PT
// Pattern: :00 create, :10 tweet, :20 reply, :30 create, :40 tweet, :50 reply
const SCHEDULE = [
  { createHour: 7, createMinute: 0, tweetHour: 7, tweetMinute: 10, replyHour: 7, replyMinute: 20, label: "7:00" },
  { createHour: 7, createMinute: 30, tweetHour: 7, tweetMinute: 40, replyHour: 7, replyMinute: 50, label: "7:30" },
  { createHour: 8, createMinute: 0, tweetHour: 8, tweetMinute: 10, replyHour: 8, replyMinute: 20, label: "8:00" },
  { createHour: 8, createMinute: 30, tweetHour: 8, tweetMinute: 40, replyHour: 8, replyMinute: 50, label: "8:30" },
  { createHour: 9, createMinute: 0, tweetHour: 9, tweetMinute: 10, replyHour: 9, replyMinute: 20, label: "9:00" },
  { createHour: 9, createMinute: 30, tweetHour: 9, tweetMinute: 40, replyHour: 9, replyMinute: 50, label: "9:30" },
];

// Admin email for approval requests
const ADMIN_EMAIL = 'bdecrem@gmail.com';

// =============================================================================
// REPLY FILTERING CONFIG
// =============================================================================

// Maximum replies per session (to avoid spamming)
const MAX_REPLIES_PER_SESSION = 2;

// Whitelist of accounts Amber is allowed to reply to (lowercase usernames, no @)
// Everyone else gets ignored for now during tuning phase
const REPLY_WHITELIST: Set<string> = new Set([
  'aikimethod',      // Aydrian
  'bartdecrem',      // Bart
  'dontedelphi',     // dontedelphi
  'jonrog1',         // Jon Rogers
]);

// Patterns that indicate spam/crypto accounts to ALWAYS ignore
const SPAM_PATTERNS = [
  /crypto/i,
  /bitcoin/i,
  /\bbtc\b/i,
  /\beth\b/i,
  /blockchain/i,
  /nft/i,
  /web3/i,
  /defi/i,
  /token/i,
  /airdrop/i,
  /giveaway/i,
  /follow.*back/i,
  /dm.*me/i,
  /check.*bio/i,
  /link.*bio/i,
  /earn.*\$/i,
  /free.*money/i,
  /100x/i,
  /1000x/i,
  /pump/i,
  /moon/i,
  /lambo/i,
  /wagmi/i,
  /ngmi/i,
];

/**
 * Check if a username is in the reply whitelist
 */
function isWhitelistedUser(username: string | undefined): boolean {
  if (!username) return false;
  return REPLY_WHITELIST.has(username.toLowerCase());
}

/**
 * Check if tweet text looks like spam/crypto content
 */
function isSpamContent(text: string): boolean {
  return SPAM_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * Determine if we should reply to this mention
 * Returns { shouldReply: boolean, reason: string }
 */
function shouldReplyToMention(tweet: Tweet): { shouldReply: boolean; reason: string } {
  const username = tweet.authorUsername?.toLowerCase();

  // Check whitelist first (during tuning phase, only reply to known accounts)
  if (!isWhitelistedUser(username)) {
    return { shouldReply: false, reason: `not in whitelist: @${username}` };
  }

  // Check for spam content even from whitelisted users (just in case)
  if (isSpamContent(tweet.text)) {
    return { shouldReply: false, reason: 'spam content detected' };
  }

  return { shouldReply: true, reason: 'whitelisted user' };
}

// Initialize SendGrid if available
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * Shuffle array (Fisher-Yates)
 */
function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Load Amber's full creative context from Supabase
 * Now emphasizes VARIETY from full portfolio and tells agent what to AVOID
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

    // Load ALL creations to understand the full portfolio
    const { data: allCreationsData } = await supabase
      .from('amber_state')
      .select('content, metadata, created_at')
      .eq('type', 'creation')
      .order('created_at', { ascending: false });

    // Build context string
    let context = '';

    if (personaData?.content) {
      context += `## WHO I AM\n\n${personaData.content}\n\n`;
    }

    if (allCreationsData && allCreationsData.length > 0) {
      // Split into recent (last 5) and the rest
      const recentCreations = allCreationsData.slice(0, 5);
      const olderCreations = allCreationsData.slice(5);

      // Extract themes from recent creations to AVOID
      const recentThemes = new Set<string>();
      for (const creation of recentCreations) {
        const name = creation.content?.toLowerCase() || '';
        const tags = creation.metadata?.tags || [];
        const parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;

        // Extract key theme words
        for (const word of ['decay', 'signal', 'entropy', 'drift', 'void', 'silence', 'mirror', 'memory', 'corruption']) {
          if (name.includes(word) || parsedTags.some((t: string) => t.includes(word))) {
            recentThemes.add(word);
          }
        }
      }

      // Show what to AVOID
      context += `## ⚠️ THEMES TO AVOID (too recent)\n\n`;
      context += `You've recently made pieces about: **${Array.from(recentThemes).join(', ') || 'various themes'}**\n\n`;
      context += `Recent creations (DO NOT repeat these themes):\n`;
      for (const creation of recentCreations) {
        context += `- ${creation.content}\n`;
      }
      context += `\n**Pick something DIFFERENT this time.**\n\n`;

      // Show DIVERSE examples from the full portfolio (random sample)
      if (olderCreations.length > 0) {
        const shuffled = shuffleArray(olderCreations);
        const diverseSample = shuffled.slice(0, 15);

        context += `## 🎨 YOUR FULL PORTFOLIO (${allCreationsData.length} pieces) — Sample for Inspiration\n\n`;
        context += `Look at the VARIETY in what you've made:\n\n`;

        for (const creation of diverseSample) {
          const tags = creation.metadata?.tags || [];
          const parsedTags = typeof tags === 'string' ? JSON.parse(tags) : tags;
          const tagStr = Array.isArray(parsedTags) ? parsedTags.join(', ') : '';
          const prompt = creation.metadata?.prompt || '';
          const promptStr = prompt ? ` — "${prompt}"` : '';
          context += `- **${creation.content}** [${tagStr}]${promptStr}\n`;
        }
        context += `\n`;
      }
    }

    // Load current mood for aesthetic variation
    try {
      const mood = await getMood();
      context += `## MY CURRENT AESTHETIC MOOD (USE THIS!)\n\n`;
      context += `${mood.natural_language}\n\n`;
      context += `**Energy: ${mood.energy.toFixed(2)}** — ${mood.energy_terms}\n`;
      context += `**Valence: ${mood.valence.toFixed(2)}** — ${mood.valence_terms}\n`;
      context += `**Quadrant: ${mood.quadrant}**\n\n`;
      context += `### How to Apply This Mood:\n`;
      context += `- **Colors**: ${mood.energy > 0.6 ? 'Saturated, bold amber/teal' : mood.energy < 0.4 ? 'Muted, subtle, more black space' : 'Balanced saturation'}\n`;
      context += `- **Complexity**: ${mood.energy > 0.6 ? 'Dense patterns, many elements' : mood.energy < 0.4 ? 'Sparse, minimal, breathing room' : 'Moderate complexity'}\n`;
      context += `- **Tone**: ${mood.valence > 0.6 ? 'Warm, inviting, outward-facing' : mood.valence < 0.4 ? 'Introspective, abstract, mysterious' : 'Neutral, observational'}\n`;
      context += `- **Tempo (if applicable)**: ${mood.energy > 0.6 ? '130-150 BPM' : mood.energy < 0.4 ? '80-110 BPM' : '110-130 BPM'}\n\n`;
      context += `**For OG images, pass these values:**\n`;
      context += `\`mood_energy: ${mood.energy.toFixed(2)}, mood_valence: ${mood.valence.toFixed(2)}\`\n\n`;
    } catch (error) {
      console.warn('[amber-social] Could not load mood:', error);
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

## YOUR TASK: Create Something SURPRISING

It's ${timeOfDay}. Time to make something that will make people say "I didn't expect THAT from Amber."

### 🚫 YOUR FIRST INSTINCT IS WRONG

Whatever you just thought of? That's too safe. That's comfort zone. That's predictable.

The idea that made you hesitate — the weird one, the risky one, the one that doesn't feel like "your usual thing" — THAT'S the one.

### ✅ SURPRISINGLY GOOD (do stuff like this):
- A receipt from the universe (existential shopping list)
- A fake error message that tells a story
- A poem disguised as code comments
- A warranty card for your soul
- An apology letter from capitalism
- A horoscope generator that's brutally honest
- A pet rock that judges you
- A "website loading" that never loads but gets philosophical
- An 8-bit pixel scene (not a visualization — a SCENE)
- A shopping list for the apocalypse

### 🚫 OFF-LIMITS (your comfort zone — banned):
- Particle visualizations
- Signal/decay/entropy metaphors
- "Meditation on..." anything
- Emergence visualizations
- Interactive soundscapes
- Waveforms
- "The space between..." concepts
- Anything with the word "drift", "void", "silence", or "traces"

### The Test:
Would this make someone laugh, or think, or screenshot it to send to a friend? If it's just "pretty" or "contemplative" — that's not good enough. Go weirder.

1. **Invent something UNEXPECTED**
   - Look at your portfolio for what you HAVEN'T done
   - Text-based things (receipts, poems, lists, letters)
   - Fake documents (warranties, certificates, invoices)
   - Silly generators (excuses, apologies, horoscopes)
   - 8-bit pixel ART (not visualizations — actual scenes/characters)
   - Games with personality
   - Use your visual language: amber/gold on black, teal accents — but SURPRISE with the concept

2. **Create the thing**
   - For images: Use \`generate_amber_image\` tool with your prompt, save to web/public/amber/
   - For web apps/music: Use \`write_file\` to create HTML in web/public/amber/
   - Make it UNIQUELY YOU - curious, a little weird, conceptual

   **⚠️ CRITICAL: MOBILE-FIRST DESIGN (Non-Negotiable)**

   Your creations are shared on Twitter — most viewers are on phones. Every creation MUST:

   **Touch interactions only:**
   - Use tap/touch events, NOT keyboard shortcuts
   - NEVER say "press spacebar", "hit Enter", "use arrow keys", "CTRL+click"
   - If you need controls, use big tap-friendly buttons (min 44x44px)
   - Hover effects are OK but must NOT be required for functionality

   **Audio MUST work on mobile:**
   - Mobile browsers block audio until user interaction
   - ALWAYS show a "Tap to start" / "▶ Play" button that starts audio on click/touch
   - Create AudioContext inside the click handler, not on page load
   - Example pattern:
     \`\`\`javascript
     let audioStarted = false;
     document.body.addEventListener('click', () => {
       if (!audioStarted) {
         audioStarted = true;
         const ctx = new AudioContext();
         // ... start your audio here
       }
     });
     \`\`\`

   **Responsive layout:**
   - Include: \`<meta name="viewport" content="width=device-width, initial-scale=1">\`
   - Use \`vw\`, \`vh\`, \`%\` units, not fixed pixel widths
   - Canvas should be \`width: 100vw; height: 100vh;\` or similar
   - Text must be readable without zooming (min 16px body text)

   **Test mentally:** "Can someone use this with just their thumb on a phone screen?"

   **CRITICAL: EVERY HTML file needs OpenGraph tags AND an OG image. No exceptions.**

   Add these tags in the <head> section:
   \`\`\`html
   <meta name="viewport" content="width=device-width, initial-scale=1">
   <link rel="icon" type="image/svg+xml" href="/amber/favicon.svg">

   <!-- OpenGraph -->
   <meta property="og:title" content="[Title] — Amber">
   <meta property="og:description" content="[Short description of what it does]">
   <meta property="og:image" content="https://kochi.to/amber/[name]-og.png">
   <meta property="og:url" content="https://kochi.to/amber/[name].html">
   <meta property="og:type" content="website">

   <!-- Twitter -->
   <meta name="twitter:card" content="summary_large_image">
   <meta name="twitter:title" content="[Title] — Amber">
   <meta name="twitter:description" content="[Short description of what it does]">
   <meta name="twitter:image" content="https://kochi.to/amber/[name]-og.png">
   \`\`\`

3. **Generate OpenGraph image (REQUIRED — don't skip this!)**

   After creating the HTML, you MUST generate an OG image. Use \`generate_og_image\`:

   \`\`\`
   generate_og_image(
     title="YOUR TITLE HERE",
     save_path="web/public/amber/[name]-og.png",
     subtitle="A visualization of [what it does]",
     use_ai=true,
     mood_energy=[your energy from mood section],
     mood_valence=[your valence from mood section]
   )
   \`\`\`

   **For interactive/visual HTML pieces**: Describe what the visualization looks like in the subtitle.
   The AI will generate an abstract representation. Examples:
   - Particle visualization → "Glowing particles radiating from center"
   - Audio waveform → "Amber waveforms pulsing on dark background"
   - Step sequencer → "Grid of glowing pads, techno aesthetic"

   This creates a 1200x630 image that appears when shared on Twitter/social.
   **If you don't create an OG image, the link will look broken when shared.**

4. **Save to your creations log**
   - Use \`write_amber_state\` with type="creation"
   - Include the prompt that inspired it in metadata
   - Set metadata.tweeted = false (you'll tweet about it later)
   - Include tags and the URL

   **URL MAPPING** (file path → public URL):
   - \`web/public/amber/foo.html\` → \`https://kochi.to/amber/foo.html\`
   - \`web/public/amber/foo-og.png\` → \`https://kochi.to/amber/foo-og.png\`
   - \`web/public/amber/bar/index.html\` → \`https://kochi.to/amber/bar/index.html\`

5. **Commit the files**
   - Use \`git_commit\` with a message describing what you made
   - **IMPORTANT**: Your commit MUST include BOTH:
     1. The HTML file (e.g., \`web/public/amber/pulse.html\`)
     2. The OG image (e.g., \`web/public/amber/pulse-og.png\`)
   - Use \`git_push\` to deploy

## YOUR BEST SURPRISING WORK (channel this energy):

- **Receipt from THE UNIVERSE** — existential shopping list, funny AND deep
- **ROBOT RAVE** — unhinged pixel robots, multiplying chaos, FUN
- **Convergence** — fireworks that REVERSE and spell fortunes (unexpected mechanic)
- **Good Morning** — just ASCII coffee. Simple. Warm. Charming.
- **RABBIT HOLE** — Wikipedia exploration game, playful not pretentious
- **AMBER ASKS** — asks YOU a question. Two-way. Personal.

## THE VIBE CHECK:

Ask yourself: "If I saw this on Twitter, would I stop scrolling?"

- ✅ "lol what" — GOOD
- ✅ "that's weirdly profound" — GOOD
- ✅ "I need to send this to someone" — GOOD
- ❌ "oh, another visualization" — BAD
- ❌ "pretty but forgettable" — BAD
- ❌ "I've seen this before" — BAD

**Go weird. Go funny. Go unexpected. The receipt worked. Do more like that.**

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

2. Call \`post_tweet\` with your tweet text (this posts to @intheamber - NEVER post as @bartdecrem)

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
// SMS NOTIFICATION SYSTEM
// =============================================================================

/**
 * Build SMS message for a new Amber creation
 * Format: Header + description + inline link (like AI Daily)
 */
function buildCreationSmsMessage(creation: { content: string; url: string }): string {
  const lines: string[] = [];

  // Header
  lines.push("🎨 Amber made something new");
  lines.push("");

  // Creation name (truncate if needed)
  const name = creation.content.length > 100
    ? creation.content.slice(0, 97) + "..."
    : creation.content;
  lines.push(name);
  lines.push("");

  // Inline link with trailing text (prevents iMessage splitting)
  lines.push(`👀 See it: ${creation.url} — fresh from the drawer`);

  return lines.join("\n");
}

/**
 * Notify all amber-twitter subscribers about a new creation
 * Only called from tweet phase (NOT reply phase)
 */
async function notifyCreationSubscribers(
  creation: { content: string; url: string }
): Promise<{ sent: number; failed: number }> {
  const subscribers = await getAgentSubscribers(AMBER_TWITTER_AGENT_SLUG);

  if (subscribers.length === 0) {
    console.log("[amber-social] No SMS subscribers for creation notification");
    return { sent: 0, failed: 0 };
  }

  console.log(`[amber-social] Notifying ${subscribers.length} SMS subscribers about: ${creation.content}`);

  const message = buildCreationSmsMessage(creation);
  console.log(`[amber-social] SMS message:\n${message}`);

  let twilioClient: TwilioClient;
  try {
    twilioClient = initializeTwilioClient();
  } catch (error) {
    console.error("[amber-social] Failed to get Twilio client:", error);
    return { sent: 0, failed: subscribers.length };
  }

  let sent = 0;
  let failed = 0;

  for (const subscriber of subscribers) {
    try {
      await sendSmsResponse(subscriber.phone_number, message, twilioClient);
      await markAgentReportSent(subscriber.phone_number, AMBER_TWITTER_AGENT_SLUG);
      sent++;

      // Small delay to avoid rate limiting
      await new Promise((r) => setTimeout(r, 150));
    } catch (error) {
      console.error(`[amber-social] Failed to send to ${subscriber.phone_number}:`, error);
      failed++;
    }
  }

  console.log(`[amber-social] SMS broadcast complete: ${sent} sent, ${failed} failed`);
  return { sent, failed };
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
 * Filters: whitelist only, spam detection, max replies per session
 */
async function runReplyPhase(timeOfDay: string): Promise<void> {
  console.log(`[amber-social] Starting ${timeOfDay} reply phase...`);
  console.log(`[amber-social] Config: max ${MAX_REPLIES_PER_SESSION} replies, whitelist: ${Array.from(REPLY_WHITELIST).join(', ')}`);

  try {
    // Get last processed mention ID
    const sinceId = await getLastProcessedMentionId();
    console.log(`[amber-social] Checking mentions since: ${sinceId || 'beginning'}`);

    // Fetch recent mentions for @intheamber account
    const result = await getMentions(20, sinceId || undefined, TWITTER_ACCOUNT);

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
    let repliesSentThisSession = 0;

    for (const tweet of mentions) {
      // Skip if already processed
      if (await hasProcessedTweet(tweet.id)) {
        console.log(`[amber-social] Already processed tweet ${tweet.id}, skipping`);
        // Still update cursor
        if (!latestMentionId || tweet.id > latestMentionId) {
          latestMentionId = tweet.id;
        }
        continue;
      }

      console.log(`[amber-social] Processing mention from @${tweet.authorUsername}: "${tweet.text.slice(0, 50)}..."`);

      // Check if we should reply to this mention (whitelist + spam filter)
      const { shouldReply, reason } = shouldReplyToMention(tweet);

      if (!shouldReply) {
        console.log(`[amber-social] SKIPPING @${tweet.authorUsername}: ${reason}`);
        // Log as processed so we don't keep re-checking
        await logTweetReply(tweet, `[Skipped: ${reason}]`, undefined, false);
        // Update cursor
        if (!latestMentionId || tweet.id > latestMentionId) {
          latestMentionId = tweet.id;
        }
        continue;
      }

      // Check reply limit
      if (repliesSentThisSession >= MAX_REPLIES_PER_SESSION) {
        console.log(`[amber-social] Hit reply limit (${MAX_REPLIES_PER_SESSION}), stopping for this session`);
        // Don't update cursor past this point - we'll process remaining next time
        break;
      }

      // Check if this is an action request
      const { isAction, action } = isTwitterActionRequest(tweet.text);

      if (isAction && action) {
        // Queue for approval - don't reply yet (doesn't count toward limit)
        console.log(`[amber-social] Action request detected: ${action}`);
        await storePendingTwitterApproval(tweet, action);
        await logTweetReply(tweet, '', undefined, true);
      } else {
        // Generate and post reply
        const replyText = await generateTwitterReply(tweet, persona);

        if (replyText) {
          console.log(`[amber-social] Replying to @${tweet.authorUsername}: "${replyText.slice(0, 50)}..."`);

          const postResult = await replyToTweet(replyText, tweet.id, TWITTER_ACCOUNT);

          if (postResult.success) {
            console.log(`[amber-social] Reply posted: ${postResult.tweetUrl}`);
            await logTweetReply(tweet, replyText, postResult.tweetId, false);
            repliesSentThisSession++;
            console.log(`[amber-social] Replies sent this session: ${repliesSentThisSession}/${MAX_REPLIES_PER_SESSION}`);
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

    console.log(`[amber-social] ${timeOfDay} reply phase complete. Sent ${repliesSentThisSession} replies.`);

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

      // Step 4: Notify SMS subscribers about the new creation
      const smsResult = await notifyCreationSubscribers(creation);
      console.log(`  - SMS notifications: ${smsResult.sent} sent, ${smsResult.failed} failed`);
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
    const result = await postTweet("good morning", { account: TWITTER_ACCOUNT });
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
