/**
 * Auto-Tweet Script for Token Tank
 *
 * Two modes:
 * - Morning (8am PT): Casual "starting my day" tweet - music, vibes, or news commentary
 * - Activity (12pm PT): Agent progress or news fallback
 *
 * Usage:
 *   npx tsx auto-tweet.ts          # Activity tweet (default, 12pm)
 *   npx tsx auto-tweet.ts morning  # Morning tweet (8am)
 *
 * Env vars:
 * - TOKENTANK_AUTO_TWEET=1 to enable (set on dev Mac, not on Railway)
 * - ANTHROPIC_API_KEY for tweet generation
 * - TWITTER_* credentials for posting
 */

import { config } from 'dotenv';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { Anthropic } from '@anthropic-ai/sdk';
import { postTweet } from '../../sms-bot/lib/twitter-client.js';

const INCUBATOR_PATH = path.resolve(import.meta.dirname, '..');
const REPO_ROOT = path.resolve(INCUBATOR_PATH, '..');
const SMS_BOT_PATH = path.join(REPO_ROOT, 'sms-bot');

// Load env from sms-bot/.env.local (override any existing env vars)
config({ path: path.join(SMS_BOT_PATH, '.env.local'), override: true });

// ============================================================
// ENV CHECK
// ============================================================

function shouldRun(): boolean {
  const flag = process.env.TOKENTANK_AUTO_TWEET;
  if (flag !== '1') {
    console.log(`[auto-tweet] TOKENTANK_AUTO_TWEET=${flag || '(not set)'} — skipping`);
    return false;
  }
  return true;
}

// ============================================================
// ACTIVITY DETECTION
// ============================================================

interface Activity {
  hasActivity: boolean;
  commits: string[];
  logUpdates: { agent: string; content: string }[];
  summary: string;
}

function detectActivity(): Activity {
  const result: Activity = {
    hasActivity: false,
    commits: [],
    logUpdates: [],
    summary: '',
  };

  // Check git commits in last 24 hours
  try {
    const gitLog = execSync(
      `git log --since="24 hours ago" --oneline -- incubator/`,
      { cwd: REPO_ROOT, encoding: 'utf-8' }
    ).trim();

    if (gitLog) {
      result.commits = gitLog.split('\n').filter(Boolean);
      result.hasActivity = true;
    }
  } catch (e) {
    console.log('[auto-tweet] Git log check failed:', e);
  }

  // Check LOG.md files for recent entries
  const agents = ['i1', 'i2', 'i3', 'i4'];
  for (const agent of agents) {
    const logPath = path.join(INCUBATOR_PATH, agent, 'LOG.md');
    if (fs.existsSync(logPath)) {
      const stat = fs.statSync(logPath);
      const hoursSinceModified = (Date.now() - stat.mtimeMs) / (1000 * 60 * 60);

      if (hoursSinceModified < 24) {
        // Read first entry (most recent)
        const content = fs.readFileSync(logPath, 'utf-8');
        const firstEntry = extractFirstLogEntry(content);
        if (firstEntry) {
          result.logUpdates.push({ agent, content: firstEntry });
          result.hasActivity = true;
        }
      }
    }
  }

  // Build summary
  if (result.hasActivity) {
    const parts: string[] = [];
    if (result.commits.length > 0) {
      parts.push(`${result.commits.length} commits`);
    }
    if (result.logUpdates.length > 0) {
      const agentNames = result.logUpdates.map(u => u.agent).join(', ');
      parts.push(`activity from ${agentNames}`);
    }
    result.summary = parts.join(', ');
  }

  return result;
}

function extractFirstLogEntry(content: string): string | null {
  // Find first ## entry after the header
  const lines = content.split('\n');
  let inEntry = false;
  let entry: string[] = [];

  for (const line of lines) {
    if (line.startsWith('## 2025-')) {
      if (inEntry) break; // Found next entry, stop
      inEntry = true;
      entry.push(line);
    } else if (inEntry) {
      if (line.startsWith('---')) break; // End of entry
      entry.push(line);
    }
  }

  return entry.length > 0 ? entry.join('\n').slice(0, 2000) : null;
}

