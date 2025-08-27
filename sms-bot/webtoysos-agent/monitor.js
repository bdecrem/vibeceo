#!/usr/bin/env node

/**
 * Issue Tracker Monitor
 * Main orchestrator that runs the complete pipeline
 * Can be run manually or via cron
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load .env.local first, fallback to .env
dotenv.config({ path: '../.env.local' });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: '../.env' });
}

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Run a specific agent script
 */
async function runAgent(scriptName, description) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🤖 Running ${description}...`);
  console.log(`${'='.repeat(60)}`);

  try {
    const scriptPath = path.join(__dirname, scriptName);
    const { stdout, stderr } = await execAsync(`/usr/local/bin/node ${scriptPath}`, {
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      timeout: 600000 // 10 minute timeout per agent
    });

    if (stdout) console.log(stdout);
    if (stderr) console.error('Warnings:', stderr);

    console.log(`✅ ${description} completed successfully`);
    return true;
  } catch (error) {
    console.error(`❌ ${description} failed:`, error.message);
    if (error.stdout) console.log('Output:', error.stdout);
    if (error.stderr) console.error('Errors:', error.stderr);
    return false;
  }
}

/**
 * Check git status and ensure clean working directory
 */
async function checkGitStatus() {
  try {
    const { stdout } = await execAsync('git status --porcelain');
    if (stdout.trim()) {
      console.log('⚠️  Warning: Working directory has uncommitted changes');
      console.log(stdout);
      
      // Optionally stash changes
      if (process.env.AUTO_STASH === 'true') {
        console.log('📦 Stashing changes...');
        await execAsync('git stash push -m "Auto-stash by issue tracker"');
      }
    }
    return true;
  } catch (error) {
    console.error('Error checking git status:', error);
    return false;
  }
}

/**
 * Main monitor function
 */
async function monitor() {
  // CRITICAL: Change to script directory - MUST be first line for cron compatibility
  process.chdir(__dirname);
  
  console.log('🎯 WebtoysOS Fixit Board Monitor');
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log(`📁 Working directory: ${process.cwd()}`);

  // Pull latest changes from GitHub (for dedicated agent machines)
  try {
    console.log('📥 Pulling latest changes from GitHub...');
    await execAsync('git pull origin main');
  } catch (pullError) {
    console.log('⚠️  Could not pull from GitHub (may have local changes)');
  }

  const startTime = Date.now();
  const results = {
    reformulate: false,
    fix: false,
    pr: false
  };

  try {
    // Check git status first
    const gitOk = await checkGitStatus();
    if (!gitOk && process.env.STRICT_GIT === 'true') {
      throw new Error('Git working directory is not clean');
    }

    // Step 1: Reformulate new issues
    results.reformulate = await runAgent(
      'reformulate-issues.js',
      'Issue Reformulation Agent'
    );

    // Step 2: Attempt to fix high-confidence issues
    if (process.env.ENABLE_AUTO_FIX === 'true') {
      results.fix = await runAgent(
        'fix-issues.js',
        'Auto-Fix Agent'
      );

      // Step 3: Create PRs for fixed issues
      if (results.fix) {
        results.pr = await runAgent(
          'create-prs.js',
          'PR Creation Agent'
        );
      }
    } else {
      console.log('\n⏭️  Auto-fix is disabled (set ENABLE_AUTO_FIX=true to enable)');
    }

    // Generate summary report
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    
    console.log(`\n${'='.repeat(60)}`);
    console.log('📊 PIPELINE SUMMARY');
    console.log(`${'='.repeat(60)}`);
    console.log(`✅ Reformulation: ${results.reformulate ? 'Success' : 'Failed'}`);
    console.log(`✅ Auto-Fix: ${results.fix ? 'Success' : 'Skipped/Failed'}`);
    console.log(`✅ PR Creation: ${results.pr ? 'Success' : 'Skipped/Failed'}`);
    console.log(`⏱️  Total time: ${elapsed} seconds`);
    console.log(`📅 Completed at: ${new Date().toISOString()}`);

    // Restore stashed changes if any
    if (process.env.AUTO_STASH === 'true') {
      try {
        await execAsync('git stash pop');
        console.log('📦 Restored stashed changes');
      } catch (error) {
        // Stash might be empty
      }
    }

  } catch (error) {
    console.error('\n💥 Pipeline failed:', error.message);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const command = args[0];

if (command === '--help' || command === '-h') {
  console.log(`
WebtoysOS Fixit Board Monitor

Usage: node monitor.js [options]

Options:
  --help, -h        Show this help message
  --reformulate     Run only the reformulation agent
  --fix             Run only the fix agent
  --pr              Run only the PR creation agent
  --all             Run the complete pipeline (default)

Environment Variables:
  ENABLE_AUTO_FIX   Set to 'true' to enable auto-fixing (default: false)
  AUTO_STASH        Set to 'true' to auto-stash changes (default: false)
  STRICT_GIT        Set to 'true' to require clean git state (default: false)
  ISSUE_TRACKER_APP_ID  The ZAD app ID for issue tracking

Example:
  ENABLE_AUTO_FIX=true node monitor.js --all
  `);
  process.exit(0);
}

// Run specific agent or full pipeline
if (command === '--reformulate') {
  runAgent('reformulate-issues.js', 'Issue Reformulation Agent')
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else if (command === '--fix') {
  runAgent('fix-issues.js', 'Auto-Fix Agent')
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else if (command === '--pr') {
  runAgent('create-prs.js', 'PR Creation Agent')
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
} else {
  // Run full pipeline
  monitor()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}