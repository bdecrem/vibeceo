#!/usr/bin/env node

/**
 * Webtoys Edit Agent Worker
 * Individual worker process that continuously polls for and processes edit requests
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env.local' });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: '../.env' });
}

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Worker configuration
const WORKER_ID = process.argv[2] || `worker-${process.pid}`;
const POLL_INTERVAL = 5000; // Check for work every 5 seconds
const LOCK_TIMEOUT = 300000; // 5 minutes - same as processing timeout

// Colors for console output
const colors = {
  worker1: '\x1b[36m', // Cyan
  worker2: '\x1b[35m', // Magenta
  worker3: '\x1b[33m', // Yellow
  reset: '\x1b[0m'
};

const workerColor = colors[`worker${WORKER_ID.split('-')[1]}`] || colors.worker1;

/**
 * Log with worker ID prefix
 */
function log(message) {
  console.log(`${workerColor}[${WORKER_ID}]${colors.reset} ${message}`);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Claim the next available edit request
 * Uses database row locking to prevent race conditions
 */
async function claimNextEdit() {
  try {
    // Start a transaction to claim an edit
    // We need to check for revision ordering constraints
    
    // First, get the next pending edit
    const { data: pendingEdits, error: fetchError } = await supabase
      .from('wtaf_revisions')
      .select(`
        *,
        wtaf_content!inner(
          id,
          user_slug,
          app_slug,
          html_content,
          current_revision
        )
      `)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(10); // Get a batch to check for dependencies
    
    if (fetchError || !pendingEdits || pendingEdits.length === 0) {
      return null; // No work available
    }
    
    // Find the first edit that can be processed
    // (no earlier pending edits for the same content)
    let editToClaim = null;
    
    for (const edit of pendingEdits) {
      // Check if there are earlier pending/processing edits for this content
      const { data: blockers } = await supabase
        .from('wtaf_revisions')
        .select('id')
        .eq('content_id', edit.content_id)
        .lt('created_at', edit.created_at)
        .in('status', ['pending', 'processing'])
        .limit(1);
      
      if (!blockers || blockers.length === 0) {
        // This edit can be processed!
        editToClaim = edit;
        break;
      }
    }
    
    if (!editToClaim) {
      // All pending edits are blocked by earlier edits
      return null;
    }
    
    // Try to claim this edit by updating its status
    const { data: claimed, error: claimError } = await supabase
      .from('wtaf_revisions')
      .update({
        status: 'processing',
        processed_at: new Date().toISOString()
        // Note: worker_id column would be nice but doesn't exist yet
      })
      .eq('id', editToClaim.id)
      .eq('status', 'pending') // Only claim if still pending
      .select()
      .single();
    
    if (claimError || !claimed) {
      // Another worker got it first
      return null;
    }
    
    log(`✅ Claimed edit: ${editToClaim.wtaf_content.app_slug} (${editToClaim.id})`);
    // Return the original edit data with wtaf_content, not just the claimed update result
    return { ...claimed, wtaf_content: editToClaim.wtaf_content };
    
  } catch (error) {
    log(`❌ Error claiming edit: ${error.message}`);
    return null;
  }
}

/**
 * Process a single edit request through the pipeline
 */
async function processEdit(edit) {
  const startTime = Date.now();
  const appSlug = edit.wtaf_content?.app_slug || 'unknown';
  
  log(`🎨 Processing edit for ${appSlug}`);
  log(`📝 Request: "${edit.edit_request}"`);
  
  try {
    // Save edit data for the pipeline scripts
    const fs = await import('fs/promises');
    const tempFile = path.join(__dirname, `.worker-${WORKER_ID}-edit.json`);
    
    // Get the current revision's HTML if one exists (for stacking)
    let baseHtml = edit.wtaf_content.html_content; // Default to original
    
    if (edit.wtaf_content.current_revision) {
      log(`📚 Loading revision ${edit.wtaf_content.current_revision} as base for stacking`);
      const { data: currentRev } = await supabase
        .from('wtaf_revisions')
        .select('html_content')
        .eq('content_id', edit.wtaf_content.id)
        .eq('revision_id', edit.wtaf_content.current_revision)
        .single();
      
      if (currentRev && currentRev.html_content) {
        baseHtml = currentRev.html_content;
        log(`✅ Using revision ${edit.wtaf_content.current_revision} HTML as base`);
      } else {
        log(`⚠️ Could not load revision ${edit.wtaf_content.current_revision}, using original`);
      }
    }
    
    // Prepare edit data with current revision content
    const editWithContent = {
      ...edit,
      content: {
        html_content: baseHtml,
        detectedType: detectAppType(baseHtml)
      }
    };
    
    await fs.writeFile(tempFile, JSON.stringify([editWithContent], null, 2));
    
    // Run the processing pipeline
    const scripts = [
      { name: 'process-edits.js', env: `WORKER_INPUT=${tempFile}` },
      { name: 'validate-edits.js', env: `WORKER_INPUT=${tempFile}` },
      { name: 'deploy-edits.js', env: `WORKER_INPUT=${tempFile}` }
    ];
    
    let success = true;
    
    for (const script of scripts) {
      log(`⚙️  Running ${script.name}...`);
      
      try {
        const { stdout, stderr } = await execAsync(
          `${script.env} node ${path.join(__dirname, script.name)}`,
          {
            cwd: __dirname,
            maxBuffer: 1024 * 1024 * 10, // 10MB
            timeout: LOCK_TIMEOUT,
            env: { ...process.env, ...parseEnv(script.env) }
          }
        );
        
        if (stderr && !stderr.includes('Warning')) {
          log(`⚠️  ${script.name} warnings: ${stderr}`);
        }
        
      } catch (error) {
        log(`❌ ${script.name} failed: ${error.message}`);
        success = false;
        
        // Update status to failed
        await supabase
          .from('wtaf_revisions')
          .update({
            status: 'failed',
            error_message: error.message,
            completed_at: new Date().toISOString()
          })
          .eq('id', edit.id);
        
        break;
      }
    }
    
    // Clean up temp file
    await fs.unlink(tempFile).catch(() => {});
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    
    if (success) {
      log(`✅ Edit completed in ${duration}s: ${appSlug}`);
    } else {
      log(`❌ Edit failed after ${duration}s: ${appSlug}`);
    }
    
    return success;
    
  } catch (error) {
    log(`❌ Fatal error processing edit: ${error.message}`);
    
    // Mark as failed
    await supabase
      .from('wtaf_revisions')
      .update({
        status: 'failed',
        error_message: error.message,
        completed_at: new Date().toISOString()
      })
      .eq('id', edit.id);
    
    return false;
  }
}

/**
 * Detect app type from HTML content
 */
function detectAppType(html) {
  if (!html) return 'standard';
  
  if (html.includes('/api/zad/')) return 'zad';
  if (html.includes('requestAnimationFrame') && html.includes('canvas')) return 'game';
  if (html.includes('<form') && html.includes('submit')) return 'form';
  
  return 'standard';
}

/**
 * Parse environment variable string
 */
function parseEnv(envString) {
  const result = {};
  if (!envString) return result;
  
  const pairs = envString.split(' ');
  for (const pair of pairs) {
    const [key, value] = pair.split('=');
    if (key && value) {
      result[key] = value;
    }
  }
  
  return result;
}

/**
 * Main worker loop
 */
async function workerLoop() {
  log(`🚀 Worker started (PID: ${process.pid})`);
  log(`⏰ Polling every ${POLL_INTERVAL / 1000} seconds`);
  
  let consecutiveErrors = 0;
  const MAX_ERRORS = 5;
  
  while (true) {
    try {
      // Try to claim and process an edit
      const edit = await claimNextEdit();
      
      if (edit) {
        consecutiveErrors = 0; // Reset error counter on success
        await processEdit(edit);
      } else {
        // No work available, wait before checking again
        await sleep(POLL_INTERVAL);
      }
      
    } catch (error) {
      log(`❌ Worker loop error: ${error.message}`);
      consecutiveErrors++;
      
      if (consecutiveErrors >= MAX_ERRORS) {
        log(`💀 Too many consecutive errors (${MAX_ERRORS}), shutting down`);
        process.exit(1);
      }
      
      // Wait longer after errors
      await sleep(POLL_INTERVAL * 2);
    }
  }
}

/**
 * Graceful shutdown handler
 */
function setupShutdownHandlers() {
  let shuttingDown = false;
  
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;
    
    log(`🛑 Received ${signal}, shutting down gracefully...`);
    
    // Mark any in-progress edits as pending again
    // Note: Can't use worker_id since column doesn't exist
    // This is less precise but will work
    await supabase
      .from('wtaf_revisions')
      .update({
        status: 'pending',
        processed_at: null
      })
      .eq('status', 'processing');
    
    log('✅ Worker shutdown complete');
    process.exit(0);
  };
  
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

// Start the worker
setupShutdownHandlers();
workerLoop().catch(error => {
  log(`💀 Fatal error: ${error.message}`);
  process.exit(1);
});