/**
 * Trader Agent - Commodity ETF Trading
 *
 * Runs every 15 minutes during US market hours (9:30am-4pm ET, weekdays).
 * Trades SGOL (gold), SCO (inverse oil), CPER (copper) via Alpaca.
 *
 * Strategy:
 * - Entry: Buy on 2% pullback from 10-day high
 * - Exit: +5% profit, -5% stop loss, or end of day
 */

import { registerIntervalTask } from '../../lib/scheduler/index.js';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Track last run to enforce 15-minute interval
let lastRunTime: Date | null = null;
const INTERVAL_MINUTES = 15;

/**
 * Check if US stock market is currently open.
 * Market hours: 9:30am - 4:00pm ET, Monday-Friday
 */
function isMarketOpen(): boolean {
  const now = new Date();

  // Get current time in ET
  const etTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/New_York' }));

  // Weekend check (0 = Sunday, 6 = Saturday)
  const day = etTime.getDay();
  if (day === 0 || day === 6) {
    return false;
  }

  // Hours check
  const hours = etTime.getHours();
  const minutes = etTime.getMinutes();
  const currentMinutes = hours * 60 + minutes;

  const marketOpen = 9 * 60 + 30;  // 9:30 AM
  const marketClose = 16 * 60;     // 4:00 PM

  return currentMinutes >= marketOpen && currentMinutes < marketClose;
}

/**
 * Check if enough time has passed since last run.
 */
function shouldRunNow(): boolean {
  if (!lastRunTime) {
    return true;
  }

  const elapsed = Date.now() - lastRunTime.getTime();
  const elapsedMinutes = elapsed / (60 * 1000);

  return elapsedMinutes >= INTERVAL_MINUTES;
}

/**
 * Run the Python trader script.
 */
async function runTraderCheck(): Promise<{ status: string; trades?: string[] }> {
  return new Promise((resolve, reject) => {
    const scriptPath = join(__dirname, 'trader.py');

    // Use python3 explicitly
    const proc = spawn('python3', [scriptPath, 'run'], {
      cwd: __dirname,
      env: process.env as NodeJS.ProcessEnv,
    });

    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      // Log output
      if (stdout) {
        console.log(stdout);
      }
      if (stderr) {
        console.error(stderr);
      }

      if (code !== 0) {
        reject(new Error(`Trader script exited with code ${code}`));
        return;
      }

      // Parse result from output
      try {
        const resultMatch = stdout.match(/__RESULT__:(.+)$/m);
        if (resultMatch) {
          const result = JSON.parse(resultMatch[1]);
          resolve(result);
        } else {
          resolve({ status: 'ok' });
        }
      } catch {
        resolve({ status: 'ok' });
      }
    });

    proc.on('error', (error) => {
      reject(error);
    });
  });
}

/**
 * Main task function called by scheduler every minute.
 */
async function traderTask(): Promise<void> {
  // Check if market is open
  if (!isMarketOpen()) {
    // Silent skip during off-hours
    return;
  }

  // Check if 15 minutes have passed
  if (!shouldRunNow()) {
    return;
  }

  console.log('[trader] Running scheduled check...');
  lastRunTime = new Date();

  try {
    const result = await runTraderCheck();

    if (result.trades && result.trades.length > 0) {
      console.log(`[trader] Executed ${result.trades.length} trades:`, result.trades);
    }
  } catch (error) {
    console.error('[trader] Check failed:', error);
    throw error;
  }
}

/**
 * Register the trader with the scheduler.
 */
export function registerTraderJob(): void {
  registerIntervalTask({
    name: 'trader-check',
    run: traderTask,
    onError: (error) => {
      console.error('[trader] Scheduler error:', error);
    },
  });

  console.log('[trader] Registered: checks every 15 min during market hours (9:30am-4pm ET)');
}

/**
 * Manual trigger for testing.
 */
export async function triggerTraderCheck(): Promise<{ status: string; trades?: string[] }> {
  console.log('[trader] Manual trigger...');
  return runTraderCheck();
}
