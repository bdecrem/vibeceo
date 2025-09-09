#!/usr/bin/env node

/**
 * WebtoysOS Edit Agent CLI - Worker v2
 * Refactored with clean separation of concerns:
 * 1. Classification (Worker)
 * 2. Generation (Claude Code Headless)
 * 3. Deployment (Worker)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { spawn } from 'child_process';
import os from 'os';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../../.env.local') });
dotenv.config({ path: path.join(__dirname, '../../../.env.local') });
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Verify required environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing required environment variables!');
    process.exit(1);
}

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

// ============================================================================
// CLASSIFICATION LOGIC - Determine request type
// ============================================================================

const RequestType = {
    CREATE_APP: 'CREATE_APP',
    EDIT_APP: 'EDIT_APP',
    OTHER: 'OTHER'
};

/**
 * Classify the request type based on title and description
 */
function classifyRequest(title, description, appSlug) {
    // Combine title and description for full context
    const fullText = `${title || ''} ${description || ''}`.trim().toLowerCase();
    
    // Type 3: OTHER - Check FIRST for desktop/OS level changes!
    // These should ALWAYS go to admin for review
    const desktopPatterns = [
        /\b(change|modify|update)\s+(?:the\s+)?(webtoys\s*os|desktop|toybox\s*os)/i,  // "change the Webtoys OS"
        /\bmultiple\s+desktops?/i,  // "multiple desktops"
        /\bdesktop\s+(theme|configuration|settings)/i,
        /\b(delete|remove)\s+(all|every)/i,  // "delete all apps"
        /\bsystem[\s-]?(wide|level)/i,  // "system-wide changes"
    ];
    
    if (desktopPatterns.some(pattern => pattern.test(fullText))) {
        return RequestType.OTHER;
    }
    
    // Type 2: EDIT EXISTING APP
    // Look for edit/fix/change/modify keywords with SPECIFIC app references
    const editPatterns = [
        /\b(fix|edit|change|modify|update|improve)\s+(?:the\s+)?(\w+)\s+app/i,  // "fix the brushez app"
        /\b(fix|edit|change|modify|update)\s+(\w+)(?!\s*os)/i,  // "fix brushez" but NOT "change webtoys os"
        /make\s+(?:it|the\s+\w+\s+app)\s+/i,  // "make it use..." implies editing
        /add\s+.*\s+to\s+(?:the\s+)?(\w+)\s+app/i,  // "add feature to brushez app"
    ];
    
    if (editPatterns.some(pattern => pattern.test(fullText))) {
        return RequestType.EDIT_APP;
    }
    
    // Type 1: CREATE NEW APP
    // Look for create/make/build keywords without existing app references
    const createPatterns = [
        /\b(create|make|build|add|develop)\s+(?:a|an)\s+(?:new\s+)?(?:simple\s+)?(\w+\s+)?(app|application|game|tool|editor|calculator|paint|notepad)/i,
        /\b(create|make|build)\s+.*\s+(?:called|named)\s+/i,  // "make X called Y"
    ];
    
    if (createPatterns.some(pattern => pattern.test(fullText))) {
        return RequestType.CREATE_APP;
    }
    
    // Type 3: OTHER (fallback)
    // Everything else - unclear requests, admin decisions needed
    return RequestType.OTHER;
}

// ============================================================================
// TYPE 1: CREATE NEW APP
// ============================================================================

