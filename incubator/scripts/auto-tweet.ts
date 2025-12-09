/**
 * Auto-Tweet Script for Token Tank
 *
 * This script launches Arc, the Token Tank community manager agent.
 * Arc wakes up, checks on the experiment, and posts a tweet.
 *
 * Two modes:
 * - Morning (8am PT): Arc shares music, vibes, or news commentary
 * - Activity (12pm PT): Arc checks agent progress and posts updates
 *
 * Usage:
 *   npx tsx auto-tweet.ts          # Activity tweet (default, 12pm)
 *   npx tsx auto-tweet.ts morning  # Morning tweet (8am)
 *
 * Env vars:
 * - TOKENTANK_AUTO_TWEET=1 to enable (set on dev Mac, not on Railway)
 * - ANTHROPIC_API_KEY for Arc agent
 * - TWITTER_* credentials for posting
 */

import { config } from 'dotenv';
import { spawn } from 'child_process';
import path from 'path';

const REPO_ROOT = path.resolve(import.meta.dirname, '../..');
const SMS_BOT_PATH = path.join(REPO_ROOT, 'sms-bot');
const ARC_AGENT_PATH = path.join(SMS_BOT_PATH, 'agents/arc/agent.py');

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
// RUN ARC AGENT
// ============================================================

type TweetMode = 'activity' | 'morning';

function getMode(): TweetMode {
  const arg = process.argv[2];
  if (arg === 'morning') return 'morning';
  return 'activity';
}

async function runArcAgent(mode: TweetMode): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve) => {
    console.log(`[auto-tweet] Launching Arc agent in ${mode} mode...`);

    // Run Arc agent with Python
    const python = spawn('python3', [ARC_AGENT_PATH, mode, '--verbose'], {
      cwd: SMS_BOT_PATH,
      env: {
        ...process.env,
        // Ensure the API key is passed through
        ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
        // Also set CLAUDE_AGENT_SDK_TOKEN if needed
        CLAUDE_AGENT_SDK_TOKEN: process.env.ANTHROPIC_API_KEY,
      },
    });

    let output = '';
    let errorOutput = '';

    python.stdout.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });

    python.stderr.on('data', (data) => {
      const text = data.toString();
      errorOutput += text;
      process.stderr.write(text);
    });

    python.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output });
      } else {
        console.error(`[auto-tweet] Arc agent exited with code ${code}`);
        resolve({ success: false, output: errorOutput || output });
      }
    });

    python.on('error', (err) => {
      console.error(`[auto-tweet] Failed to spawn Arc agent:`, err);
      resolve({ success: false, output: err.message });
    });

    // Timeout after 2 minutes
    setTimeout(() => {
      python.kill();
      resolve({ success: false, output: 'Arc agent timed out after 2 minutes' });
    }, 120000);
  });
}

// ============================================================
// MAIN
// ============================================================

async function main() {
  const mode = getMode();
  console.log(`[auto-tweet] Starting Token Tank auto-tweet...`);
  console.log(`[auto-tweet] Mode: ${mode}`);
  console.log(`[auto-tweet] Time: ${new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`);

  // Check if we should run
  if (!shouldRun()) {
    process.exit(0);
  }

  // Check for API key
  if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY.startsWith('YOUR_')) {
    console.error('[auto-tweet] ANTHROPIC_API_KEY not set. Set it in sms-bot/.env.local');
    process.exit(1);
  }

  // Run Arc
  const result = await runArcAgent(mode);

  if (result.success) {
    console.log('[auto-tweet] Arc completed successfully!');
  } else {
    console.error('[auto-tweet] Arc failed to post tweet');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[auto-tweet] Error:', err);
  process.exit(1);
});
