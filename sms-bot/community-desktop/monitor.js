#!/usr/bin/env node

/**
 * Community Desktop Monitor
 * Orchestrates the pipeline: process apps → add to desktop → deploy
 * Runs every 2 minutes via cron
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// CRITICAL: Change to script directory - MUST be first line for cron compatibility
process.chdir(__dirname);

// Load environment variables
dotenv.config({ path: '../.env.local' });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: '../.env' });
}

const execAsync = promisify(exec);

/**
 * Run a script and capture output
 */
async function runScript(scriptName, description) {
  console.log(`\n📋 ${description}...`);
  
  try {
    const { stdout, stderr } = await execAsync(`node ${scriptName}`, {
      cwd: __dirname,
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });
    
    if (stdout) console.log(stdout);
    if (stderr) console.error('Warnings:', stderr);
    
    return true;
  } catch (error) {
    console.error(`❌ Failed: ${error.message}`);
    if (error.stdout) console.log('Output:', error.stdout);
    if (error.stderr) console.error('Error output:', error.stderr);
    return false;
  }
}

/**
 * Deploy desktop.html to production (Supabase)
 */
async function deployDesktop() {
  console.log('\n🚀 Deploying desktop to Supabase...');
  
  try {
    // Use the deploy-to-supabase script
    const { stdout, stderr } = await execAsync('node deploy-to-supabase.js', {
      cwd: __dirname,
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });
    
    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('Warning')) {
      console.error('Deployment warnings:', stderr);
    }
    
    return true;
  } catch (error) {
    console.error('Deployment error:', error.message);
    if (error.stdout) console.log('Output:', error.stdout);
    if (error.stderr) console.error('Error output:', error.stderr);
    return false;
  }
}

/**
 * Main monitor function
 */
async function monitor() {
  console.log('\n' + '='.repeat(60));
  console.log('🖥️  COMMUNITY DESKTOP MONITOR');
  console.log('='.repeat(60));
  console.log('Started:', new Date().toISOString());
  console.log('Mode:', process.argv[2] || 'full pipeline');
  
  // Parse command line arguments
  const args = process.argv.slice(2);
  const processOnly = args.includes('--process');
  const addOnly = args.includes('--add');
  const deployOnly = args.includes('--deploy');
  const skipDeploy = args.includes('--skip-deploy');
  
  try {
    if (processOnly) {
      // Only process apps
      await runScript('process-apps.js', 'Processing app submissions');
    } else if (addOnly) {
      // Only add to desktop
      await runScript('add-to-desktop.js', 'Adding apps to desktop');
    } else if (deployOnly) {
      // Only deploy
      await deployDesktop();
    } else {
      // Full pipeline
      console.log('\n🔄 Running full pipeline...\n');
      
      // Step 1: Process new submissions
      const processSuccess = await runScript('process-apps.js', 'Processing app submissions');
      
      if (!processSuccess) {
        console.log('⚠️  Processing failed, but continuing...');
      }
      
      // Step 2: Add processed apps to desktop
      const addSuccess = await runScript('add-to-desktop.js', 'Adding apps to desktop');
      
      if (!addSuccess) {
        console.log('⚠️  Adding apps failed, but continuing...');
      }
      
      // Step 3: Deploy updated desktop (unless skipped)
      if (!skipDeploy && (processSuccess || addSuccess)) {
        await deployDesktop();
      }
    }
    
    console.log('\n✅ Monitor cycle complete');
    
  } catch (error) {
    console.error('\n❌ Monitor error:', error);
    process.exit(1);
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('Finished:', new Date().toISOString());
  console.log('='.repeat(60) + '\n');
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  monitor().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { monitor };