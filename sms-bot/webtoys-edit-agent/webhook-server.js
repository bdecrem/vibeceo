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

// Track processing to prevent concurrent runs
let isProcessing = false;
let processingQueue = [];

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
 * Process edit requests using the existing monitor.js
 */
async function processEditRequests() {
  if (isProcessing) {
    console.log('⏳ Edit processing already in progress, skipping...');
    return { success: false, message: 'Already processing' };
  }

  isProcessing = true;
  
  try {
    console.log('🎨 Starting edit processing via webhook...');
    
    // Run the complete edit pipeline
    const { stdout, stderr } = await execAsync(
      `node monitor.js`,
      {
        cwd: __dirname,
        maxBuffer: 1024 * 1024 * 10, // 10MB buffer
        timeout: 300000 // 5 minute timeout
      }
    );

    console.log('📊 Edit processing output:');
    if (stdout) console.log(stdout);
    if (stderr && !stderr.includes('Warning')) {
      console.error('⚠️ Edit processing warnings:', stderr);
    }

    console.log('✅ Edit processing completed successfully');
    return { 
      success: true, 
      message: 'Edit processing completed',
      output: stdout
    };

  } catch (error) {
    console.error('❌ Edit processing failed:', error.message);
    
    return { 
      success: false, 
      message: error.message,
      output: error.stdout || '',
      errors: error.stderr || ''
    };
  } finally {
    isProcessing = false;
  }
}

/**
 * Create Express server
 */
function createServer() {
  const app = express();
  
  // Middleware
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      editAgentEnabled: EDIT_AGENT_ENABLED,
      processing: isProcessing,
      timestamp: new Date().toISOString()
    });
  });

  // Main webhook endpoint for triggering edit processing
  app.post('/webhook/trigger-edit-processing', async (req, res) => {
    console.log('\n🔔 Webhook triggered for edit processing');
    console.log(`📅 Time: ${new Date().toISOString()}`);
    
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

    // Process edits
    const result = await processEditRequests();
    
    if (result.success) {
      res.json({
        success: true,
        message: 'Edit processing completed successfully',
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        timestamp: new Date().toISOString()
      });
    }
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

    const result = await processEditRequests();
    res.json(result);
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

export { startServer, processEditRequests };