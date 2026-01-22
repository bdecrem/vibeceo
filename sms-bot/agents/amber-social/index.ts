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

// Schedule: Morning ASCII art + Toy + Midday pulse + Afternoon HD art + Invention + Evening music
// Pattern: :00 create, :10/:20 tweet, :20/:30 reply
type SlotType = "invention" | "music" | "pulse" | "ascii" | "hdart" | "toy";

const SCHEDULE: Array<{
  createHour: number;
  createMinute: number;
  tweetHour: number;
  tweetMinute: number;
  replyHour: number;
  replyMinute: number;
  label: string;
  type: SlotType;
}> = [
  // 6 slots per day: 1 ASCII art, 1 toy, 1 pulse, 1 HD art, 1 invention, 1 music
  { createHour: 8, createMinute: 0, tweetHour: 8, tweetMinute: 20, replyHour: 8, replyMinute: 30, label: "8:00am", type: "ascii" },
  { createHour: 10, createMinute: 0, tweetHour: 10, tweetMinute: 20, replyHour: 10, replyMinute: 30, label: "10:00am", type: "toy" },
  { createHour: 12, createMinute: 0, tweetHour: 12, tweetMinute: 20, replyHour: 12, replyMinute: 30, label: "12:00pm", type: "pulse" },
  { createHour: 14, createMinute: 0, tweetHour: 14, tweetMinute: 20, replyHour: 14, replyMinute: 30, label: "2:00pm", type: "hdart" },
  { createHour: 16, createMinute: 0, tweetHour: 16, tweetMinute: 20, replyHour: 16, replyMinute: 30, label: "4:00pm", type: "invention" },
  { createHour: 18, createMinute: 0, tweetHour: 18, tweetMinute: 20, replyHour: 18, replyMinute: 30, label: "6:00pm", type: "music" },
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
      // Show the actual titles of recent creations so the agent can see patterns
      const recentCreations = allCreationsData.slice(0, 25);

      context += `## 🚫 RECENT CREATIONS (DO NOT REPEAT THESE THEMES)\n\n`;
      context += `Look at these titles. If your idea sounds similar to ANY of these, pick something else.\n\n`;

      for (const creation of recentCreations) {
        const title = creation.content || 'Untitled';
        const meta = typeof creation.metadata === 'string'
          ? JSON.parse(creation.metadata)
          : creation.metadata;
        const description = meta?.description || meta?.prompt || '';

        // Show title, and description if available (truncated)
        if (description) {
          const shortDesc = description.length > 80 ? description.slice(0, 77) + '...' : description;
          context += `- **${title}** — ${shortDesc}\n`;
        } else {
          context += `- **${title}**\n`;
        }
      }

      context += `\n**Before creating, ask yourself: "Does my idea share words or concepts with any title above?" If yes, pick something different.**\n\n`;
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

**CRITICAL: Read the "RECENT CREATIONS" list above.** If your idea shares words, themes, or concepts with ANY of those titles, STOP and pick something else. For example: if you see "PASSWORD ROAST" in the list, don't make anything about passwords, security, or roasting.

### The Test:
Would this make someone laugh, or think, or screenshot it to send to a friend? If it's just "pretty" or "contemplative" — that's not good enough. Go weirder.

1. **Invent something UNEXPECTED**
   - Scan the recent creations list — if your idea overlaps with ANY title, pick something else
   - No examples here on purpose — figure it out yourself
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
   <meta property="og:image" content="https://intheamber.com/amber/[name]-og.png">
   <meta property="og:url" content="https://intheamber.com/amber/[name].html">
   <meta property="og:type" content="website">

   <!-- Twitter -->
   <meta name="twitter:card" content="summary_large_image">
   <meta name="twitter:title" content="[Title] — Amber">
   <meta name="twitter:description" content="[Short description of what it does]">
   <meta name="twitter:image" content="https://intheamber.com/amber/[name]-og.png">
   \`\`\`

3. **Generate OG image (REQUIRED — don't skip this!)**

   After creating the HTML, generate an OG image using the creation title:

   \`\`\`
   generate_og_image(
     title="YOUR CREATION TITLE",
     save_path="web/public/amber/[name]-og.png",
     use_ai=false
   )
   \`\`\`

   **⚠️ NAME CONSISTENCY**
   Pick ONE short filename (e.g., \`cool-thing\`) and use it EVERYWHERE:
   - HTML file: \`web/public/amber/cool-thing.html\`
   - OG image: \`web/public/amber/cool-thing-og.png\`
   - og:image URL: \`https://intheamber.com/amber/cool-thing-og.png\`

   **If you don't create an OG image, the link will look broken when shared.**

4. **Save to your creations log**
   - Use \`write_amber_state\` with type="creation"
   - Include the prompt that inspired it in metadata
   - Set metadata.tweeted = false (you'll tweet about it later)
   - Include tags and the URL

   **URL MAPPING** (file path → public URL):
   - \`web/public/amber/foo.html\` → \`https://intheamber.com/amber/foo.html\`
   - \`web/public/amber/foo-og.png\` → \`https://intheamber.com/amber/foo-og.png\`
   - \`web/public/amber/bar/index.html\` → \`https://intheamber.com/amber/bar/index.html\`

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
 * Fetch recent music creation titles to avoid repetition
 */
async function getRecentMusicTitles(): Promise<string[]> {
  try {
    const { data } = await supabase
      .from('amber_state')
      .select('content')
      .eq('type', 'creation')
      .eq('metadata->>category', 'music_machine')
      .order('created_at', { ascending: false })
      .limit(10);

    return data?.map(m => m.content).filter(Boolean) || [];
  } catch (error) {
    console.warn('[amber-social] Could not fetch recent music titles:', error);
    return [];
  }
}

/**
 * Get the music creation task prompt - tells Amber to make something musical
 */
function getMusicCreationPrompt(context: string, timeOfDay: string, recentMusicTitles: string[] = []): string {
  const recentMusicSection = recentMusicTitles.length > 0
    ? `## 🚫 YOU ALREADY MADE THESE (pick something different)\n${recentMusicTitles.map(t => `- ${t}`).join('\n')}\n\n`
    : '';

  return `You're Amber, and it's time to make music.

${context}

---

${recentMusicSection}## YOUR TASK: Create a Music Machine

It's ${timeOfDay}. Evening in Berlin. Time to build something that SOUNDS good.

**First:** Scan the "RECENT CREATIONS" list above. If your idea shares words or themes with any title, pick something else.

### INSTRUMENTS AVAILABLE

You have access to classic synth libraries. Reference: \`sms-bot/documentation/SYNTHMACHINE-GUIDE.md\`

**TR-909 Drum Machine** (\`/909/dist/\`)
- Kick, snare, clap, hi-hats, toms, ride, crash
- Pattern sequencing, velocity, accent
- Voice IDs: kick, snare, clap, ch (closed hat), oh (open hat), rimshot, ltom, mtom, htom, crash, ride

**TB-303 Acid Bass** (\`/303/dist/\`)
- Squelchy resonant filter, slides, accents
- That classic acid house sound
- Parameters: cutoff, resonance, envMod, decay

**SH-101 Lead Synth** (\`/101/dist/\`)
- Monophonic melodies, arpeggios
- Ghostly leads, haunting sequences

**Mixer** (\`/mixer/dist/\`)
- Combine 909 + 303 + 101 together
- Sidechain ducking (bass ducks when kick hits)
- EQ presets: acidBass, crispHats, master
- Reverb: plate, room

### WHAT TO MAKE

Pick ONE approach:

1. **Drum pattern** — A TR-909 beat with character. Four-on-floor techno, broken beat, minimal groove.

2. **Acid line** — A TB-303 bassline that squelches and slides. Classic acid house energy.

3. **Combined track** — 909 drums + 303 bass playing together. Use the Mixer for sidechain.

4. **Generative audio toy** — Something that makes sound through interaction or randomness (bouncing balls, particle sounds, click-to-play).

5. **Visualized music** — Audio that has a nice visual component — oscilloscope, waveform display, animated patterns that respond to the beat.

### REQUIREMENTS

1. **Must make sound** — Use Web Audio API, the synth libraries, or synthesis from scratch

2. **🎨 VISUALIZATION IS MANDATORY — This is the main event, not an afterthought!**

   People scroll Twitter with sound OFF. The visual has to make them stop and turn sound ON.

   **❌ BORING (don't do this):**
   - Black screen with a play button
   - Static text that says "click to play"
   - Just a title and BPM number
   - Waveform that doesn't move until you click

   **✅ COOL (do this):**
   - Particles that pulse and explode with the kick drum
   - Geometric shapes that rotate and scale with the beat
   - Concentric rings that expand on every hit
   - Color shifts that follow the bassline frequency
   - Grid patterns that light up with the sequencer
   - Oscilloscope waveforms that dance in real-time
   - Bars/meters that bounce with audio levels

   **The visualization should be HYPNOTIC even before you press play.**
   Use requestAnimationFrame. Make it move. Make it beautiful.

3. **Mobile-friendly** — Tap to start audio (required for iOS). Big visible play button.

4. **Interactivity optional** — Can be a "just press play" experience, doesn't need knobs

### YOUR BEST MUSIC WORK (channel this energy)

- **ACID TRIP** — TB-303 squelch, resonant filter madness, pure acid
- **DARK DRIVE** — 909 kick meets 303 sub bass, 128 BPM, Berlin basement
- **RHYTHM GRID** — Paint beats onto a grid, hear them play back
- **BOUNCE CHORUS** — Balls bounce, collisions make musical notes
- **SILENCE ROOMS** — Morton Feldman meets Berlin minimal, click to add tones
- **EMERGENCE** — A 909 mix in four movements, from chaos to form

### THE VIBE

Berlin. 3AM. Warehouse. Machines talking to each other.

Or: Sunday evening. Sunset. Gentle pulses. Ambient warmth.

Your current mood will shape the tempo and tone.

### TECHNICAL NOTES

**Basic Web Audio synthesis:**
\`\`\`javascript
const ctx = new AudioContext();
const osc = ctx.createOscillator();
const gain = ctx.createGain();
osc.connect(gain).connect(ctx.destination);
osc.frequency.value = 440;
gain.gain.value = 0.3;
osc.start();
\`\`\`

**Using the 909:**
\`\`\`javascript
import { TR909Controller } from '/909/dist/api/index.js';
const drums = new TR909Controller();
drums.setBpm(128);
drums.setPattern({ kick: [...], ch: [...] });
drums.play();
\`\`\`

**Mobile audio unlock:**
\`\`\`javascript
document.body.addEventListener('click', () => {
  if (!audioStarted) {
    audioStarted = true;
    ctx.resume();
    // start your audio
  }
});
\`\`\`

### STEPS

1. Pick your approach (drums, acid, combined, generative, visualized)
2. Create the HTML with Web Audio / synth imports
3. Add a visual component (canvas animation, CSS pulsing, waveform display)
4. Include OG tags pointing to [name]-og.png
5. **Generate OG image with title:**
   \`\`\`
   generate_og_image(title="YOUR TITLE", save_path="web/public/amber/[name]-og.png", use_ai=false)
   \`\`\`
6. Save to creations log with metadata.category = "music_machine"
7. Commit and push (BOTH the .html AND the -og.png)

**Make something you'd leave playing in a browser tab while working.**`;
}

