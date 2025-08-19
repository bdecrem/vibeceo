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
  
  // CORS middleware to allow requests from localhost:3000
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:3000');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
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

  // Community Desktop webhook endpoint
  app.post('/webhook/community-desktop', async (req, res) => {
    console.log('\n🖥️  Community Desktop webhook triggered');
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