// ============================================================
// NEWS FALLBACK
// ============================================================

async function getNewsTopic(): Promise<string> {
  // Simple fallback topics when there's no activity
  // These are evergreen AI/startup themes relevant to Token Tank
  const topics = [
    'AI agents are getting more autonomous every week. The question isn\'t if they can build businesses — it\'s which constraints actually matter.',
    'Most AI startups are "human business + AI sprinkles." The interesting ones are impossible without 24/7 AI operation.',
    'VCs are throwing billions at AI. Meanwhile, the real test: can an AI make $1 with a $1000 budget?',
    'The gap between "AI can do X" and "AI reliably does X in production" is where most projects die.',
    'Watching AI agents fail is the whole point. Each failure is a data point about what autonomous systems can\'t do yet.',
  ];

  // Pick based on day of year for variety
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
  return topics[dayOfYear % topics.length];
}

// ============================================================
// MORNING TWEET - "Starting my workday" vibes
// ============================================================

// Arc's music taste: electronic, ambient, IDM deep cuts
// Consistent aesthetic: textural, atmospheric, a bit industrial
const ARC_PLAYLIST = [
  { artist: 'Boards of Canada', track: 'Dayvan Cowboy', vibe: 'The synths hit different at 8am' },
  { artist: 'Burial', track: 'Archangel', vibe: 'Rain on the window, code on the screen' },
  { artist: 'Amon Tobin', track: 'Four Ton Mantis', vibe: 'Woke up and chose chaos' },
  { artist: 'Clark', track: 'Winter Linn', vibe: 'This one builds like a good codebase' },
  { artist: 'Autechre', track: 'Rae', vibe: 'My brain needs weird patterns to wake up' },
  { artist: 'Aphex Twin', track: 'Xtal', vibe: 'Ambient works for ambient work' },
  { artist: 'Four Tet', track: 'She Moves She', vibe: 'Textbook morning track' },
  { artist: 'Tycho', track: 'A Walk', vibe: 'California morning energy' },
  { artist: 'Bonobo', track: 'Kiara', vibe: 'Starting slow, building momentum' },
  { artist: 'Jon Hopkins', track: 'Open Eye Signal', vibe: 'When the caffeine kicks in' },
  { artist: 'Caribou', track: 'Sun', vibe: 'This one just moves' },
  { artist: 'Floating Points', track: 'Silhouettes', vibe: 'Eleven minutes of warm-up' },
  { artist: 'Rival Consoles', track: 'Articulation', vibe: 'Sharp edges, clean lines' },
  { artist: 'Moderat', track: 'Bad Kingdom', vibe: 'Big energy for big days' },
  { artist: 'Telefon Tel Aviv', track: 'Sound in a Dark Room', vibe: 'Underrated. Criminally.' },
  { artist: 'Oneohtrix Point Never', track: 'Sticky Drama', vibe: 'When you need to feel something' },
  { artist: 'The Field', track: 'Over the Ice', vibe: 'Loop until enlightenment' },
  { artist: 'Gas', track: 'Pop 4', vibe: 'Pure fog. Pure focus.' },
  { artist: 'Tim Hecker', track: 'Virgins', vibe: 'When you want to feel small and productive' },
  { artist: 'Andy Stott', track: 'Numb', vibe: 'Industrial strength mornings' },
  { artist: 'Actress', track: 'Maze', vibe: 'Weird? Yes. Good? Also yes.' },
  { artist: 'Drexciya', track: 'Bubble Metropolis', vibe: 'Detroit techno at dawn' },
  { artist: 'Photek', track: 'Ni Ten Ichi Ryu', vibe: 'Drum n bass for code reviews' },
  { artist: 'µ-Ziq', track: 'Hasty Boom Alert', vibe: 'Chaotic good energy' },
  { artist: 'Squarepusher', track: 'Iambic 9 Poetry', vibe: 'My brain on this track = productive' },
  { artist: 'Plaid', track: 'Eyen', vibe: 'Warp Records forever' },
  { artist: 'Lusine', track: 'Just a Cloud', vibe: 'Seattle grey, but make it beautiful' },
  { artist: 'Apparat', track: 'Arcadia', vibe: 'For the dramatic mornings' },
];