async function processCreateApp(request) {
    console.log('  🎨 Processing CREATE NEW APP request');
    
    // Step 1: Build prompt for Claude to generate the app
    const prompt = `You are creating a new WebtoysOS application based on this user request:

Title: ${request.title || 'No title provided'}
Description: ${request.description || 'No description provided'}

Full request: "${request.title || ''} ${request.description || ''}"

IMPORTANT: Generate a complete, self-contained HTML application that:
1. Works perfectly in an iframe (will be opened in a window)
2. Has the exact name the user requested (if they said "call it BRET", use BRET as the title)
3. Includes all necessary JavaScript inline
4. Uses clean, modern design

REQUIRED WebtoysOS Integration:
Include these exact helper functions for data persistence and authentication:

\`\`\`javascript
// APP ID - Use a slug version of your app name
window.APP_ID = 'your-app-name-here';  // CHANGE THIS to match your app
let currentUser = null;

// Listen for authentication from desktop
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'TOYBOX_AUTH') {
        currentUser = event.data.user;
        updateUI(); // Define this based on your app's needs
    }
});

// ZAD API helpers for data persistence
async function save(dataType, data) {
    const response = await fetch('/api/zad/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            app_id: window.APP_ID,
            participant_id: currentUser?.handle ? \`\${currentUser.handle.toUpperCase()}_\${currentUser.pin}\` : 'anonymous',
            action_type: dataType,
            content_data: data
        })
    });
    return response.ok;
}

async function load(dataType) {
    const response = await fetch(\`/api/zad/load?app_id=\${window.APP_ID}&action_type=\${dataType}\`);
    const data = await response.json();
    return data || [];
}
\`\`\`

IMPORTANT OUTPUT FORMAT:
Start your response with these metadata markers (replace with actual values):
<!-- APP_NAME: YourAppName -->
<!-- APP_ICON: 📱 -->
<!-- APP_TYPE: tool -->

Then provide the complete HTML starting with <!DOCTYPE html>

Remember: The APP_NAME should be EXACTLY what the user asked for. If they said "call it BRET", use BRET, not "Text Editor".`;

    // Step 2: Call Claude Code Headless
    console.log('  🤖 Calling Claude CLI to generate app...');
    const tempDir = os.tmpdir();
    const promptFile = path.join(tempDir, `create-${request.id}.md`);
    await fs.writeFile(promptFile, prompt, 'utf-8');
    
    const result = await executeClaudeWithSpawn(promptFile, request.id);
    await fs.unlink(promptFile).catch(() => {});
    
    if (!result.success) {
        throw new Error(`Claude CLI failed: ${result.error}`);
    }
    
    // Step 3: Extract metadata and HTML from Claude's response
    const response = result.stdout;
    
    // Extract metadata
    const appNameMatch = response.match(/<!-- APP_NAME:\s*(.+?)\s*-->/);
    const appIconMatch = response.match(/<!-- APP_ICON:\s*(.+?)\s*-->/);
    const appTypeMatch = response.match(/<!-- APP_TYPE:\s*(.+?)\s*-->/);
    
    const appName = appNameMatch ? appNameMatch[1].trim() : 'New App';
    const appIcon = appIconMatch ? appIconMatch[1].trim() : '📱';
    const appType = appTypeMatch ? appTypeMatch[1].trim() : 'app';
    
    console.log(`  📦 Extracted metadata: Name="${appName}", Icon="${appIcon}", Type="${appType}"`);
    
    // Extract HTML (everything after the metadata comments)
    const htmlMatch = response.match(/<!DOCTYPE html>[\s\S]*/);
    if (!htmlMatch) {
        throw new Error('Failed to extract valid HTML from Claude response');
    }
    const appHtml = htmlMatch[0];
    
    console.log(`  ✅ Generated ${appName} app (${appHtml.length} bytes)`);
    
    // Step 4: Generate unique slug
    const baseSlug = `toybox-${appName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
    let finalSlug = baseSlug;
    let counter = 2;
    
    while (true) {
        const { data: existing } = await supabase
            .from('wtaf_content')
            .select('app_slug')
            .eq('user_slug', 'public')
            .eq('app_slug', finalSlug)
            .single();
        
        if (!existing) break;
        
        console.log(`  ⚠️  ${finalSlug} exists, trying ${baseSlug}-${counter}...`);
        finalSlug = `${baseSlug}-${counter}`;
        counter++;
    }
    
    console.log(`  📋 Using slug: ${finalSlug}`);
    
    // Step 5: Deploy to Supabase
    console.log('  📤 Deploying app to Supabase...');
    const timestamp = new Date().toISOString();
    
    const { error: deployError } = await supabase
        .from('wtaf_content')
        .insert({
            user_slug: 'public',
            app_slug: finalSlug,
            html_content: appHtml,
            created_at: timestamp,
            updated_at: timestamp,
            original_prompt: `${appName} - Created by Edit Agent: ${request.description}`
        });
    
    if (deployError) {
        throw new Error(`Failed to deploy app: ${deployError.message}`);
    }
    
    // Step 6: Register in desktop
    console.log('  📱 Registering app in desktop...');
    
    const { data: configData, error: configError } = await supabase
        .from('wtaf_desktop_config')
        .select('*')
        .eq('desktop_version', 'webtoys-os-v3')
        .is('user_id', null)
        .single();
    
    if (configError) {
        throw new Error(`Failed to get desktop config: ${configError.message}`);
    }
    
    let appRegistry = configData.app_registry || [];
    const appId = finalSlug.replace('toybox-', '');
    
    const appEntry = {
        id: appId,
        name: appName,
        url: `/public/${finalSlug}`,
        icon: appIcon,
        width: 800,
        height: 600,
        resizable: true
    };
    
    // Add or update in registry
    const existingIndex = appRegistry.findIndex(app => app.id === appId);
    if (existingIndex >= 0) {
        appRegistry[existingIndex] = appEntry;
    } else {
        appRegistry.push(appEntry);
    }
    
    // Update desktop config
    const { error: updateError } = await supabase
        .from('wtaf_desktop_config')
        .update({ 
            app_registry: appRegistry,
            updated_at: timestamp
        })
        .eq('desktop_version', 'webtoys-os-v3')
        .is('user_id', null);
    
    if (updateError) {
        throw new Error(`Failed to update desktop config: ${updateError.message}`);
    }
    
    // Step 7: Save backup
    const backupDir = path.join(__dirname, 'backups');
    await fs.mkdir(backupDir, { recursive: true });
    const backupFile = path.join(backupDir, `${finalSlug}_${timestamp.replace(/[:.]/g, '-')}_created.html`);
    await fs.writeFile(backupFile, appHtml, 'utf-8');
    console.log(`  💾 Backup saved: ${path.basename(backupFile)}`);
    
    return {
        success: true,
        summary: `Created ${appName} app and added to desktop`,
        appUrl: `https://webtoys.ai/public/${finalSlug}`,
        changes: `New app created: ${appName} with icon ${appIcon}`
    };
}

