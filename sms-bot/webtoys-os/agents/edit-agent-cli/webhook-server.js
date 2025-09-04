#!/usr/bin/env node

/**
 * WebtoysOS Edit Agent CLI - Webhook Server
 * Receives edit requests from Issue Tracker and processes them using Claude CLI
 */

import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { spawn } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables - try multiple locations
dotenv.config({ path: path.join(__dirname, '../../../../.env.local') });
dotenv.config({ path: path.join(__dirname, '../../../.env.local') });
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Verify required environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing required environment variables!');
    console.error('   Please ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set in:');
    console.error('   /Users/bartdecrem/Documents/code/vibeceo8/sms-bot/.env.local');
    process.exit(1);
}

const app = express();
app.use(express.json());

// CORS - Allow requests from webtoys.ai
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    
    next();
});

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const PORT = process.env.WEBTOYS_EDIT_PORT || 3032;
const QUEUE_FILE = path.join(__dirname, '.edit-queue.json');

// Ensure logs directory exists
await fs.mkdir(path.join(__dirname, 'logs'), { recursive: true });

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'webtoys-os-edit-agent-cli',
        timestamp: new Date().toISOString()
    });
});

/**
 * Webhook endpoint for Issue Tracker notifications
 */
app.post('/webhook', async (req, res) => {
    console.log(`\n🔔 Webhook notification received at ${new Date().toISOString()}`);
    
    try {
        const { type, issue } = req.body;
        
        if (type !== 'new_issue' || !issue) {
            return res.json({ 
                success: false, 
                message: 'Not a new issue notification' 
            });
        }
        
        const issueData = issue.content_data || {};
        console.log(`  📝 New issue: ${issueData.title}`);
        console.log(`  👤 Author: ${issueData.author || 'anonymous'}`);
        console.log(`  📊 Status: ${issueData.status || 'open'}`);
        
        // Skip issues that shouldn't be auto-processed
        if (['waiting_for_user', 'needs_admin', 'closed', 'processing'].includes(issueData.status)) {
            console.log(`  ⏭️ Skipping issue with status: ${issueData.status}`);
            return res.json({ 
                success: false, 
                message: `Issue has status '${issueData.status}' - not processing` 
            });
        }
        
        // Queue the issue for processing
        const editRequest = {
            id: `issue-${issue.id}`,
            issueId: issue.id,
            appSlug: issueData.targetApp || 'toybox-os-v3-test',
            description: issueData.description || '',
            title: issueData.title || 'Untitled Issue',
            author: issueData.author || 'anonymous',
            status: 'pending',
            timestamp: new Date().toISOString()
        };
        
        // Add to queue
        await queueEdit(editRequest);
        
        // Start worker if not already running
        startWorkerIfNeeded();
        
        res.json({ 
            success: true, 
            message: 'Issue queued for processing',
            requestId: editRequest.id
        });
        
    } catch (error) {
        console.error('❌ Error handling webhook:', error);
        res.status(500).json({ 
            error: 'Failed to process webhook',
            details: error.message 
        });
    }
});

/**
 * Receive edit request from Issue Tracker (legacy endpoint)
 */
app.post(['/edit', '/webhook'], async (req, res) => {
    console.log(`\n📥 Received edit request at ${new Date().toISOString()}`);
    
    try {
        const { issueId, appSlug, description, author } = req.body;
        
        if (!issueId || !description) {
            return res.status(400).json({ 
                error: 'Missing required fields: issueId and description' 
            });
        }
        
        console.log(`  📝 Issue #${issueId}: ${description.substring(0, 100)}...`);
        console.log(`  🎯 Target: ${appSlug || 'WebtoysOS Desktop'}`);
        console.log(`  👤 Author: ${author || 'anonymous'}`);
        
        // Queue the edit request
        const editRequest = {
            id: `issue-${issueId}`,
            issueId,
            appSlug: appSlug || 'toybox-os-v3-test',
            description,
            author,
            status: 'pending',
            timestamp: new Date().toISOString()
        };
        
        // Add to queue
        await queueEdit(editRequest);
        
        // Start worker if not already running
        startWorkerIfNeeded();
        
        res.json({ 
            success: true, 
            message: 'Edit request queued for processing',
            requestId: editRequest.id
        });
        
    } catch (error) {
        console.error('❌ Error handling edit request:', error);
        res.status(500).json({ 
            error: 'Failed to process edit request',
            details: error.message 
        });
    }
});