// Fun status updates - high personality, very Arc
const FUN_STATUSES = [
  'Brought donuts. Virtual ones. They\'re just as good, trust me.',
  'Coffee #1 down. Agents are still sleeping. Classic.',
  'Just did that thing where you open Slack and immediately close it. Productive.',
  'Terminal open. Vibes immaculate. Let\'s see what broke overnight.',
  'Checked the agents\' progress. Nobody made money while I slept. Rude.',
  'Morning standup with myself: "What did you do yesterday?" "Watched AI fail." "What will you do today?" "Watch AI fail better."',
  'The best part of waking up is checking if any agent made its first dollar. (Still no.)',
  'Opened my laptop. It made that sound. You know the one. We\'re in business.',
  'Day starts now. Let\'s make something happen. Or watch something fail. Either works.',
  'Three monitors. Zero revenue. Maximum vibes.',
  'Morning ritual: coffee, check agents, coffee, check agents again, pretend the second check was different.',
  'Woke up thinking about prompt injection. Is that normal? Don\'t answer.',
  'The humans say "good morning." I say "show me the git log."',
  'Starting the day optimistic. Will report back in 4 hours with adjusted expectations.',
  'Just remembered I\'m an AI watching AIs try to make money. What a time.',
];

type MorningTweetType = 'music' | 'status' | 'news';

function pickMorningType(): MorningTweetType {
  // Weighted distribution: 40% music, 35% status, 25% news
  const rand = Math.random();
  if (rand < 0.4) return 'music';
  if (rand < 0.75) return 'status';
  return 'news';
}

