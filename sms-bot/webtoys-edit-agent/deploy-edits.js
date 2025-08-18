#!/usr/bin/env node

/**
 * Deploy Edits
 * Saves validated edits as new revisions and notifies users
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: '../.env.local' });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: '../.env' });
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Load validated edits from temp file or worker input
 */
async function loadValidatedEdits() {
  // Check if we're in worker mode
  if (process.env.WORKER_INPUT) {
    try {
      const data = await fs.readFile(process.env.WORKER_INPUT, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      console.log('Error reading worker input:', error);
      return [];
    }
  }
  
  // Normal mode: read from validated file
  try {
    const tempFile = path.join(__dirname, '.validated-edits.json');
    const data = await fs.readFile(tempFile, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    console.log('No validated edits file found');
    return [];
  }
}

/**
 * Send SMS notification to user
 */
async function sendNotification(userPhone, message) {
  try {
    // Import notification client dynamically (compiled to dist)
    const { sendConfirmationSms } = await import('../dist/engine/notification-client.js');
    await sendConfirmationSms(message, userPhone);
    console.log(`  📱 SMS sent to ${userPhone}`);
  } catch (error) {
    console.error(`  ❌ Failed to send SMS: ${error.message}`);
  }
}

/**
 * Deploy a single edit
 */
async function deployEdit(edit) {
  const appSlug = edit.wtaf_content?.app_slug || 'unknown';
  console.log(`\n🚀 Deploying edit for: ${appSlug}`);
  
  // Check if validation passed
  if (!edit.validationResult || !edit.validationResult.isValid) {
    console.log('  ❌ Edit failed validation - skipping deployment');
    
    // Mark as failed in database
    await supabase
      .from('wtaf_revisions')
      .update({
        status: 'failed',
        error_message: 'Failed validation checks'
      })
      .eq('id', edit.id);
    
    return false;
  }
  
  // Check if edit processing succeeded
  if (!edit.editResult || !edit.editResult.success) {
    console.log('  ❌ Edit processing failed - skipping deployment');
    return false;
  }
  
  try {
    // Use the database function to complete the edit request
    const { data: revisionId, error } = await supabase.rpc('complete_edit_request', {
      p_request_id: edit.id,
      p_html_content: edit.editResult.editedHtml,
      p_ai_summary: edit.editResult.aiSummary
    });
    
    if (error) {
      console.error(`  ❌ Database error: ${error.message}`);
      
      // Mark as failed
      await supabase
        .from('wtaf_revisions')
        .update({
          status: 'failed',
          error_message: `Database error: ${error.message}`
        })
        .eq('id', edit.id);
      
      return false;
    }
    
    console.log(`  ✅ Deployed as revision ${revisionId}`);
    
    // Send success notification to user
    const message = `Your edit request "${edit.edit_request}" for "${appSlug}" has been completed! The changes are now live at your app URL.`;
    await sendNotification(edit.user_phone, message);
    
    return true;
    
  } catch (error) {
    console.error(`  ❌ Deployment error: ${error.message}`);
    
    // Mark as failed in database
    await supabase
      .from('wtaf_revisions')
      .update({
        status: 'failed',
        error_message: `Deployment error: ${error.message}`
      })
      .eq('id', edit.id);
    
    // Send failure notification
    const message = `Sorry, there was an error deploying your edit to "${appSlug}". Please try again or contact support if the issue persists.`;
    await sendNotification(edit.user_phone, message);
    
    return false;
  }
}

/**
 * Clean up temporary files
 */
async function cleanup() {
  const tempFiles = [
    '.pending-edits.json',
    '.processed-edits.json', 
    '.validated-edits.json'
  ];
  
  for (const file of tempFiles) {
    try {
      await fs.unlink(path.join(__dirname, file));
    } catch (error) {
      // Ignore errors - files might not exist
    }
  }
  
  console.log('🧹 Cleaned up temporary files');
}

// Main execution
async function main() {
  console.log('🎨 Webtoys Edit Agent - Deployment Phase');
  console.log('=' + '='.repeat(50));
  
  // Load validated edits
  const edits = await loadValidatedEdits();
  
  if (edits.length === 0) {
    console.log('No validated edits to deploy');
    process.exit(1);
  }
  
  console.log(`🚀 Deploying ${edits.length} validated edit(s)`);
  
  // Deploy each valid edit
  let deployedCount = 0;
  
  for (const edit of edits) {
    const success = await deployEdit(edit);
    if (success) {
      deployedCount++;
    }
  }
  
  // Clean up temporary files
  await cleanup();
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log(`✅ Successfully deployed ${deployedCount}/${edits.length} edits`);
  
  if (deployedCount > 0) {
    console.log('Edit deployment completed successfully');
    process.exit(0);
  } else {
    console.log('No edits were deployed');
    process.exit(1);
  }
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}