// ============================================================================
// TYPE 2: EDIT EXISTING APP
// ============================================================================

async function processEditApp(request) {
    console.log('  ✏️  Processing EDIT EXISTING APP request');
    
    // Step 1: Get all registered apps for context
    const { data: configData, error: configError } = await supabase
        .from('wtaf_desktop_config')
        .select('app_registry')
        .eq('desktop_version', 'webtoys-os-v3')
        .is('user_id', null)
        .single();
    
    if (configError) {
        throw new Error(`Failed to get app registry: ${configError.message}`);
    }
    
    const appRegistry = configData?.app_registry || [];
    
    // Step 2: Try to find the app mentioned in the request
    const requestText = `${request.title} ${request.description}`.toLowerCase();
    let likelyApp = null;
    
    for (const app of appRegistry) {
        const appName = app.name.toLowerCase();
        const appId = app.id.toLowerCase();
        if (requestText.includes(appName) || requestText.includes(appId)) {
            likelyApp = app;
            break;
        }
    }
    
    // If we found a likely match, load its current HTML
    let currentAppHtml = null;
    if (likelyApp) {
        console.log(`  🎯 Likely target app: ${likelyApp.id} (${likelyApp.name})`);
        const { data: appData } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', `toybox-${likelyApp.id}`)
            .single();
        
        if (appData) {
            currentAppHtml = appData.html_content;
            console.log(`  📄 Loaded current HTML for ${likelyApp.id} (${currentAppHtml.length} bytes)`);
        }
    }
    
    // Step 3: Build prompt for Claude to identify target and edit
    const prompt = `You are processing an edit request for WebtoysOS.

User Request:
Title: ${request.title || 'No title'}
Description: ${request.description || 'No description'}

CRITICAL: The app name may be in EITHER the title OR description. For example:
- "fix the brushez app" - brushez is the target app
- "change the paint app" - paint is the target app  
- "edit Pa1nt" - Pa1nt is the target app

Existing Apps in the Desktop:
${appRegistry.map(app => `- ${app.id} (${app.name}) - URL: /public/toybox-${app.id}`).join('\n')}

INSTRUCTIONS:
1. Look for app names in BOTH title ("${request.title}") AND description
2. Match flexibly: "brushez" matches "brushez", "paint" matches "pa1nt", etc.
3. If you find a clear match, PROCEED with editing
4. Only ask for clarification if genuinely ambiguous

REQUIRED OUTPUT FORMAT:
<!-- EDIT_ACTION: PROCEED | CLARIFY | NOT_FOUND -->
<!-- TARGET_APP: app-slug-here (only if PROCEED) -->
<!-- MESSAGE: Your clarification request or explanation (if CLARIFY or NOT_FOUND) -->

If action is PROCEED:
- First show what changes you're making
- Then provide the complete edited HTML starting with <!DOCTYPE html>

${likelyApp && currentAppHtml ? `
LIKELY TARGET FOUND: ${likelyApp.id} (${likelyApp.name})
Current HTML of this app is provided below. If this is the correct app, edit it according to the request.

<current_html>
${currentAppHtml}
</current_html>
` : 'No obvious app match found - you may need to ask for clarification.'}`;

    // Step 3: Call Claude Code Headless
    console.log('  🤖 Calling Claude CLI to process edit request...');
    const tempDir = os.tmpdir();
    const promptFile = path.join(tempDir, `edit-${request.id}.md`);
    await fs.writeFile(promptFile, prompt, 'utf-8');
    
    const result = await executeClaudeWithSpawn(promptFile, request.id);
    await fs.unlink(promptFile).catch(() => {});
    
    if (!result.success) {
        throw new Error(`Claude CLI failed: ${result.error}`);
    }
    
    // Step 4: Parse Claude's response
    const response = result.stdout;
    const actionMatch = response.match(/<!-- EDIT_ACTION:\s*(.+?)\s*-->/);
    const action = actionMatch ? actionMatch[1].trim() : 'CLARIFY';
    
    console.log(`  📊 Claude's decision: ${action}`);
    
    if (action === 'PROCEED') {
        // Extract target app and edited HTML
        const targetMatch = response.match(/<!-- TARGET_APP:\s*(.+?)\s*-->/);
        const targetApp = targetMatch ? targetMatch[1].trim() : null;
        
        if (!targetApp) {
            throw new Error('Claude did not specify target app');
        }
        
        const htmlMatch = response.match(/<!DOCTYPE html>[\s\S]*/);
        if (!htmlMatch) {
            throw new Error('Claude did not provide edited HTML');
        }
        
        const editedHtml = htmlMatch[0];
        console.log(`  ✅ Editing app: ${targetApp} (${editedHtml.length} bytes)`);
        
        // Step 5: Update the app in Supabase
        const fullSlug = targetApp.startsWith('toybox-') ? targetApp : `toybox-${targetApp}`;
        console.log(`  📤 Updating ${fullSlug} in Supabase...`);
        
        const timestamp = new Date().toISOString();
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({
                html_content: editedHtml,
                updated_at: timestamp
            })
            .eq('user_slug', 'public')
            .eq('app_slug', fullSlug);
        
        if (updateError) {
            throw new Error(`Failed to update app: ${updateError.message}`);
        }
        
        // Step 6: Save backup
        const backupDir = path.join(__dirname, 'backups');
        await fs.mkdir(backupDir, { recursive: true });
        const backupFile = path.join(backupDir, `${fullSlug}_${timestamp.replace(/[:.]/g, '-')}_edited.html`);
        await fs.writeFile(backupFile, editedHtml, 'utf-8');
        console.log(`  💾 Backup saved: ${path.basename(backupFile)}`);
        
        return {
            success: true,
            summary: `Successfully edited ${targetApp}`,
            appUrl: `https://webtoys.ai/public/${fullSlug}`,
            changes: `Applied changes to ${targetApp}`
        };
        
    } else {
        // CLARIFY or NOT_FOUND - need to ask for clarification
        const messageMatch = response.match(/<!-- MESSAGE:\s*(.+?)\s*-->/);
        const message = messageMatch ? messageMatch[1].trim() : 'Please clarify which app you want to edit.';
        
        console.log(`  💬 Adding clarification request to issue...`);
        
        // Add comment to issue
        await addIssueComment(request.issueId, `🤖 Edit Agent needs clarification:\n\n${message}`);
        
        return {
            success: false,
            needsClarification: true,
            error: `Clarification needed: ${message}`
        };
    }
}

