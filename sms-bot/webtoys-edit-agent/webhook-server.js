#!/usr/bin/env node

/**
 * Webtoys Edit Agent Webhook Server
 * Runs only on machines with EDIT_AGENT_ENABLED=true
 * Processes edit requests immediately when triggered via webhook
 */

import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env.local' });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: '../.env' });
}

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Configuration
const PORT = parseInt(process.env.EDIT_AGENT_WEBHOOK_PORT || '3031', 10);
const EDIT_AGENT_ENABLED = (process.env.EDIT_AGENT_ENABLED || 'false').toLowerCase() === 'true';

// Track active workers (no longer blocking new requests)
let activeWorkers = 0;
const MAX_WORKERS = 2;

/**
 * Check if edit agent is enabled
 */
function checkEditAgentEnabled() {
  if (!EDIT_AGENT_ENABLED) {
    console.log('⛔ Edit Agent is DISABLED - Set EDIT_AGENT_ENABLED=true to enable');
    return false;
  }
  return true;
}

/**
 * Trigger workers to check for new work
 * Workers run independently - webhook just signals them
 */
async function triggerWorkers() {
  console.log('🔔 Signaling workers to check for new edits...');
  
  // Workers poll the database independently
  // This is just a notification that new work arrived
  
  return { 
    success: true, 
    message: 'Workers notified',
    activeWorkers: activeWorkers
  };
}

/**
 * Create Express server
 */