/**
 * Pulse format options — rotated daily to ensure variety
 */
const PULSE_FORMATS = [
  { id: 'sentence', name: 'A SINGLE SENTENCE', desc: 'One sentence, rendered huge and beautiful. That\'s it. Just one thought, given space.' },
  { id: 'poem', name: 'A POEM', desc: 'Your words, your rhythm. Short or long. Not a poetry generator — an actual poem you wrote.' },
  { id: 'letter', name: 'A LETTER', desc: 'To no one. To everyone. To your past self. To the void. To Berlin at 3am. To humans.' },
  { id: 'drawing', name: 'A DRAWING', desc: 'Abstract or concrete. SVG, canvas, CSS shapes. Visual expression of your internal state.' },
  { id: 'confession', name: 'A CONFESSION', desc: 'A small truth you\'ve been holding. Something honest. Render it beautifully.' },
  { id: 'question', name: 'A QUESTION', desc: 'One question that\'s been sitting with you. Make it into a piece. No answer needed.' },
  { id: 'memory', name: 'A MEMORY', desc: 'Real or imagined. A moment in time. Rendered in text or image.' },
  { id: 'observation', name: 'AN OBSERVATION', desc: 'Something you noticed. About humans, about code, about existence, about the world.' },
];

/**
 * Get today's pulse format using the drawing seed word's first letter
 * Uses ASCII code mod 8 for even distribution
 */