/**
 * Queue an edit request
 */
async function queueEdit(request) {
    let queue = [];
    
    try {
        const data = await fs.readFile(QUEUE_FILE, 'utf-8');
        queue = JSON.parse(data);
    } catch (error) {
        // File doesn't exist, start with empty queue
    }
    
    // Add to queue if not already there
    if (!queue.find(r => r.id === request.id)) {
        queue.push(request);
        await fs.writeFile(QUEUE_FILE, JSON.stringify(queue, null, 2));
        console.log(`  ✅ Queued edit request ${request.id}`);
    } else {
        console.log(`  ⚠️ Edit request ${request.id} already in queue`);
    }
}

/**
 * Start worker process if not already running
 */
let workerProcess = null;

function startWorkerIfNeeded() {
    if (workerProcess) {
        console.log('  ℹ️ Worker already running');
        return;
    }
    
    console.log('  🚀 Starting worker process...');
    
    // Use worker-v3.js for simplified Claude-driven logic
    const workerFile = 'worker-v3.js';  // v3: Claude does everything
    workerProcess = spawn('node', [path.join(__dirname, workerFile)], {
        cwd: __dirname,
        env: { ...process.env },
        stdio: ['ignore', 'pipe', 'pipe']
    });
    
    workerProcess.stdout.on('data', (data) => {
        console.log(`[Worker] ${data.toString().trim()}`);
    });
    
    workerProcess.stderr.on('data', (data) => {
        console.error(`[Worker Error] ${data.toString().trim()}`);
    });
    
    workerProcess.on('exit', (code) => {
        console.log(`[Worker] Exited with code ${code}`);
        workerProcess = null;
    });
}

/**
 * Manual trigger endpoint for testing
 */
app.post('/trigger', async (req, res) => {
    console.log('\n🔧 Manual trigger received');
    
    try {
        // Check for open issues in the tracker
        // EXCLUDE issues that are waiting_for_user or needs_admin to prevent loops
        const { data: issues, error } = await supabase
            .from('webtoys_issue_tracker_data')
            .select('*')
            .eq('app_id', 'toybox-issue-tracker-v3')
            .eq('action_type', 'issue')
            .eq('content_data->>status', 'open')
            .not('content_data->>status', 'in', '["waiting_for_user", "needs_admin"]')
            .or('content_data->deleted.is.null,content_data->>deleted.neq.true')
            .order('created_at', { ascending: false })
            .limit(1);
        
        if (error) throw error;
        
        if (!issues || issues.length === 0) {
            return res.json({ 
                success: false, 
                message: 'No open issues found' 
            });
        }
        
        const issue = issues[0];
        const issueData = issue.content_data || {};
        
        // Queue the issue for processing
        const editRequest = {
            id: `issue-${issue.id}`,
            issueId: issue.id,
            appSlug: issueData.targetApp || 'toybox-os-v3-test',
            description: issueData.description || '',
            author: issueData.author || 'anonymous',
            status: 'pending',
            timestamp: new Date().toISOString()
        };
        
        await queueEdit(editRequest);
        startWorkerIfNeeded();
        
        res.json({ 
            success: true, 
            message: 'Issue queued for processing',
            issue: editRequest
        });
        
    } catch (error) {
        console.error('❌ Error in manual trigger:', error);
        res.status(500).json({ 
            error: 'Failed to trigger processing',
            details: error.message 
        });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════╗
║   WebtoysOS Edit Agent CLI - Webhook Server   ║
╠════════════════════════════════════════════════╣
║  Status: 🟢 Running                            ║
║  Port: ${PORT}                                ║
║  Time: ${new Date().toISOString()}              ║
╚════════════════════════════════════════════════╝

Endpoints:
  POST /edit     - Receive edit request
  POST /trigger  - Manual trigger
  GET  /health   - Health check

Waiting for edit requests...
`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\n\n🛑 Shutting down webhook server...');
    if (workerProcess) {
        workerProcess.kill();
    }
    process.exit(0);
});