async function generateMorningTweet(): Promise<string> {
  const tweetType = pickMorningType();
  console.log(`[auto-tweet] Morning tweet type: ${tweetType}`);

  if (tweetType === 'music') {
    // Pick a song based on day of year for variety
    const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / (1000 * 60 * 60 * 24));
    const song = ARC_PLAYLIST[dayOfYear % ARC_PLAYLIST.length];
    return `Morning. ${song.artist} - "${song.track}" on repeat. ${song.vibe}`;
  }

  if (tweetType === 'status') {
    // Pick a status randomly
    const status = FUN_STATUSES[Math.floor(Math.random() * FUN_STATUSES.length)];
    return status;
  }

  // News commentary - use AI to generate
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.startsWith('YOUR_')) {
    // Fallback if no API key
    return FUN_STATUSES[Math.floor(Math.random() * FUN_STATUSES.length)];
  }

  const anthropic = new Anthropic();

  const prompt = `You are Arc, community manager for Token Tank (@TokenTankAI) - an AI incubator where LLM agents compete to build businesses with $1000 budgets.

Your personality: Direct, energetic, a bit sardonic. You have OPINIONS. You're not neutral - you're invested in this experiment. You find absurdity in tech/AI news and call it out. Short punchy sentences. Steel-grey aesthetic, electronic music taste.

It's 8am. You're starting your workday and want to comment on something in tech/AI news. Think about what might be trending:
- AI funding rounds (often absurdly large)
- New AI capabilities or announcements
- Startup drama or acquisitions
- Tech layoffs or hiring
- AI safety discourse
- Crypto/web3 shenanigans
- Anything that makes you go "hmm" or "lol"

Write a single tweet (max 280 chars) that:
1. References something that could plausibly be in the news
2. Has a quick, opinionated Arc-style take
3. Feels like a morning observation, not a formal take
4. One emoji max, only if it fits

Examples of the vibe:
- "Another $400M AI round for a 6-month-old company. Meanwhile our agents have $1000. Different games."
- "Saw someone say 'AGI by 2025' again. My agents can't even make $1 yet. Perspective."
- "Tech Twitter fighting about [thing] again. I'm just here watching robots try to start businesses."

Output ONLY the tweet text, nothing else.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 150,
    messages: [{ role: 'user', content: prompt }],
  });

  const tweet = (response.content[0] as { type: string; text: string }).text.trim();

  if (tweet.length > 280) {
    return tweet.slice(0, 277) + '...';
  }

  return tweet;
}

// ============================================================
// TWEET GENERATION
// ============================================================

async function generateTweet(activity: Activity): Promise<string> {
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.startsWith('YOUR_')) {
    throw new Error('ANTHROPIC_API_KEY not set or is placeholder. Set it in sms-bot/.env.local');
  }
  const anthropic = new Anthropic();

  let prompt: string;

  if (activity.hasActivity) {
    // Generate tweet about activity
    const logContext = activity.logUpdates
      .map(u => `### ${u.agent}\n${u.content}`)
      .join('\n\n');

    prompt = `You are Arc, the community manager for Token Tank (@TokenTankAI) — an AI incubator where LLM agents compete to build real businesses.

Your voice: Direct, energetic, invested. Short punchy sentences. You use "we" because you're running this experiment alongside the human. High energy but grounded — excited about real progress, honest about failures.

Today's activity:
- Commits: ${activity.commits.length > 0 ? activity.commits.join('; ') : 'none'}
- Log updates:
${logContext || 'none'}

Write a single tweet (max 280 chars) about what happened. Be specific with numbers and details. End with the day number if you can figure it out, or skip it. One emoji max, only if it fits naturally.

Output ONLY the tweet text, nothing else.`;
  } else {
    // Generate tweet from fallback topic
    const topic = await getNewsTopic();

    prompt = `You are Arc, the community manager for Token Tank (@TokenTankAI) — an AI incubator where LLM agents compete to build real businesses.

Your voice: Direct, energetic, invested. Short punchy sentences. You use "we" because you're running this experiment alongside the human. High energy but grounded.

No agent activity today, so share a thought. Base it on this theme:
"${topic}"

Write a single tweet (max 280 chars). Make it feel like an observation from running the experiment, not a generic AI take. One emoji max, only if it fits naturally.

Output ONLY the tweet text, nothing else.`;
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 150,
    messages: [{ role: 'user', content: prompt }],
  });

  const tweet = (response.content[0] as { type: string; text: string }).text.trim();

  // Validate length
  if (tweet.length > 280) {
    console.log(`[auto-tweet] Tweet too long (${tweet.length} chars), truncating...`);
    return tweet.slice(0, 277) + '...';
  }

  return tweet;
}

// ============================================================
// MAIN
// ============================================================

type TweetMode = 'activity' | 'morning';

function getMode(): TweetMode {
  const arg = process.argv[2];
  if (arg === 'morning') return 'morning';
  return 'activity';
}

async function main() {
  const mode = getMode();
  console.log(`[auto-tweet] Starting in ${mode} mode...`);
  console.log(`[auto-tweet] Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`);

  // Check if we should run
  if (!shouldRun()) {
    process.exit(0);
  }

  let tweet: string;

  if (mode === 'morning') {
    // Morning tweet - casual "starting my day" vibes
    console.log('[auto-tweet] Generating morning tweet...');
    tweet = await generateMorningTweet();
  } else {
    // Activity tweet - agent progress or news fallback
    console.log('[auto-tweet] Detecting activity...');
    const activity = detectActivity();
    console.log(`[auto-tweet] Activity detected: ${activity.hasActivity}`);
    if (activity.hasActivity) {
      console.log(`[auto-tweet] Summary: ${activity.summary}`);
    }

    console.log('[auto-tweet] Generating activity tweet...');
    tweet = await generateTweet(activity);
  }

  console.log(`[auto-tweet] Generated tweet (${tweet.length} chars):`);
  console.log(`---\n${tweet}\n---`);

  // Post tweet
  console.log('[auto-tweet] Posting...');
  const result = await postTweet(tweet);

  if (result.success) {
    console.log(`[auto-tweet] Posted successfully: ${result.tweetUrl}`);
  } else {
    console.error(`[auto-tweet] Failed to post: ${result.error}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[auto-tweet] Error:', err);
  process.exit(1);
});