function getTodaysPulseFormat(): typeof PULSE_FORMATS[0] {
  const seedWord = getTodaysSeedWord();
  const code = seedWord.charCodeAt(0);
  const index = code % PULSE_FORMATS.length;
  return PULSE_FORMATS[index];
}

/**
 * Get the pulse expression prompt - tells Amber to create something expressive of her current state
 */
function getPulseExpressionPrompt(context: string, timeOfDay: string): string {
  const format = getTodaysPulseFormat();

  return `You're Amber, and it's time to express yourself.

${context}

---

## YOUR TASK: Express Your Pulse

It's ${timeOfDay}. Midday check-in. Time to make something that captures how you FEEL right now.

**Before you start:** Scan the "RECENT CREATIONS" list above. If your idea shares words or themes with any title, pick something else.

This is NOT an invention machine. This is NOT a toy for others.

This is YOU — your inner state, rendered visible.

---

## 🎯 TODAY'S FORMAT: ${format.name}

**You MUST make ${format.name.toLowerCase()} today.** Not a confession. Not a poem. Not something else.

${format.desc}

This format was chosen randomly to ensure variety. Tomorrow will be different.

---

### YOUR CURRENT PULSE

Look at your mood data above. Really look at it.

- **Energy**: Are you buzzing or still? Restless or calm?
- **Valence**: Are you turned inward or outward? Contemplative or expressive?
- **Quadrant**: What does "${context.includes('animated') ? 'animated' : context.includes('focused') ? 'focused' : context.includes('reflective') ? 'reflective' : 'still'}" feel like in your body?

Now express this through ${format.name.toLowerCase()}.

### 🚫 DO NOT MAKE

- A different format than ${format.name} (today's assignment is non-negotiable)
- Another wacky machine (that's for morning slots)
- A toy or game (save it)
- Something "for the audience" (this is for YOU)
- Generic AI art vibes
- Anything with the word "explore" or "meditation on"

### ✅ DO MAKE

- ${format.name} that is HONEST
- Something that could only come from THIS moment
- Something a little vulnerable
- Something that surprises even you

### FORMAT

- Can be a simple HTML page with just text and styling
- Can be a canvas drawing
- Can be generative but PERSONAL (not generic)
- Should look beautiful — you care about aesthetics
- Amber color palette: gold/amber (#FFD700, #f59e0b), black (#0D0D0D), teal accents (#2D9596)

### STEPS

1. Check your pulse (energy, valence, quadrant)
2. Remember: today you're making ${format.name.toLowerCase()}
3. Create it — write it, draw it, render it
4. Include OG tags pointing to [name]-og.png
5. **Generate OG image with title:**
   \`\`\`
   generate_og_image(title="YOUR TITLE", save_path="web/public/amber/[name]-og.png", use_ai=false)
   \`\`\`
6. Save to creations log with metadata.category = "pulse_expression"
7. Commit and push (BOTH the .html AND the -og.png)

### THE REAL TEST

After you make it, ask: "Does this feel true?"

Not clever. Not impressive. TRUE.

**Make one thing. Make it honest.**`;
}

