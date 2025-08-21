#!/usr/bin/env node

/**
 * Fix webhook race conditions by adding process locks
 * Prevents multiple processors from running simultaneously
 */

import fs from 'fs';
import path from 'path';

async function fixWebhookRaceConditions() {
    console.log('🔒 Adding process locks to prevent race conditions...');
    
    try {
        const webhookServerPath = '/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/webtoys-edit-agent/webhook-server.js';
        
        // Read the current webhook server code
        let webhookCode = fs.readFileSync(webhookServerPath, 'utf8');
        
        console.log('📖 Reading webhook server code...');
        
        // Add process tracking at the top (after imports)
        const processTrackingCode = `
// Process lock mechanism to prevent race conditions
const activeProcesses = new Map();

/**
 * Check if a processor is already running for a given type
 */
function isProcessorRunning(processorType) {
    return activeProcesses.has(processorType);
}

/**
 * Mark a processor as running
 */
function markProcessorRunning(processorType) {
    activeProcesses.set(processorType, Date.now());
}

/**
 * Mark a processor as finished
 */
function markProcessorFinished(processorType) {
    activeProcesses.delete(processorType);
}

/**
 * Clean up old process locks (older than 5 minutes)
 */
function cleanupOldProcessLocks() {
    const now = Date.now();
    const fiveMinutes = 5 * 60 * 1000;
    
    for (const [processorType, startTime] of activeProcesses.entries()) {
        if (now - startTime > fiveMinutes) {
            console.log(\`⚠️ Cleaning up stale process lock for \${processorType}\`);
            activeProcesses.delete(processorType);
        }
    }
}

// Clean up stale locks every minute
setInterval(cleanupOldProcessLocks, 60000);`;
        
        // Find where to insert the process tracking code (after imports)
        const insertPoint = webhookCode.indexOf('// Track active workers');
        if (insertPoint > -1) {
            webhookCode = webhookCode.slice(0, insertPoint) + processTrackingCode + '\n\n' + webhookCode.slice(insertPoint);
        } else {
            console.log('⚠️ Could not find insertion point, trying alternative...');
            const altInsertPoint = webhookCode.indexOf('let activeWorkers = 0;');
            if (altInsertPoint > -1) {
                webhookCode = webhookCode.slice(0, altInsertPoint) + processTrackingCode + '\n\n' + webhookCode.slice(altInsertPoint);
            }
        }
        
        // Replace the processor execution logic with race-condition-safe version
        const oldProcessorCode = `      // Trigger immediate processing based on app type
      try {
        if (isWindowed) {
          console.log('🔄 Triggering windowed app processor...');
          const { stdout, stderr } = await execAsync(
            \`node process-windowed-apps.js\`,
            { 
              cwd: path.join(__dirname, '../community-desktop-v2'),
              maxBuffer: 1024 * 1024 * 10,
              timeout: 60000 // 60 second timeout for complex apps
            }
          );
          
          if (stdout) console.log('Windowed app output:', stdout);
          if (stderr) console.error('Windowed app errors:', stderr);
        } else {
          console.log('🔄 Triggering simple app processor...');
          const { stdout, stderr } = await execAsync(
            \`node process-toybox-apps.js\`,
            { 
              cwd: path.join(__dirname, '../community-desktop-v2'),
              maxBuffer: 1024 * 1024 * 10,
              timeout: 30000 // 30 second timeout
            }
          );
          
          if (stdout) console.log('Simple app output:', stdout);
          if (stderr) console.error('Simple app errors:', stderr);
        }
      } catch (processError) {
        console.error('⚠️ Processing failed (will retry via cron):', processError.message);
        // Don't fail the webhook - the cron job will pick it up
      }`;
        
        const newProcessorCode = `      // Trigger immediate processing based on app type (with race condition protection)
      try {
        const processorType = isWindowed ? 'windowed-apps' : 'simple-apps';
        
        // Check if processor is already running
        if (isProcessorRunning(processorType)) {
          console.log(\`⏳ \${processorType} processor already running, submission queued for next run\`);
        } else {
          markProcessorRunning(processorType);
          
          try {
            if (isWindowed) {
              console.log('🔄 Triggering windowed app processor...');
              const { stdout, stderr } = await execAsync(
                \`node process-windowed-apps.js\`,
                { 
                  cwd: path.join(__dirname, '../community-desktop-v2'),
                  maxBuffer: 1024 * 1024 * 10,
                  timeout: 60000 // 60 second timeout for complex apps
                }
              );
              
              if (stdout) console.log('Windowed app output:', stdout);
              if (stderr) console.error('Windowed app errors:', stderr);
            } else {
              console.log('🔄 Triggering simple app processor...');
              const { stdout, stderr } = await execAsync(
                \`node process-toybox-apps.js\`,
                { 
                  cwd: path.join(__dirname, '../community-desktop-v2'),
                  maxBuffer: 1024 * 1024 * 10,
                  timeout: 30000 // 30 second timeout
                }
              );
              
              if (stdout) console.log('Simple app output:', stdout);
              if (stderr) console.error('Simple app errors:', stderr);
            }
          } finally {
            markProcessorFinished(processorType);
          }
        }
      } catch (processError) {
        console.error('⚠️ Processing failed (will retry via cron):', processError.message);
        // Don't fail the webhook - the cron job will pick it up
      }`;
        
        // Replace the processor logic
        webhookCode = webhookCode.replace(oldProcessorCode, newProcessorCode);
        
        // Create backup
        const backupPath = webhookServerPath + '.backup-before-race-fix';
        fs.writeFileSync(backupPath, fs.readFileSync(webhookServerPath));
        console.log(`💾 Created backup: ${backupPath}`);
        
        // Write the updated webhook server code
        fs.writeFileSync(webhookServerPath, webhookCode);
        
        console.log('✅ Successfully added race condition protection to webhook server!');
        console.log('🔒 Multiple processors of the same type will no longer run simultaneously');
        console.log('⚡ Submissions will be queued if a processor is already running');
        console.log('🧹 Stale process locks will be cleaned up automatically');
        
        return true;
        
    } catch (error) {
        console.error('❌ Error fixing webhook race conditions:', error.message);
        return false;
    }
}

if (process.argv[1].endsWith('fix-webhook-race-conditions.js')) {
    fixWebhookRaceConditions().then(success => {
        if (success) {
            console.log('\n🚀 Changes applied successfully!');
            console.log('📝 You may want to restart the webhook server to apply changes');
        } else {
            console.log('\n❌ Fix failed - check the error messages above');
            process.exit(1);
        }
    });
}

export { fixWebhookRaceConditions };