// ============================================================================
// TYPE 3: OTHER (Admin Escalation)
// ============================================================================

async function processOther(request) {
    console.log('  ❓ Processing OTHER request type');
    console.log('  👮 Escalating to admin for instructions...');
    
    // Build a message for the admin
    const adminMessage = `🤖 Edit Agent needs admin guidance:

**Request Type**: UNCLASSIFIED/OTHER
**Title**: ${request.title || 'No title'}
**Description**: ${request.description || 'No description'}
**Author**: ${request.author || 'unknown'}

This request doesn't match standard CREATE or EDIT patterns. Possible interpretations:
- Desktop configuration change
- App deletion request
- Theme modification
- System-level change
- Unclear/ambiguous request

**Admin (@bart)**: Please provide instructions on how to handle this request, or clarify what the user is asking for.`;
    
    // Add comment to issue for admin
    await addIssueComment(request.issueId, adminMessage);
    
    // Update issue status to indicate it needs admin attention
    console.log('  📝 Marked issue as needing admin review');
    
    return {
        success: false,
        needsAdmin: true,
        error: 'Request requires admin review - comment added to issue'
    };
}

// ============================================================================
// MAIN PROCESSING LOGIC
// ============================================================================

async function processQueue() {
    console.log('🔄 Starting to process edit queue...');
    
    while (true) {
        try {
            const queue = await loadQueue();
            
            if (queue.length === 0) {
                console.log('✅ Queue empty, exiting worker');
                break;
            }
            
            const request = queue.find(r => r.status === 'pending');
            
            if (!request) {
                console.log('✅ No pending requests, exiting worker');
                break;
            }
            
            console.log(`\n📝 Processing ${request.id}...`);
            await updateRequestStatus(request.id, 'processing');
            
            // Classify the request type (now includes title)
            const requestType = classifyRequest(request.title, request.description, request.appSlug);
            console.log(`  📊 Request type: ${requestType}`);
            
            let result;
            
            // Route to appropriate handler
            switch (requestType) {
                case RequestType.CREATE_APP:
                    result = await processCreateApp(request);
                    break;
                case RequestType.EDIT_APP:
                    result = await processEditApp(request);
                    break;
                case RequestType.OTHER:
                    result = await processOther(request);
                    break;
                default:
                    throw new Error(`Unknown request type: ${requestType}`);
            }
            
            // Update status
            if (result.success) {
                console.log(`✅ Successfully processed ${request.id}`);
                await updateRequestStatus(request.id, 'completed', result);
                
                if (request.issueId && !isNaN(request.issueId)) {
                    await updateIssueStatus(request.issueId, 'completed', result.summary);
                }
            } else {
                // Handle unsuccessful result
                console.error(`❌ Failed to process ${request.id}: ${result.error}`);
                await updateRequestStatus(request.id, 'failed', result);
                
                if (request.issueId && !isNaN(request.issueId)) {
                    await updateIssueStatus(request.issueId, 'failed', result.error);
                }
            }
            
        } catch (error) {
            console.error(`❌ Error processing: ${error.message}`);
            
            // Ensure request is available for error handling
            if (request) {
                await updateRequestStatus(request.id, 'failed', { 
                    success: false, 
                    error: error.message 
                });
                
                if (request.issueId && !isNaN(request.issueId)) {
                    await updateIssueStatus(request.issueId, 'failed', error.message);
                }
            }
        }
    }
    
    console.log('👋 Worker finished');
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

async function loadQueue() {
    try {
        const data = await fs.readFile(QUEUE_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        return [];
    }
}

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

async function executeClaudeWithSpawn(promptFile, requestId) {
    return new Promise((resolve) => {
        console.log('  🚀 Spawning Claude process...');
        
        const claudeProcess = spawn(CLAUDE_PATH, ['--print'], {
            stdio: ['pipe', 'pipe', 'pipe']
        });
        
        let stdout = '';
        let stderr = '';
        let chunks = 0;
        
        // Feed the prompt file content to stdin
        fs.readFile(promptFile, 'utf-8').then(content => {
            console.log('  📤 Feeding prompt to Claude...');
            claudeProcess.stdin.write(content);
            claudeProcess.stdin.end();
        });
        
        // Collect stdout
        claudeProcess.stdout.on('data', (data) => {
            stdout += data.toString();
            chunks++;
            
            // Show progress every 10 chunks
            if (chunks % 10 === 0) {
                const kb = (stdout.length / 1024).toFixed(1);
                console.log(`  ⏳ Claude is generating... (${chunks} chunks, ${kb} KB so far)`);
            }
        });
        
        // Collect stderr
        claudeProcess.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        // Set timeout
        const timeout = setTimeout(() => {
            console.log('  ⏰ Timeout reached! Killing Claude process...');
            claudeProcess.kill();
            resolve({
                success: false,
                error: 'Claude CLI timed out after 6 minutes'
            });
        }, 6 * 60 * 1000);
        
        // Handle completion
        claudeProcess.on('close', (code) => {
            clearTimeout(timeout);
            console.log(`  🏁 Claude process closed with code: ${code}`);
            
            if (code === 0 && stdout) {
                const kb = (stdout.length / 1024).toFixed(1);
                console.log(`  ✅ Claude completed successfully (${kb} KB output)`);
                resolve({
                    success: true,
                    stdout: stdout
                });
            } else {
                console.log(`  ❌ Claude failed with stderr: ${stderr}`);
                resolve({
                    success: false,
                    error: `Claude CLI exited with code ${code}: ${stderr}`
                });
            }
        });
    });
}

async function addIssueComment(issueId, comment) {
    try {
        console.log(`  💬 Adding comment to issue #${issueId}...`);
        
        // Get current issue
        const { data: issue, error: fetchError } = await supabase
            .from('webtoys_issue_tracker_data')
            .select('*')
            .eq('id', issueId)
            .single();
        
        if (fetchError || !issue) {
            console.log(`  ⚠️  Could not find issue #${issueId}`);
            return false;
        }
        
        // Add comment to the issue's data
        const updatedData = {
            ...issue.content_data,
            comments: [
                ...(issue.content_data.comments || []),
                {
                    id: Date.now(),
                    author: 'Edit Agent',
                    text: comment,
                    timestamp: new Date().toISOString(),
                    isAgent: true
                }
            ]
        };
        
        // Update issue with new comment
        const { error: updateError } = await supabase
            .from('webtoys_issue_tracker_data')
            .update({
                content_data: updatedData,
                updated_at: new Date().toISOString()
            })
            .eq('id', issueId);
        
        if (updateError) {
            console.log(`  ⚠️  Failed to add comment: ${updateError.message}`);
            return false;
        }
        
        console.log(`  ✅ Comment added to issue #${issueId}`);
        return true;
    } catch (error) {
        console.log(`  ⚠️  Error adding comment: ${error.message}`);
        return false;
    }
}

async function updateIssueStatus(issueId, status, message) {
    try {
        console.log(`  🔄 Updating issue #${issueId} status to ${status}...`);
        
        const { data: issue, error: fetchError } = await supabase
            .from('webtoys_issue_tracker_data')
            .select('*')
            .eq('id', issueId)
            .single();
        
        if (fetchError || !issue) {
            console.log(`  ⚠️  Could not find issue #${issueId}`);
            return;
        }
        
        const updatedData = {
            ...issue.content_data,
            status: status,
            processingLog: [
                ...(issue.content_data.processingLog || []),
                {
                    timestamp: new Date().toISOString(),
                    status: status,
                    message: message,
                    processor: 'edit-agent-cli-v2'
                }
            ]
        };
        
        const { error: updateError } = await supabase
            .from('webtoys_issue_tracker_data')
            .update({
                content_data: updatedData,
                status: status,
                updated_at: new Date().toISOString()
            })
            .eq('id', issueId);
        
        if (updateError) {
            console.log(`  ⚠️  Failed to update issue status: ${updateError.message}`);
        } else {
            console.log(`  ✅ Updated issue #${issueId} status to ${status}`);
        }
    } catch (error) {
        console.log(`  ⚠️  Error updating issue status: ${error.message}`);
    }
}

// ============================================================================
// ENTRY POINT
// ============================================================================

// Start processing
processQueue().catch(console.error);