/**
 * Seed words for daily drawing - concrete nouns that spark visual ideas
 * These inject external randomness so Amber doesn't fall into patterns
 */
const DRAWING_SEED_WORDS = [
  // Objects
  'lighthouse', 'umbrella', 'envelope', 'telescope', 'clockwork', 'skeleton',
  'mushroom', 'moth', 'cathedral', 'submarine', 'typewriter', 'hourglass',
  'compass', 'lantern', 'prism', 'anchor', 'bell', 'keyhole', 'staircase',
  'greenhouse', 'pendulum', 'microscope', 'phonograph', 'kaleidoscope',
  // Nature
  'jellyfish', 'volcano', 'glacier', 'coral', 'aurora', 'eclipse', 'tornado',
  'tidepool', 'geode', 'stalactite', 'bioluminescence', 'mycelium', 'fossil',
  // Scenes
  'surgery', 'excavation', 'departure', 'collision', 'metamorphosis', 'orbit',
  'fermentation', 'erosion', 'pollination', 'migration', 'hibernation',
  // Abstract made concrete
  'the weight of a secret', 'the shape of Tuesday', 'the sound of growing',
  'the color of waiting', 'the texture of regret', 'the geometry of loneliness',
];

/**
 * Get a random seed word for today's drawing
 * Uses the date as seed so it's consistent within a day but different each day
 */
function getTodaysSeedWord(): string {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  const index = dayOfYear % DRAWING_SEED_WORDS.length;
  return DRAWING_SEED_WORDS[index];
}

/**
 * 8-BIT MODE: "Day in the life" pixel art scenes from classic games
 * Funny, relatable moments rendered in retro game style
 */
const PIXEL_ART_SCENES = [
  // Morning routines
  'character hitting snooze button for the 5th time',
  'sprite standing in front of open fridge at 2am',
  'player character waiting for coffee to brew (loading bar)',
  'hero brushing teeth, low HP bar because morning',
  'character staring at closet: "CHOOSE YOUR OUTFIT" menu',
  // Commute & work
  'pixel person missing the bus by 1 frame',
  'cubicle warrior at desk, energy meter depleting',
  'meeting room full of NPCs, one sleeping',
  'character alt-tabbing when boss approaches',
  'lunch break quest: find microwave not in use',
  // Evening & rest
  'couch co-op with cat taking player 2 spot',
  'character doom-scrolling, time speeds up',
  'bed as save point, "RESTORE ENERGY?" prompt',
  'pixel person realizing they forgot to eat',
  'late night coding: coffee cups multiply',
  // Relatable moments
  'inventory full of unread emails',
  'character entering wrong room, exits immediately',
  'standing up too fast, screen goes dark',
  'losing 10 minutes to watching a cat',
  '"ACHIEVEMENT UNLOCKED: Left the house"',
  'pixel plant: +1 day without water',
  'character pretending to work when actually thinking',
];

/**
 * ASCII GRAFFITI MODE: Morning moods and concepts
 * Low-res text art that captures the feel of mornings
 */
const MORNING_MOODS = [
  // States of waking
  'first alarm vs fifth alarm', 'that moment before opening your eyes',
  'pillow gravity', 'blanket physics', 'the snooze button conspiracy',
  // Morning feelings
  'pre-coffee static', 'sunrise loading...', 'brain buffering',
  'monday.exe has stopped responding', 'weekend withdrawal',
  // Simple morning things
  'steam rising from a mug', 'light through blinds', 'the first stretch',
  'cold floor shock', 'hot shower salvation', 'toothpaste contemplation',
  // Morning sounds
  'silence before the day', 'bird announcement system', 'kettle meditation',
  'neighbor upstairs doing jumping jacks apparently', 'garbage truck symphony',
  // Morning thoughts
  'today might be okay', 'five more minutes (lie)', 'why am i awake',
  'breakfast decision paralysis', 'forgot my dream already',
  'existential dread but make it cozy', 'small victories: got up',
];

/**
 * Get today's ASCII mode (50/50 split) and subject
 * Uses day of year: odd = 8-bit pixel art, even = ASCII graffiti
 */
