#!/usr/bin/env node

/**
 * ToyBox OS App Processing Monitor
 * Shows detailed real-time logs of app creation process
 * Run this instead of the processors to see everything happening
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';
import chalk from 'chalk';

// Load .env.local first, fallback to .env
dotenv.config({ path: '../.env.local' });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: '../.env' });
}

const execAsync = promisify(exec);

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Colored console output
const log = {
  title: (msg) => console.log(chalk.bold.cyan(`\n${'='.repeat(60)}\n${msg}\n${'='.repeat(60)}`)),
  section: (msg) => console.log(chalk.bold.yellow(`\n▶ ${msg}`)),
  info: (msg) => console.log(chalk.blue(`  ℹ ${msg}`)),
  success: (msg) => console.log(chalk.green(`  ✅ ${msg}`)),
  error: (msg) => console.log(chalk.red(`  ❌ ${msg}`)),
  data: (label, data) => console.log(chalk.gray(`  📊 ${label}:`), data),
  prompt: (prompt) => {
    console.log(chalk.magenta('\n  📝 PROMPT TO CLAUDE:'));
    console.log(chalk.gray('  ' + '-'.repeat(50)));
    console.log(chalk.white(prompt.split('\n').map(line => '  | ' + line).join('\n')));
    console.log(chalk.gray('  ' + '-'.repeat(50)));
  },
  response: (response) => {
    console.log(chalk.cyan('\n  🤖 CLAUDE RESPONSE:'));
    console.log(chalk.gray('  ' + '-'.repeat(50)));
    const preview = response.substring(0, 500);
    console.log(chalk.white(preview.split('\n').map(line => '  | ' + line).join('\n')));
    if (response.length > 500) {
      console.log(chalk.gray(`  | ... (${response.length - 500} more characters)`));
    }
    console.log(chalk.gray('  ' + '-'.repeat(50)));
  }
};

/**
 * Monitor and process new app submissions
 */
async function monitorApps() {
  log.title('TOYBOX OS APP MONITOR - DETAILED MODE');
  log.info(`Time: ${new Date().toISOString()}`);
  log.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  
  // Check for both simple and windowed app submissions
  log.section('CHECKING FOR NEW SUBMISSIONS');
  
  // Check simple apps
  log.info('Querying database for simple apps...');
  const { data: simpleApps, error: simpleError } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('*')
    .eq('app_id', 'toybox-desktop-apps')
    .eq('action_type', 'desktop_app')
    .filter('content_data->>status', 'eq', 'new');
  
  if (simpleError) {
    log.error(`Database error (simple apps): ${simpleError.message}`);
  } else {
    log.success(`Found ${simpleApps?.length || 0} simple app submissions`);
  }
  
  // Check windowed apps
  log.info('Querying database for windowed apps...');
  const { data: windowedApps, error: windowedError } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('*')
    .eq('app_id', 'toybox-windowed-apps')
    .eq('action_type', 'windowed_app')
    .filter('content_data->>status', 'eq', 'new');
  
  if (windowedError) {
    log.error(`Database error (windowed apps): ${windowedError.message}`);
  } else {
    log.success(`Found ${windowedApps?.length || 0} windowed app submissions`);
  }
  
  // Process simple apps
  if (simpleApps && simpleApps.length > 0) {
    for (const app of simpleApps) {
      await processSimpleApp(app);
    }
  }
  
  // Process windowed apps
  if (windowedApps && windowedApps.length > 0) {
    for (const app of windowedApps) {
      await processWindowedApp(app);
    }
  }
  
  if ((!simpleApps || simpleApps.length === 0) && (!windowedApps || windowedApps.length === 0)) {
    log.info('No new submissions to process');
  }
  
  log.title('MONITORING COMPLETE');
}

/**
 * Process a simple app with detailed logging
 */
async function processSimpleApp(record) {
  const submission = record.content_data;
  
  log.section(`PROCESSING SIMPLE APP: "${submission.appName}"`);
  log.data('Submitter', submission.submitterName);
  log.data('Type', submission.appType);
  log.data('Function', submission.appFunction);
  log.data('Timestamp', submission.timestamp);
  
  // Build the prompt
  const prompt = `Transform this user submission into a simple desktop app...
User wants: "${submission.appName}"
Description: "${submission.appFunction}"
Type: ${submission.appType || 'simple'}

Generate a JSON object with:
1. name: A short, catchy name (max 15 chars)
2. icon: An emoji
3. code: JavaScript code (one line, using alert/prompt/confirm)
4. tooltip: A fun description
5. position: { x: number, y: number }

Respond with ONLY valid JSON.`;
  
  log.prompt(prompt);
  
  // Call Claude
  log.info('Calling Claude CLI...');
  const claudePath = '/Users/bartdecrem/.local/bin/claude';
  log.data('Claude path', claudePath);
  
  try {
    const startTime = Date.now();
    const { stdout, stderr } = await execAsync(`echo ${JSON.stringify(prompt)} | ${claudePath}`, {
      maxBuffer: 1024 * 1024 * 10
    });
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    log.success(`Claude responded in ${duration}s`);
    
    if (stderr) {
      log.error(`Claude stderr: ${stderr}`);
    }
    
    log.response(stdout);
    
    // Parse response
    let jsonStr = stdout.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    }
    
    const appSpec = JSON.parse(jsonStr);
    log.success('Successfully parsed Claude response');
    log.data('App name', appSpec.name);
    log.data('Icon', appSpec.icon);
    log.data('Code', appSpec.code);
    
    // Here you would add to desktop, update database, etc.
    log.info('Would now add to desktop and update database...');
    
  } catch (error) {
    log.error(`Failed to process: ${error.message}`);
  }
}

/**
 * Process a windowed app with detailed logging
 */
async function processWindowedApp(record) {
  const submission = record.content_data;
  
  log.section(`PROCESSING WINDOWED APP: "${submission.appName}"`);
  log.data('Submitter', submission.submitterName);
  log.data('Type', submission.appType);
  log.data('Function', submission.appFunction);
  
  // Detect app template
  const desc = submission.appFunction.toLowerCase();
  let appTemplate = 'generic';
  
  if (desc.includes('paint') || desc.includes('draw')) {
    appTemplate = 'paint';
  } else if (desc.includes('note') || desc.includes('text')) {
    appTemplate = 'notepad';
  }
  
  log.info(`Detected template: ${appTemplate}`);
  
  // Build complex prompt (abbreviated for display)
  const prompt = `Create a complete windowed desktop application...
User wants: "${submission.appName}"
Description: "${submission.appFunction}"
Template: ${appTemplate}

[Full HTML app with ZAD integration required]

Return JSON with name, slug, icon, html_content, theme_id, window_config`;
  
  log.prompt(prompt);
  
  log.info('Calling Claude CLI for complex app generation...');
  log.info('This may take 30-60 seconds...');
  
  // Would call Claude here
  log.info('Would generate full HTML app with Claude...');
}

// Add file watcher mode
if (process.argv.includes('--watch')) {
  log.title('STARTING IN WATCH MODE');
  log.info('Checking for new apps every 10 seconds...');
  
  setInterval(() => {
    monitorApps().catch(error => {
      log.error(`Monitor error: ${error.message}`);
    });
  }, 10000);
  
  // Run immediately
  monitorApps();
} else {
  // Run once
  monitorApps().catch(error => {
    log.error(`Fatal error: ${error.message}`);
    process.exit(1);
  });
}