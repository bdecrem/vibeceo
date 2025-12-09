/**
 * Auto-Tweet Script for Token Tank
 *
 * Runs daily at 12pm PT via launchd (on dev Mac only)
 * Posts about agent activity, or news if no activity
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

async function main() {
  console.log('[auto-tweet] Starting...');
  console.log(`[auto-tweet] Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`);

  // Check if we should run
  if (!shouldRun()) {
    process.exit(0);
  }

  // Detect activity
  console.log('[auto-tweet] Detecting activity...');
  const activity = detectActivity();
  console.log(`[auto-tweet] Activity detected: ${activity.hasActivity}`);
  if (activity.hasActivity) {
    console.log(`[auto-tweet] Summary: ${activity.summary}`);
  }

  // Generate tweet
  console.log('[auto-tweet] Generating tweet...');
  const tweet = await generateTweet(activity);
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