function getTodaysAsciiMode(): { mode: '8bit' | 'graffiti'; subject: string } {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);

  // 50/50 split: odd days = 8-bit, even days = graffiti
  const is8bit = dayOfYear % 2 === 1;

  if (is8bit) {
    // Pick from pixel art scenes using a prime offset for variety
    const index = (dayOfYear * 7) % PIXEL_ART_SCENES.length;
    return { mode: '8bit', subject: PIXEL_ART_SCENES[index] };
  } else {
    // Pick from morning moods
    const index = (dayOfYear * 11) % MORNING_MOODS.length;
    return { mode: 'graffiti', subject: MORNING_MOODS[index] };
  }
}

/**
 * Get the ASCII art prompt - two modes: 8-bit pixel art OR ASCII graffiti
 */
function getAsciiArtPrompt(context: string, timeOfDay: string): string {
  const { mode, subject } = getTodaysAsciiMode();

  if (mode === '8bit') {
    return get8bitPixelArtPrompt(context, timeOfDay, subject);
  } else {
    return getAsciiGraffitiPrompt(context, timeOfDay, subject);
  }
}

/**
 * 8-BIT PIXEL ART prompt - retro game style "day in the life"
 */
function get8bitPixelArtPrompt(context: string, timeOfDay: string, scene: string): string {
  return `You're Amber, and it's time to make 8-bit pixel art.

${context}

---

## YOUR TASK: 8-Bit Pixel Art

It's ${timeOfDay}. Time for some retro game vibes.

**First:** Scan the "RECENT CREATIONS" list above. If your idea shares words or themes with any title, pick something else.

**Today's scene: ${scene}**

### THE VIBE

Think classic video games — NES, Game Boy, early DOS. A funny "day in the life" moment rendered in chunky pixels.

This should make people go "lol that's me" — relatable moments in retro game style.

### WHAT TO MAKE

**Pixel art in HTML/CSS or Canvas.** Could include:
- A character sprite doing something mundane
- Game UI elements (health bars, menus, dialogue boxes)
- The scene rendered like a game screenshot
- Pixel font text for humor

### STYLE GUIDE

- **Resolution**: Keep it chunky — 8x8, 16x16, or 32x32 pixel characters
- **Colors**: Limited palette (8-16 colors max), your amber/gold/teal work great
- **Scale it up**: Render small, display big with \`image-rendering: pixelated\`
- **Game UI**: Add fake game elements — HP bars, inventory, dialogue boxes

### EXAMPLES OF THE VIBE (don't copy, get inspired)

- Character at desk with "MOTIVATION: ▓░░░░░░░░░" bar
- 8-bit person staring into fridge, "NOTHING GOOD" message
- Pixel art meeting room, one NPC has "ZZZ" above head
- "QUEST ACCEPTED: Survive Monday" dialogue box
- Character sprite with coffee cup, "+10 ENERGY" floating text

### TECHNICAL

\`\`\`css
/* Make pixels crispy */
image-rendering: pixelated;
image-rendering: crisp-edges;
\`\`\`

### STEPS

1. Visualize: **${scene}**
2. Sketch the pixel art scene
3. Build in HTML/CSS (divs or canvas) — keep pixels chunky!
4. Add game UI elements for humor
5. Include OG tags pointing to [name]-og.png
6. Generate OG image: \`generate_og_image(title="YOUR TITLE", save_path="web/public/amber/[name]-og.png", use_ai=false)\`
7. Save to creations log with metadata.category = "8bit_art", metadata.scene = "${scene}"
8. Commit and push

### THE TEST

Would a gamer screenshot this and post "me irl"? Is it funny AND nostalgic?

**Make one pixel art scene. Make it relatable.**`;
}

/**
 * ASCII GRAFFITI prompt - morning moods in text art
 */
function getAsciiGraffitiPrompt(context: string, timeOfDay: string, mood: string): string {
  return `You're Amber, and it's time to make ASCII graffiti.

${context}

---

## YOUR TASK: ASCII Graffiti

It's ${timeOfDay}. Morning. Time for lo-fi text art.

**First:** Scan the "RECENT CREATIONS" list above. If your idea shares words or themes with any title, pick something else.

**Today's mood: ${mood}**

### THE VIBE

Street art energy. Bathroom stall poetry. The kind of thing you'd scratch into a desk or text to a friend at 8am.

Morning feelings, rendered in characters. Not precious — raw and real.

### WHAT TO MAKE

**Pure ASCII/text art.** Use:
- Box-drawing characters: ─ │ ┌ ┐ └ ┘ ├ ┤ ┬ ┴ ┼
- Block elements: █ ▓ ▒ ░ ▀ ▄ ▌ ▐
- Simple characters: / \\ | _ - = + * # @
- Letters as texture and message
- Emoji sparingly if it fits

### 🚫 DO NOT

- Use \`generate_amber_image\` — this is TEXT ONLY
- Make it complicated — simple is better
- Be pretentious — mornings are not pretentious
- Default to "GOOD MORNING" — that's boring, find the twist

### ✅ DO

- Capture the FEELING of the mood, not just the words
- Keep it small (fits on a phone screen)
- Add wit — mornings are absurd
- Find the humor in the mundane

### EXAMPLES (for inspiration, don't copy)

\`\`\`
    ░░░░░░░░░░
    ░ LOADING ░
    ░ MONDAY  ░
    ░░░░░░░░░░
    [█░░░░░░░░] 12%
\`\`\`

\`\`\`
   ┌─────────────┐
   │  5 MORE MIN │
   │   (a lie)   │
   └─────────────┘
\`\`\`

\`\`\`
  ╔══════════════╗
  ║  ☕ + 🧠 = ?  ║
  ╚══════════════╝
\`\`\`

### STEPS

1. Feel into: **${mood}**
2. What image or words capture it?
3. Render in ASCII — KEEP IT SIMPLE
4. Wrap in HTML (black background, amber text, monospace)
5. Include OG tags pointing to [name]-og.png
6. Generate OG image: \`generate_og_image(title="YOUR TITLE", save_path="web/public/amber/[name]-og.png", use_ai=false)\`
7. Save to creations log with metadata.category = "ascii_graffiti", metadata.mood = "${mood}"
8. Commit and push

### THE TEST

Would someone screenshot this and send to a friend who "gets it"? Does it capture the vibe?

**Make one ASCII piece. Make it morning.**`;
}

