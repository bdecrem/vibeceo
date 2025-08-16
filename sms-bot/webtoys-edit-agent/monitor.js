#!/usr/bin/env node

/**
 * Webtoys Edit Agent Monitor
 * Main orchestrator that runs the edit pipeline
 * Adapted from agent-issue-tracker for Webtoy editing
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import dotenv from 'dotenv';

// Load .env.local first, fallback to .env
dotenv.config({ path: '../.env.local' });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: '../.env' });
}

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Check if auto-edit is disabled
 */
async function isAutoEditDisabled() {
  try {
    await fs.access(path.join(__dirname, 'STOP-EDIT-AGENT.txt'));
    return true;
  } catch {
    return false;
  }
}

/**
 * Run a specific agent script
 */
async function runAgent(scriptName, description) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🎨 Running ${description}...`);
  console.log(`${'='.repeat(60)}`);

  try {
    const scriptPath = path.join(__dirname, scriptName);
    const { stdout, stderr } = await execAsync(`/opt/homebrew/bin/node ${scriptPath}`, {
      maxBuffer: 1024 * 1024 * 10, // 10MB buffer
      timeout: 300000 // 5 minute timeout per agent
    });

    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('Warning')) {
      console.error('Errors:', stderr);
    }

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
 * Main monitor function
 */
async function monitor() {
  // CRITICAL: Change to script directory - MUST be first line for cron compatibility
  process.chdir(__dirname);
  
  console.log('🎨 WEBTOYS EDIT AGENT MONITOR');
  console.log(`📅 Started at: ${new Date().toISOString()}`);
  console.log(`📁 Working directory: ${process.cwd()}`);

  // Check if editing is disabled
  if (await isAutoEditDisabled()) {
    console.log('⛔ Edit Agent is DISABLED (STOP-EDIT-AGENT.txt exists)');
    console.log('Remove STOP-EDIT-AGENT.txt to enable automatic editing');
    process.exit(0);
  }

  const startTime = Date.now();
  const results = {
    collect: false,
    process: false,
    validate: false,
    deploy: false
  };

  // Parse command line arguments
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const testMode = args.includes('--test');
  
  if (dryRun) {
    console.log('🧪 DRY RUN MODE - No database changes will be made');
  }
  
  if (testMode) {
    console.log('🧪 TEST MODE - Processing single test edit');
  }

  try {
    // Step 1: Collect pending edit requests
    console.log('\n📥 Step 1: Collecting edit requests...');
    results.collect = await runAgent('collect-edit-requests.js', 'Edit Collection');
    
    if (!results.collect) {
      console.log('⚠️  No edit requests to process or collection failed');
      return;
    }

    // Step 2: Process edits with Claude
    console.log('\n🤖 Step 2: Processing edits with Claude...');
    results.process = await runAgent('process-edits.js', 'Edit Processing');
    
    if (!results.process) {
      console.log('⚠️  Edit processing failed');
      return;
    }

    // Step 3: Validate edited HTML
    console.log('\n✓ Step 3: Validating edits...');
    results.validate = await runAgent('validate-edits.js', 'Edit Validation');
    
    if (!results.validate) {
      console.log('⚠️  Validation failed - edits will not be deployed');
      return;
    }

    // Step 4: Deploy validated edits (unless dry run)
    if (!dryRun) {
      console.log('\n🚀 Step 4: Deploying edits...');
      results.deploy = await runAgent('deploy-edits.js', 'Edit Deployment');
    } else {
      console.log('\n⏭️  Step 4: Skipping deployment (dry run mode)');
    }

  } catch (error) {
    console.error('❌ Monitor error:', error);
  }

  // Summary
  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n' + '='.repeat(60));
  console.log('📊 EDIT AGENT SUMMARY');
  console.log('='.repeat(60));
  console.log(`⏱️  Total duration: ${duration}s`);
  console.log(`📥 Collection: ${results.collect ? '✅' : '❌'}`);
  console.log(`🤖 Processing: ${results.process ? '✅' : '❌'}`);
  console.log(`✓  Validation: ${results.validate ? '✅' : '❌'}`);
  console.log(`🚀 Deployment: ${results.deploy ? '✅' : (dryRun ? '⏭️ Skipped' : '❌')}`);
  console.log('='.repeat(60));
  console.log(`✨ Edit Agent run completed at ${new Date().toISOString()}`);
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  monitor().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { monitor };