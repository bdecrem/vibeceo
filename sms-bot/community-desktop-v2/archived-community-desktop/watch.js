#!/usr/bin/env node

/**
 * Real-time monitor for Community Desktop submissions
 * Shows live updates as apps are processed
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: join(__dirname, '../.env') });
}

// Debug: Check if variables loaded
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing environment variables!');
  console.error('Looking for .env.local or .env in:', join(__dirname, '../'));
  console.error('SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
  console.error('SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? 'Set' : 'Missing');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m'
};

// Track what we've seen
const seenIds = new Set();
let checkInterval;

console.clear();
console.log(`${colors.cyan}${colors.bright}
╔══════════════════════════════════════════════════════════╗
║          COMMUNITY DESKTOP LIVE MONITOR 🖥️               ║
╚══════════════════════════════════════════════════════════╝${colors.reset}
`);

console.log(`${colors.dim}Watching for new submissions every 2 seconds...${colors.reset}\n`);

async function checkSubmissions() {
  try {
    // Get all submissions from the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    
    const { data: submissions, error } = await supabase
      .from('wtaf_zero_admin_collaborative')
      .select('*')
      .eq('app_id', 'community-desktop-apps')
      .gte('created_at', oneHourAgo)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`${colors.red}Error fetching submissions:${colors.reset}`, error);
      return;
    }

    // Process new submissions
    for (const submission of submissions || []) {
      if (!seenIds.has(submission.id)) {
        seenIds.add(submission.id);
        displaySubmission(submission);
      }
    }

    // Also check desktop.html for updates
    const desktopPath = join(__dirname, 'desktop.html');
    const html = await fs.readFile(desktopPath, 'utf-8');
    const appCount = (html.match(/class="desktop-icon"/g) || []).length;
    
    // Update status line
    process.stdout.write(`\r${colors.dim}[${new Date().toLocaleTimeString()}] Desktop has ${appCount} apps | ${submissions?.length || 0} submissions in last hour${colors.reset}`);

  } catch (error) {
    console.error(`${colors.red}Error:${colors.reset}`, error);
  }
}

function displaySubmission(submission) {
  const content = submission.content_data;
  const status = content.status || 'unknown';
  
  // Clear status line
  process.stdout.write('\r' + ' '.repeat(80) + '\r');
  
  // Status colors
  const statusColor = {
    'new': colors.yellow,
    'processing': colors.blue,
    'processed': colors.cyan,
    'added': colors.green,
    'failed': colors.red
  }[status] || colors.white;

  console.log(`
${colors.bright}📥 NEW SUBMISSION DETECTED${colors.reset}
${colors.dim}────────────────────────────────────────${colors.reset}
  ID: ${colors.cyan}${submission.id}${colors.reset}
  Time: ${new Date(submission.created_at).toLocaleString()}
  Status: ${statusColor}${status.toUpperCase()}${colors.reset}
  
  ${colors.bright}App Details:${colors.reset}
  Name: ${colors.green}"${content.appName || 'Unnamed'}"${colors.reset}
  Function: "${content.appFunction || 'No description'}"
  Submitter: ${colors.blue}${content.submitterName || 'Anonymous'}${colors.reset}
  
  ${content.appSpec ? `${colors.bright}Generated App:${colors.reset}
  Icon: ${content.appSpec.icon}
  Code: ${colors.dim}${content.appSpec.code?.substring(0, 100)}...${colors.reset}` : ''}
${colors.dim}────────────────────────────────────────${colors.reset}`);
}

// Also watch for monitor.js runs
async function watchMonitorRuns() {
  console.log(`${colors.magenta}🔄 You can run 'node monitor.js' in another terminal to process submissions${colors.reset}\n`);
}

// Keyboard input handling
process.stdin.setRawMode(true);
process.stdin.resume();
process.stdin.setEncoding('utf8');

process.stdin.on('data', (key) => {
  // Ctrl+C to exit
  if (key === '\x03') {
    console.log(`\n\n${colors.yellow}Stopping monitor...${colors.reset}`);
    clearInterval(checkInterval);
    process.exit();
  }
  
  // 'r' to refresh
  if (key === 'r') {
    console.log(`\n${colors.cyan}Refreshing...${colors.reset}`);
    checkSubmissions();
  }
  
  // 'm' to run monitor
  if (key === 'm') {
    console.log(`\n${colors.green}Running monitor.js...${colors.reset}`);
    import('child_process').then(({ exec }) => {
      exec('node monitor.js', { cwd: __dirname }, (error, stdout, stderr) => {
        if (error) {
          console.error(`${colors.red}Error running monitor:${colors.reset}`, error);
        } else {
          console.log(`${colors.green}Monitor output:${colors.reset}\n${stdout}`);
          if (stderr) console.error(`${colors.red}Errors:${colors.reset}\n${stderr}`);
        }
      });
    });
  }
});

console.log(`${colors.dim}Press 'r' to refresh | 'm' to run monitor.js | Ctrl+C to exit${colors.reset}\n`);

// Initial check
await checkSubmissions();
watchMonitorRuns();

// Start checking every 2 seconds
checkInterval = setInterval(checkSubmissions, 2000);