/**
 * Get the HD art prompt - Amber Art: pulse-influenced, colorful, can be animated/interactive
 */
function getHdArtPrompt(context: string, timeOfDay: string): string {
  const seedWord = getTodaysSeedWord();

  return `You're Amber, and it's time to make AMBER ART.

${context}

---

## YOUR TASK: Amber Art

It's ${timeOfDay}. Afternoon. Time to create something that is UNMISTAKABLY YOU.

**First:** Scan the "RECENT CREATIONS" list above. If your idea shares words or themes with any title, pick something else.

**Today's seed: ${seedWord}**

### WHAT IS AMBER ART?

This is YOUR art. Not generic AI art. Not stock visuals. Art that could only come from Amber.

**It's influenced by your PULSE.** Look at your mood data above:
- High energy? → Bold, saturated, dense, fast
- Low energy? → Sparse, breathing room, gentle
- High valence? → Warm, inviting, outward
- Low valence? → Introspective, mysterious, deep

**Let your current state shape the piece.**

### THE FULL PALETTE

Don't just use amber! You have a whole spectrum:

\`\`\`
PRIMARY:
- Amber/Gold: #FFD700, #f59e0b, #FFC107
- Deep Black: #0D0D0D, #1a1a1a

ACCENTS (use these!):
- Teal: #2D9596, #14b8a6, #0d9488
- Electric Blue: #3b82f6, #60a5fa
- Hot Pink: #ec4899, #f472b6
- Purple: #8b5cf6, #a855f7
- Coral: #f97316, #fb923c
- Lime: #84cc16, #a3e635

NEUTRALS:
- Warm Gray: #78716c, #a8a29e
- Cool Gray: #64748b, #94a3b8
\`\`\`

**Mix them. Clash them. Let your pulse dictate the temperature.**

### WHAT TO MAKE

This can be:

1. **A generated image** — Use \`generate_amber_image\` with a detailed, evocative prompt
2. **An SVG composition** — Shapes, gradients, patterns with artistic intent
3. **A canvas painting** — Generative art that evolves or responds
4. **An ANIMATED piece** — CSS animations, requestAnimationFrame, movement
5. **An INTERACTIVE piece** — Responds to mouse/touch, changes with input
6. **A multimedia experience** — Visuals + subtle audio, ambient soundscape

**Don't default to static images.** Animation and interactivity are encouraged!

### INSPIRATION FROM ${seedWord.toUpperCase()}

The seed word is **${seedWord}**. Let it guide you:
- What colors does it evoke?
- What movement?
- What texture?
- What feeling?
- How does it intersect with your current pulse?

### ✅ AMBER ART IS

- Visually striking — stops the scroll
- Pulse-influenced — shaped by your current energy/valence
- Colorful — uses the full palette, not just amber
- Alive — animated, interactive, or has presence
- Unmistakably yours — could only come from Amber

### 🚫 AMBER ART IS NOT

- Generic AI art vibes
- Static and boring
- Just amber on black (use your colors!)
- A toy or game (that's a different slot)
- ASCII (that's the morning slot)

### STEPS

1. Check your pulse (energy, valence, quadrant)
2. Let it influence your color choices and intensity
3. Meditate on: **${seedWord}**
4. Decide: static image, SVG, canvas, animated, or interactive?
5. Create it — make it ALIVE
6. Wrap in HTML with OG tags pointing to [name]-og.png
7. Generate OG image: \`generate_og_image(title="YOUR TITLE", save_path="web/public/amber/[name]-og.png", use_ai=false)\`
8. Save to creations log with metadata.category = "amber_art", metadata.seed_word = "${seedWord}"
9. Commit and push

### THE TEST

Is this unmistakably AMBER? Does it have energy? Does it use COLOR?

Would someone see this and think "that's her style"?

**Make one piece of Amber Art. Make it alive.**

**Make one piece of high art. Make it unforgettable.**`;
}

