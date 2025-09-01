#!/usr/bin/env node

/**
 * WebtoysOS Edit Agent CLI - Worker
 * Processes edit requests using Claude CLI
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../../.env.local') });

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const QUEUE_FILE = path.join(__dirname, '.edit-queue.json');

// Find Claude CLI
const CLAUDE_PATHS = [
    '/opt/homebrew/bin/claude',
    '/Users/bartdecrem/.local/bin/claude'
];

let CLAUDE_PATH = null;
for (const p of CLAUDE_PATHS) {
    try {
        await fs.access(p);
        CLAUDE_PATH = p;
        break;
    } catch {}
}

if (!CLAUDE_PATH) {
    console.error('❌ Claude CLI not found');
    process.exit(1);
}

console.log(`✅ Using Claude CLI at: ${CLAUDE_PATH}`);

/**
 * Main processing loop
 */
async function processQueue() {
    console.log('🔄 Starting to process edit queue...');
    
    while (true) {
        try {
            // Load queue
            const queue = await loadQueue();
            
            if (queue.length === 0) {
                console.log('✅ Queue empty, exiting worker');
                break;
            }
            
            // Get next pending request
            const request = queue.find(r => r.status === 'pending');
            
            if (!request) {
                console.log('✅ No pending requests, exiting worker');
                break;
            }
            
            console.log(`\n📝 Processing ${request.id}...`);
            
            // Update status
            await updateRequestStatus(request.id, 'processing');
            
            // Process the edit
            const result = await processEdit(request);
            
            if (result.success) {
                console.log(`✅ Successfully processed ${request.id}`);
                await updateRequestStatus(request.id, 'completed', result);
                
                // Update issue tracker if this came from there
                if (request.issueId) {
                    await updateIssueStatus(request.issueId, 'completed', result.summary);
                }
            } else {
                console.error(`❌ Failed to process ${request.id}: ${result.error}`);
                await updateRequestStatus(request.id, 'failed', result);
                
                if (request.issueId) {
                    await updateIssueStatus(request.issueId, 'failed', result.error);
                }
            }
            
        } catch (error) {
            console.error('❌ Error in processing loop:', error);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    
    console.log('👋 Worker finished');
}

/**
 * Load the edit queue
 */
async function loadQueue() {
    try {
        const data = await fs.readFile(QUEUE_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

/**
 * Update request status in queue
 */
async function updateRequestStatus(requestId, status, result = null) {
    const queue = await loadQueue();
    const request = queue.find(r => r.id === requestId);
    
    if (request) {
        request.status = status;
        request.processedAt = new Date().toISOString();
        if (result) {
            request.result = result;
        }
        await fs.writeFile(QUEUE_FILE, JSON.stringify(queue, null, 2));
    }
}

/**
 * Process an edit request using Claude CLI
 */
async function processEdit(request) {
    try {
        // Load the current app HTML
        const { data: app, error: fetchError } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', request.appSlug)
            .single();
        
        if (fetchError || !app) {
            throw new Error(`Failed to load app: ${request.appSlug}`);
        }
        
        // Build prompt for Claude
        const prompt = buildEditPrompt(request, app.html_content);
        
        // Save prompt to temp file
        const tempDir = os.tmpdir();
        const promptFile = path.join(tempDir, `edit-${request.id}.md`);
        await fs.writeFile(promptFile, prompt, 'utf-8');
        
        console.log('  🤖 Calling Claude CLI...');
        
        // Execute Claude CLI
        const { stdout, stderr } = await execAsync(
            `cat "${promptFile}" | ${CLAUDE_PATH}`,
            {
                maxBuffer: 1024 * 1024 * 50, // 50MB
                timeout: 120000, // 2 minutes
                shell: '/bin/bash'
            }
        );
        
        // Clean up temp file
        await fs.unlink(promptFile).catch(() => {});
        
        if (stderr && stderr.includes('error')) {
            throw new Error(`Claude CLI error: ${stderr}`);
        }
        
        // Extract HTML from Claude's response
        const editedHtml = extractHtmlFromResponse(stdout);
        
        if (!editedHtml) {
            throw new Error('No valid HTML returned from Claude');
        }
        
        // Validate the HTML
        if (!validateHtml(editedHtml)) {
            throw new Error('Generated HTML failed validation');
        }
        
        // Deploy the edited HTML
        console.log('  📤 Deploying to Supabase...');
        
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({ 
                html_content: editedHtml,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', request.appSlug);
        
        if (updateError) {
            throw new Error(`Failed to deploy: ${updateError.message}`);
        }
        
        // Create a backup
        await createBackup(request.appSlug, app.html_content, 'before-edit');
        await createBackup(request.appSlug, editedHtml, 'after-edit');
        
        return {
            success: true,
            summary: `Successfully edited ${request.appSlug}`,
            changes: stdout.substring(0, 500)
        };
        
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Build the edit prompt for Claude
 */
function buildEditPrompt(request, currentHtml) {
    return `You are editing a WebtoysOS application. The user has requested the following change:

"${request.description}"

Target App: ${request.appSlug}
Author: ${request.author || 'anonymous'}

CRITICAL RULES:
1. Preserve ALL existing functionality
2. Maintain all authentication patterns (use .handle not .username)
3. Keep all ZAD API calls intact
4. Preserve window manager integration
5. Keep responsive design patterns
6. Don't break any JavaScript functionality
7. Test that your changes work mentally before returning

For this specific request:
- Focus on making the exact change requested
- Don't add features that weren't asked for
- Preserve the existing UI style unless changing it was requested
- Keep all event listeners and data persistence working

Here is the current HTML:

\`\`\`html
${currentHtml}
\`\`\`

Please provide the complete edited HTML that implements the requested change. Return ONLY the HTML code, starting with <!DOCTYPE html> and ending with </html>. Do not include any explanation or markdown code blocks - just the raw HTML.`;
}

/**
 * Extract HTML from Claude's response
 */
function extractHtmlFromResponse(response) {
    // Claude might wrap in markdown or just return raw HTML
    let html = response;
    
    // Remove markdown code blocks if present
    const codeBlockMatch = response.match(/```html?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
        html = codeBlockMatch[1];
    }
    
    // Ensure it starts with <!DOCTYPE html>
    if (!html.includes('<!DOCTYPE html>') && !html.includes('<!doctype html>')) {
        return null;
    }
    
    // Clean up any extra whitespace
    html = html.trim();
    
    return html;
}

/**
 * Validate HTML structure
 */
function validateHtml(html) {
    // Basic validation
    if (!html.includes('<!DOCTYPE html>') && !html.includes('<!doctype html>')) {
        return false;
    }
    
    if (!html.includes('<html') || !html.includes('</html>')) {
        return false;
    }
    
    if (!html.includes('<body') || !html.includes('</body>')) {
        return false;
    }
    
    // Check for common WebtoysOS requirements
    if (html.includes('window.APP_ID')) {
        // This is a windowed app, check for auth listener
        if (!html.includes('TOYBOX_AUTH')) {
            console.warn('⚠️ Warning: Windowed app missing auth listener');
        }
    }
    
    return true;
}

/**
 * Create a backup of the HTML
 */
async function createBackup(appSlug, html, suffix) {
    const backupDir = path.join(__dirname, 'backups');
    await fs.mkdir(backupDir, { recursive: true });
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${appSlug}_${timestamp}_${suffix}.html`;
    
    await fs.writeFile(path.join(backupDir, filename), html, 'utf-8');
    console.log(`  💾 Backup saved: ${filename}`);
}

/**
 * Update issue status in tracker
 */
async function updateIssueStatus(issueId, status, message) {
    try {
        // Get current issue
        const { data: issue, error: fetchError } = await supabase
            .from('webtoys_issue_tracker_data')
            .select('content_data')
            .eq('id', issueId)
            .single();
        
        if (fetchError) throw fetchError;
        
        // Update content data
        const updatedData = {
            ...issue.content_data,
            status,
            processedAt: new Date().toISOString(),
            processingLog: message,
            processedBy: 'edit-agent-cli'
        };
        
        // Update issue
        const { error: updateError } = await supabase
            .from('webtoys_issue_tracker_data')
            .update({ 
                content_data: updatedData,
                status
            })
            .eq('id', issueId);
        
        if (updateError) throw updateError;
        
        console.log(`  ✅ Updated issue #${issueId} status to ${status}`);
        
    } catch (error) {
        console.error(`  ❌ Failed to update issue status: ${error.message}`);
    }
}

// Start processing
processQueue().catch(console.error);