function createServer() {
  const app = express();
  
  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  
  // CORS middleware to allow requests from localhost and production
  app.use((req, res, next) => {
    const allowedOrigins = [
      'http://localhost:3000',
      'https://webtoys.ai',
      'https://www.webtoys.ai'
    ];
    
    const origin = req.headers.origin;
    if (allowedOrigins.includes(origin)) {
      res.header('Access-Control-Allow-Origin', origin);
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    res.header('Access-Control-Allow-Credentials', 'true');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      console.log(`🔍 OPTIONS preflight request from ${req.headers.origin} to ${req.path}`);
      res.sendStatus(200);
    } else {
      next();
    }
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      editAgentEnabled: EDIT_AGENT_ENABLED,
      activeWorkers: activeWorkers,
      maxWorkers: MAX_WORKERS,
      timestamp: new Date().toISOString()
    });
  });

  // Main webhook endpoint for triggering edit processing
  app.post('/webhook/trigger-edit-processing', async (req, res) => {
    console.log('\n🔔 Webhook triggered for edit processing');
    console.log(`📅 Time: ${new Date().toISOString()}`);
    console.log(`📦 Request body:`, JSON.stringify(req.body));
    console.log(`🔍 Headers:`, req.headers['user-agent']);
    
    if (!checkEditAgentEnabled()) {
      return res.status(503).json({
        success: false,
        message: 'Edit Agent is disabled on this machine'
      });
    }

    // Optional: Log request details
    if (req.body.revisionId) {
      console.log(`📝 Revision ID: ${req.body.revisionId}`);
    }

    // Just notify workers - they handle the actual processing
    const result = await triggerWorkers();
    
    // Always return success - the request is queued
    res.json({
      success: true,
      message: 'Edit request queued for processing',
      activeWorkers: activeWorkers,
      timestamp: new Date().toISOString()
    });
  });

  // Endpoint to manually trigger processing (for testing)
  app.get('/trigger', async (req, res) => {
    console.log('\n🧪 Manual trigger for edit processing');
    
    if (!checkEditAgentEnabled()) {
      return res.status(503).json({
        success: false,
        message: 'Edit Agent is disabled on this machine'
      });
    }

    const result = await triggerWorkers();
    res.json({
      ...result,
      note: 'Workers have been notified to check for new edits'
    });
  });

  // Community Desktop webhook endpoint (V1 - deprecated but kept for compatibility)
  app.post('/webhook/community-desktop', async (req, res) => {
    console.log('\n🖥️  Community Desktop V1 webhook triggered (deprecated)');
    console.log(`📅 Time: ${new Date().toISOString()}`);
    console.log(`📦 Request body:`, JSON.stringify(req.body));
    
    try {
      // Run the Community Desktop monitor to process new submissions
      const { stdout, stderr } = await execAsync(
        `node monitor.js`,
        { 
          cwd: path.join(__dirname, '../community-desktop'),
          maxBuffer: 1024 * 1024 * 10, // 10MB buffer
          timeout: 60000 // 1 minute timeout
        }
      );
      
      console.log('✅ Community Desktop processing completed');
      if (stdout) console.log('Output:', stdout);
      if (stderr) console.error('Errors:', stderr);
      
      res.json({
        success: true,
        message: 'Community Desktop submission processed',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Community Desktop processing failed:', error.message);
      res.status(500).json({
        success: false,
        message: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // ToyBox OS webhook endpoint (V2 - active)
  app.post('/webhook/toybox-apps', async (req, res) => {
    console.log('\n🚀 ToyBox OS App Studio Webhook Received');
    console.log(`📅 Time: ${new Date().toISOString()}`);
    console.log(`📦 Request body:`, JSON.stringify(req.body));
    
    try {
      const { appName, appFunction, appIcon, appType, submitterName, source } = req.body;
      
      // Import Supabase here to save submissions
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_SERVICE_KEY
      );
      
      // Determine which processor should handle this
      const isWindowed = appType === 'windowed';
      const actionType = isWindowed ? 'windowed_app' : 'desktop_app';
      const appId = isWindowed ? 'toybox-windowed-apps' : 'toybox-desktop-apps';
      
      // Store in ZAD for the appropriate processor
      const submission = {
        appName: appName || 'Unnamed App',
        appFunction: appFunction || 'Does something fun',
        appIcon: appIcon || null,
        appType: appType || 'simple',
        submitterName: submitterName || 'Anonymous',
        source: source || 'app-studio',
        status: 'new',
        timestamp: new Date().toISOString()
      };
      
      // Save to wtaf_zero_admin_collaborative
      const { data, error } = await supabase
        .from('wtaf_zero_admin_collaborative')
        .insert({
          app_id: appId,
          action_type: actionType,
          content_data: submission,
          participant_id: submitterName || 'anonymous',
          created_at: new Date()
        });
      
      if (error) {
        console.error('Failed to save submission:', error);
        return res.status(500).json({ error: 'Failed to save submission' });
      }
      
      console.log(`✅ ${appType} app submission saved for processing`);
      
      // Trigger immediate processing based on app type
      try {
        if (isWindowed) {
          console.log('🔄 Triggering windowed app processor...');
          const { stdout, stderr } = await execAsync(
            `node process-windowed-apps.js`,
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
            `node process-toybox-apps.js`,
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
      }
      
      res.json({ 
        success: true, 
        message: `${appType} app submission received`,
        processor: isWindowed ? 'windowed-app-processor' : 'desktop-app-processor'
      });
      
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return app;
}

/**
 * Start server
 */
async function startServer() {
  // Check if we should run at all
  if (!checkEditAgentEnabled()) {
    console.log('🚫 Edit Agent webhook server not starting (EDIT_AGENT_ENABLED=false)');
    process.exit(0);
  }

  // Change to script directory for monitor.js execution
  process.chdir(__dirname);
  
  const app = createServer();
  
  try {
    const server = app.listen(PORT, () => {
      console.log('🎨 Webtoys Edit Agent Webhook Server Started');
      console.log('=' + '='.repeat(50));
      console.log(`🌐 Server running on port ${PORT}`);
      console.log(`📁 Working directory: ${__dirname}`);
      console.log(`⚡ Edit Agent: ${EDIT_AGENT_ENABLED ? 'ENABLED' : 'DISABLED'}`);
      console.log(`📅 Started at: ${new Date().toISOString()}`);
      console.log('=' + '='.repeat(50));
      console.log('📡 Webhook endpoints:');
      console.log(`   POST http://localhost:${PORT}/webhook/trigger-edit-processing`);
      console.log(`   POST http://localhost:${PORT}/webhook/community-desktop`);
      console.log(`   POST http://localhost:${PORT}/webhook/toybox-apps`);
      console.log(`   GET  http://localhost:${PORT}/health`);
      console.log(`   GET  http://localhost:${PORT}/trigger (testing)`);
      console.log('=' + '='.repeat(50));
    });

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🛑 Received SIGINT, shutting down gracefully...');
      server.close(() => {
        console.log('✅ Webhook server closed');
        process.exit(0);
      });
    });

    process.on('SIGTERM', () => {
      console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
      server.close(() => {
        console.log('✅ Webhook server closed');
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start webhook server:', error);
    process.exit(1);
  }
}

// Start server if run directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { startServer, triggerWorkers, activeWorkers, MAX_WORKERS };