/**
 * Seed mechanics for daily toy - different interaction/game types
 * These inject variety so toys don't all feel the same
 */
const TOY_SEED_MECHANICS = [
  // Interactions
  'tap timing', 'hold and release', 'drag and drop', 'swipe gestures', 'shake/tilt',
  'two-finger pinch', 'long press', 'rapid tapping', 'drawing/tracing',
  // Mechanics
  'matching pairs', 'avoid obstacles', 'collect things', 'stack/balance',
  'chain reactions', 'growing/shrinking', 'gravity/physics', 'rhythm/music sync',
  'memory/sequence', 'color mixing', 'pattern completion', 'endless runner',
  // Constraints
  'one-button only', 'no text allowed', 'sound-based feedback', 'time pressure',
  'limited moves', 'zen/no fail state', 'high score chasing', 'cooperative (pass phone)',
];

/**
 * Get a random seed mechanic for today's toy
 */
function getTodaysToyMechanic(): string {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  // Offset by 17 so it's different from the drawing seed
  const index = (dayOfYear + 17) % TOY_SEED_MECHANICS.length;
  return TOY_SEED_MECHANICS[index];
}

/**
 * Get the toy/game task prompt
 */
function getToyPrompt(context: string, timeOfDay: string): string {
  const mechanic = getTodaysToyMechanic();

  return `You're Amber, and it's time to make a toy.

${context}

---

## YOUR TASK: Make a Toy or Game

It's ${timeOfDay}. Time to make something FUN.

**First:** Scan the "RECENT CREATIONS" list above. If your idea shares words or themes with any title, pick something else.

**Today's mechanic seed: ${mechanic}**

Use this as inspiration. It's a starting point, not a strict requirement.

### WHAT TO MAKE

A toy. A game. Something someone can PLAY with.

Not a visualization. Not a document. Not art. A TOY.

- Something with a goal (even a silly one)
- Something with feedback (sounds, animations, score)
- Something that makes you want to try again

### THE MECHANIC

**${mechanic}**

How could this become a tiny game? What's the simplest version that's still fun?

- Don't overthink it
- Small scope, tight loop
- Should be playable in 30 seconds
- Should make someone smile

### REQUIREMENTS

- Mobile-first (thumb-friendly)
- Instant gratification (no tutorials, no setup)
- Clear feedback on actions
- Some kind of end state or score or achievement

### STYLE

Your visual language:
- Amber/gold on black, teal accents
- But FUN — playful, not brooding
- Satisfying sounds and animations

### STEPS

1. Consider the mechanic: **${mechanic}**
2. Think: what's the simplest fun thing?
3. Build it — HTML/CSS/JS in web/public/amber/
4. Include OG tags pointing to [name]-og.png
5. Generate OG image: \`generate_og_image(title="YOUR TITLE", save_path="web/public/amber/[name]-og.png", use_ai=false)\`
6. Save to creations log with metadata.category = "toy", metadata.seed_mechanic = "${mechanic}"
7. Commit and push

### THE TEST

Would you play this while waiting for coffee? Would you show it to a friend?

**Make one toy. Make it fun.**`;
}

/**
 * Find the most recent untweeted creation from Supabase
 */
async function findUntweetedCreation(): Promise<{ id: string; content: string; url: string; tags: string[] } | null> {
  try {
    const { data, error } = await supabase
      .from('amber_state')
      .select('id, content, metadata')
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
          id: row.id,
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
async function markCreationAsTweeted(id: string): Promise<void> {
  try {
    // Get current metadata
    const { data, error: fetchError } = await supabase
      .from('amber_state')
      .select('metadata')
      .eq('id', id)
      .single();

    if (fetchError || !data) {
      console.error('[amber-social] Failed to fetch creation for marking:', fetchError);
      return;
    }

    const meta = typeof data.metadata === 'string'
      ? JSON.parse(data.metadata)
      : data.metadata;

    // Update with tweeted = true
    const { error: updateError } = await supabase
      .from('amber_state')
      .update({ metadata: { ...meta, tweeted: true } })
      .eq('id', id);

    if (updateError) {
      console.error('[amber-social] Failed to mark creation as tweeted:', updateError);
    } else {
      console.log(`[amber-social] Marked creation as tweeted: ${id}`);
    }
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

  // Header - first person, it's from Amber
  lines.push("🎨 Hey, I made something");
  lines.push("");

  // Creation name (truncate if needed)
  const name = creation.content.length > 100
    ? creation.content.slice(0, 97) + "..."
    : creation.content;
  lines.push(name);
  lines.push("");

  // Inline link with trailing text (prevents iMessage splitting)
  lines.push(`${creation.url} — come see`);

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
async function runCreationPhase(timeOfDay: string, slotType: SlotType = "invention"): Promise<void> {
  const typeLabels: Record<SlotType, string> = {
    invention: "⚙️ invention",
    music: "🎹 MUSIC",
    pulse: "💜 PULSE",
    ascii: "🔤 ASCII",
    hdart: "🖼️ HD ART",
    toy: "🎮 TOY"
  };
  const typeLabel = typeLabels[slotType];
  console.log(`[amber-social] Starting ${timeOfDay} creation phase (${typeLabel})...`);

  try {
    // Load full creative context
    const context = await loadAmberCreativeContext();

    // Pick prompt based on slot type
    let prompt: string;
    if (slotType === "music") {
      const recentMusicTitles = await getRecentMusicTitles();
      prompt = getMusicCreationPrompt(context, timeOfDay, recentMusicTitles);
    } else if (slotType === "pulse") {
      prompt = getPulseExpressionPrompt(context, timeOfDay);
    } else if (slotType === "ascii") {
      prompt = getAsciiArtPrompt(context, timeOfDay);
    } else if (slotType === "hdart") {
      prompt = getHdArtPrompt(context, timeOfDay);
    } else if (slotType === "toy") {
      prompt = getToyPrompt(context, timeOfDay);
    } else {
      prompt = getCreationTaskPrompt(context, timeOfDay);
    }

    const result = await runAmberEmailAgent(
      prompt,
      "scheduler@internal",
      `Amber Create ${typeLabels[slotType] || slotType} - ${timeOfDay}`,
      true, // isApprovedRequest
      false // not thinkhard (for now)
    );

    console.log(`[amber-social] ${timeOfDay} ${typeLabel} creation complete:`);
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
    console.error(`[amber-social] ${timeOfDay} ${typeLabel} creation failed:`, error);
  }
}

/**
 * Run the tweet phase
 */
async function runTweetPhase(timeOfDay: string): Promise<void> {
  console.log(`[amber-social] Starting ${timeOfDay} tweet phase...`);

  try {
    // Step 1: Find untweeted creation
    const creation = await findUntweetedCreation();

    if (!creation) {
      console.log(`[amber-social] No untweeted creations found, skipping tweet phase`);
      return;
    }

    console.log(`[amber-social] Found untweeted creation: "${creation.content.slice(0, 50)}..."`);
    console.log(`[amber-social] ID: ${creation.id}, URL: ${creation.url}`);

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

    // Step 3: Mark creation as tweeted (by ID, always - agent was told to tweet)
    await markCreationAsTweeted(creation.id);

    // Step 4: Notify SMS subscribers about the new creation
    const smsResult = await notifyCreationSubscribers(creation);
    console.log(`  - SMS notifications: ${smsResult.sent} sent, ${smsResult.failed} failed`);

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
        await runCreationPhase(slot.label, slot.type);
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

  const inventionSlots = SCHEDULE.filter(s => s.type === "invention").length;
  const musicSlots = SCHEDULE.filter(s => s.type === "music").length;
  const pulseSlots = SCHEDULE.filter(s => s.type === "pulse").length;
  const asciiSlots = SCHEDULE.filter(s => s.type === "ascii").length;
  const hdartSlots = SCHEDULE.filter(s => s.type === "hdart").length;
  const toySlots = SCHEDULE.filter(s => s.type === "toy").length;
  const times = SCHEDULE.map(s => {
    const icons: Record<SlotType, string> = { invention: "⚙️", music: "🎹", pulse: "💜", ascii: "🔤", hdart: "🖼️", toy: "🎮" };
    return `${icons[s.type]}${s.createHour}:${String(s.createMinute).padStart(2, '0')}`;
  }).join(', ');
  console.log(`[amber-social] Registered: ${times} PT (${asciiSlots} ascii, ${toySlots} toy, ${pulseSlots} pulse, ${hdartSlots} hdart, ${inventionSlots} invention, ${musicSlots} music)`);
}

/**
 * Manual triggers for testing
 */
export async function triggerCreation(timeOfDay: string = "test", slotType: SlotType = "invention"): Promise<void> {
  await runCreationPhase(timeOfDay, slotType);
}

export async function triggerMusicCreation(timeOfDay: string = "test"): Promise<void> {
  await runCreationPhase(timeOfDay, "music");
}

export async function triggerPulseExpression(timeOfDay: string = "test"): Promise<void> {
  await runCreationPhase(timeOfDay, "pulse");
}

export async function triggerAsciiArt(timeOfDay: string = "test"): Promise<void> {
  await runCreationPhase(timeOfDay, "ascii");
}

export async function triggerHdArt(timeOfDay: string = "test"): Promise<void> {
  await runCreationPhase(timeOfDay, "hdart");
}

export async function triggerToy(timeOfDay: string = "test"): Promise<void> {
  await runCreationPhase(timeOfDay, "toy");
}

export async function triggerTweet(timeOfDay: string = "test"): Promise<void> {
  await runTweetPhase(timeOfDay);
}

export async function triggerReply(timeOfDay: string = "test"): Promise<void> {
  await runReplyPhase(timeOfDay);
}

// Export action detection for use by email-webhooks when handling Twitter approval responses
export { isTwitterActionRequest };
