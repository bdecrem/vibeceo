#!/usr/bin/env node

/**
 * WebtoysOS Edit Agent CLI - Worker v3
 * SIMPLIFIED: Let Claude do everything
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { spawn } from 'child_process';
import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../../.env.local') });
dotenv.config({ path: path.join(__dirname, '../../../.env.local') });

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

// Find Claude CLI - USE THE PATH THAT WORKS IN webtoys-edit-agent
const CLAUDE_PATHS = [
    '/opt/homebrew/bin/claude',  // This is what the WORKING agent uses
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
// MAIN PROCESSING - Two-phase approach for better context
// ============================================================================

async function processRequest(request) {
    console.log(`📝 Processing ${request.id}...`);
    
    // Get list of existing apps for context
    const { data: configData } = await supabase
        .from('wtaf_desktop_config')
        .select('app_registry')
        .eq('desktop_version', 'webtoys-os-v3')
        .is('user_id', null)
        .single();
    
    const appRegistry = configData?.app_registry || [];
    
    // ========================================================================
    // PHASE 1: CLASSIFICATION
    // Ask Claude to classify the request and identify what's needed
    // ========================================================================
    
    const classificationPrompt = `You are the WebtoysOS Edit Agent. Classify this user request.

Request:
- Title: ${request.title || 'No title'}  
- Description: ${request.description || 'No description'}
- Author: ${request.author || 'unknown'}

Available desktop apps:
${appRegistry.map(app => `- ${app.id} (${app.name})`).join('\n')}

Determine which category this request falls into:

1. CREATE_APP - User wants to create a NEW app
   Examples: "make a calculator", "create a game", "build a text editor"

2. EDIT_APP - User wants to modify an EXISTING app
   Examples: "add toolbar to Wednesday", "fix the calculator", "change colors"

3. CLARIFY - Request is unclear or ambiguous

4. ADMIN_REVIEW - Request needs admin attention

RESPOND WITH EXACTLY ONE OF THESE FORMATS:

For creating a new app:
<!-- ACTION: CREATE_APP -->
<!-- APP_NAME: [name] -->
<!-- APP_ICON: [emoji] -->

For editing an existing app:
<!-- ACTION: EDIT_APP -->
<!-- TARGET_APP: [app-id from list above] -->

For unclear requests:
<!-- ACTION: CLARIFY -->
<!-- MESSAGE: [what needs clarification] -->

For admin review:
<!-- ACTION: ADMIN_REVIEW -->
<!-- MESSAGE: [why admin review needed] -->`;

    console.log('  🤖 Phase 1: Asking Claude to classify request...');
    const tempDir = os.tmpdir();
    const classifyFile = path.join(tempDir, `classify-${request.id}.md`);
    await fs.writeFile(classifyFile, classificationPrompt, 'utf-8');
    
    const classifyResult = await executeClaudeWithSpawn(classifyFile, request.id);
    await fs.unlink(classifyFile).catch(() => {});
    
    if (!classifyResult.success) {
        throw new Error(`Claude CLI failed in classification: ${classifyResult.error}`);
    }
    
    // Parse classification
    const classification = classifyResult.stdout;
    const actionMatch = classification.match(/<!-- ACTION:\s*(.+?)\s*-->/);
    const action = actionMatch ? actionMatch[1].trim() : 'UNKNOWN';
    
    // Debug logging if classification failed
    if (action === 'UNKNOWN') {
        console.log('  ⚠️ Claude returned unexpected format. Response:');
        console.log('  ---START RESPONSE---');
        console.log(classification.substring(0, 500)); // First 500 chars for debugging
        console.log('  ---END RESPONSE---');
        
        // Try to make sense of it - maybe Claude said CREATE or EDIT without the tags
        if (classification.toLowerCase().includes('create') && 
            classification.toLowerCase().includes('app')) {
            console.log('  🔄 Detected CREATE_APP intent, retrying with clearer prompt...');
            // Fall through to CREATE_APP case
            return await executePhase2('CREATE_APP', '<!-- ACTION: CREATE_APP -->', request, tempDir);
        } else if (classification.toLowerCase().includes('edit') && 
                   classification.toLowerCase().includes('app')) {
            console.log('  🔄 Detected EDIT_APP intent, but missing target. Asking for clarification...');
            return handleClarification(
                '<!-- ACTION: CLARIFY -->\n<!-- MESSAGE: Which app would you like me to edit? -->', 
                request.issueId
            );
        }
    }
    
    console.log(`  📊 Claude classified as: ${action}`);
    
    // ========================================================================
    // PHASE 2: EXECUTE BASED ON CLASSIFICATION
    // ========================================================================
    
    return await executePhase2(action, classification, request, tempDir);
}

// ============================================================================  
// PHASE 2 EXECUTION - Handle each action type with appropriate context
// ============================================================================

async function executePhase2(action, classification, request, tempDir) {
    switch (action) {
        case 'CREATE_APP':
            // Give Claude a template to modify instead of creating from scratch
            const appNameMatch = classification.match(/<!-- APP_NAME:\s*(.+?)\s*-->/);
            const appName = appNameMatch ? appNameMatch[1] : 'New App';
            const appId = appName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
            
            const baseTemplate = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${appName}</title>
    <style>
        body {
            background: #c0c0c0;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
        }
        .container {
            background: white;
            border: 2px solid #333;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 4px 4px 10px rgba(0,0,0,0.3);
            max-width: 500px;
            width: 100%;
        }
        h1 {
            margin-top: 0;
            color: #333;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>${appName}</h1>
        <div id="app">
            <!-- App content will go here -->
        </div>
    </div>

    <script>
        // WebtoysOS Integration
        window.APP_ID = '${appId}';
        let currentUser = null;

        // Listen for auth from desktop
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'TOYBOX_AUTH') {
                currentUser = event.data.user;
                updateUI();
            }
        });

        // ZAD API helpers
        async function save(dataType, data) {
            const participantId = currentUser ? 
                \`\${currentUser.handle.toUpperCase()}_\${currentUser.pin}\` : 
                'anonymous';
            
            const response = await fetch('/api/zad/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    app_id: window.APP_ID,
                    participant_id: participantId,
                    action_type: dataType,
                    content_data: data
                })
            });
            return response.ok;
        }

        async function load(dataType) {
            const url = \`/api/zad/load?app_id=\${window.APP_ID}&action_type=\${dataType}\`;
            const response = await fetch(url);
            return await response.json() || [];
        }

        function updateUI() {
            // Update UI based on login state
            if (currentUser) {
                console.log('User logged in:', currentUser.handle);
            }
        }

        // App initialization
        function init() {
            // App starts here
        }

        init();
    </script>
</body>
</html>`;

            const createPrompt = `Transform this WebtoysOS template into: ${request.description}

Current template:
${baseTemplate}

Modify this template to create the requested app. Keep all WebtoysOS integration (auth, ZAD helpers) intact.
Add the specific functionality for: ${request.description}
Make it fun and engaging.

Return the complete modified HTML.`;
            
            console.log('  🤖 Phase 2: Generating new app HTML...');
            const createFile = path.join(tempDir, `create-${request.id}.md`);
            await fs.writeFile(createFile, createPrompt, 'utf-8');
            
            const createResult = await executeClaudeWithSpawn(createFile, request.id);
            await fs.unlink(createFile).catch(() => {});
            
            if (!createResult.success) {
                throw new Error(`Claude CLI failed creating app: ${createResult.error}`);
            }
            
            // Combine classification metadata with generated HTML
            const fullResponse = classification + '\n' + createResult.stdout;
            return handleCreateApp(fullResponse, request);
            
        case 'EDIT_APP':
            // Extract target app from classification
            const targetMatch = classification.match(/<!-- TARGET_APP:\s*(.+?)\s*-->/);
            if (!targetMatch) {
                throw new Error('Claude identified EDIT_APP but no target specified');
            }
            
            const targetApp = targetMatch[1].trim();
            const fullSlug = targetApp.startsWith('toybox-') ? targetApp : `toybox-${targetApp}`;
            
            console.log(`  📚 Fetching current HTML for ${fullSlug}...`);
            
            // FETCH THE CURRENT HTML - THIS IS THE KEY IMPROVEMENT!
            const { data: appData, error: fetchError } = await supabase
                .from('wtaf_content')
                .select('html_content')
                .eq('user_slug', 'public')
                .eq('app_slug', fullSlug)
                .single();
            
            if (fetchError || !appData) {
                throw new Error(`Failed to fetch app ${fullSlug}: ${fetchError?.message || 'Not found'}`);
            }
            
            // Now ask Claude to edit it with full context
            const editPrompt = `You have the current HTML for the ${targetApp} app.
            
User request: "${request.description}"

Current HTML:
${appData.html_content}

Modify this HTML according to the user's request. Return the COMPLETE modified HTML.
Start with <!DOCTYPE html> and include ALL content.`;
            
            console.log('  🤖 Phase 2: Editing app with full context...');
            const editFile = path.join(tempDir, `edit-${request.id}.md`);
            await fs.writeFile(editFile, editPrompt, 'utf-8');
            
            const editResult = await executeClaudeWithSpawn(editFile, request.id);
            await fs.unlink(editFile).catch(() => {});
            
            if (!editResult.success) {
                throw new Error(`Claude CLI failed editing app: ${editResult.error}`);
            }
            
            // Combine classification with edited HTML for handleEditApp
            const editResponse = `<!-- ACTION: EDIT_APP -->\n<!-- TARGET_APP: ${targetApp} -->\n${editResult.stdout}`;
            return handleEditApp(editResponse);
            
        case 'CLARIFY':
            return handleClarification(classification, request.issueId);
            
        case 'ADMIN_REVIEW':
            return handleAdminReview(classification, request.issueId);
            
        default:
            throw new Error(`Unknown action from Claude: ${action}`);
    }
}

// ============================================================================
// HANDLERS for Claude's decisions
// ============================================================================

async function handleCreateApp(response, request) {
    // Extract metadata
    const nameMatch = response.match(/<!-- APP_NAME:\s*(.+?)\s*-->/);
    const iconMatch = response.match(/<!-- APP_ICON:\s*(.+?)\s*-->/);
    const htmlMatch = response.match(/<!DOCTYPE html>[\s\S]*/);
    
    if (!htmlMatch) {
        throw new Error('Claude did not provide valid HTML');
    }
    
    const appName = nameMatch ? nameMatch[1].trim() : 'New App';
    const appIcon = iconMatch ? iconMatch[1].trim() : '📱';
    const appHtml = htmlMatch[0];
    
    // Generate slug
    const baseSlug = `toybox-${appName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
    let finalSlug = baseSlug;
    let counter = 2;
    
    // Check for existing apps
    while (true) {
        const { data: existing } = await supabase
            .from('wtaf_content')
            .select('app_slug')
            .eq('user_slug', 'public')
            .eq('app_slug', finalSlug)
            .single();
        
        if (!existing) break;
        
        finalSlug = `${baseSlug}-${counter}`;
        counter++;
    }
    
    console.log(`  ✅ Creating ${appName} (${finalSlug})`);
    
    // Deploy to Supabase
    const timestamp = new Date().toISOString();
    const { error: deployError } = await supabase
        .from('wtaf_content')
        .insert({
            user_slug: 'public',
            app_slug: finalSlug,
            html_content: appHtml,
            created_at: timestamp,
            updated_at: timestamp,
            original_prompt: `${appName} - Created by Edit Agent from issue: ${request.description || 'No description'}`
        });
    
    if (deployError) {
        throw new Error(`Failed to deploy: ${deployError.message}`);
    }
    
    // Register in desktop
    const { data: configData } = await supabase
        .from('wtaf_desktop_config')
        .select('app_registry')
        .eq('desktop_version', 'webtoys-os-v3')
        .is('user_id', null)
        .single();
    
    let appRegistry = configData?.app_registry || [];
    const appId = finalSlug.replace('toybox-', '');
    
    appRegistry.push({
        id: appId,
        name: appName,
        url: `/public/${finalSlug}`,
        icon: appIcon,
        width: 800,
        height: 600,
        resizable: true
    });
    
    await supabase
        .from('wtaf_desktop_config')
        .update({ app_registry: appRegistry })
        .eq('desktop_version', 'webtoys-os-v3')
        .is('user_id', null);
    
    // Save backup
    const backupDir = path.join(__dirname, 'backups');
    await fs.mkdir(backupDir, { recursive: true });
    const backupFile = path.join(backupDir, `${finalSlug}_${timestamp.replace(/[:.]/g, '-')}_created.html`);
    await fs.writeFile(backupFile, appHtml, 'utf-8');
    
    return {
        success: true,
        summary: `Created ${appName} app`,
        appUrl: `https://webtoys.ai/public/${finalSlug}`
    };
}

async function handleEditApp(response) {
    // Extract target and HTML
    const targetMatch = response.match(/<!-- TARGET_APP:\s*(.+?)\s*-->/);
    const htmlMatch = response.match(/<!DOCTYPE html>[\s\S]*/);
    
    if (!targetMatch || !htmlMatch) {
        throw new Error('Claude did not provide target app or HTML');
    }
    
    const targetApp = targetMatch[1].trim();
    const editedHtml = htmlMatch[0];
    const fullSlug = targetApp.startsWith('toybox-') ? targetApp : `toybox-${targetApp}`;
    
    console.log(`  ✅ Updating ${fullSlug}`);
    
    // Update in Supabase
    const timestamp = new Date().toISOString();
    const { error } = await supabase
        .from('wtaf_content')
        .update({
            html_content: editedHtml,
            updated_at: timestamp
        })
        .eq('user_slug', 'public')
        .eq('app_slug', fullSlug);
    
    if (error) {
        throw new Error(`Failed to update: ${error.message}`);
    }
    
    // Save backup
    const backupDir = path.join(__dirname, 'backups');
    await fs.mkdir(backupDir, { recursive: true });
    const backupFile = path.join(backupDir, `${fullSlug}_${timestamp.replace(/[:.]/g, '-')}_edited.html`);
    await fs.writeFile(backupFile, editedHtml, 'utf-8');
    
    return {
        success: true,
        summary: `Edited ${targetApp}`,
        appUrl: `https://webtoys.ai/public/${fullSlug}`
    };
}

async function handleClarification(response, issueId) {
    const messageMatch = response.match(/<!-- MESSAGE:\s*(.+?)\s*-->/);
    const message = messageMatch ? messageMatch[1].trim() : 'Please clarify your request';
    
    await addIssueComment(issueId, `🤖 Edit Agent needs clarification:\n\n${message}`);
    
    return {
        success: false,
        needsClarification: true,
        error: `Clarification needed: ${message}`
    };
}

async function handleAdminReview(response, issueId) {
    const messageMatch = response.match(/<!-- MESSAGE:\s*(.+?)\s*-->/);
    const message = messageMatch ? messageMatch[1].trim() : 'This request needs admin review';
    
    await addIssueComment(issueId, `🤖 Edit Agent needs admin review:\n\n${message}\n\n@bart - Please provide guidance.`);
    
    return {
        success: false,
        needsAdmin: true,
        error: `Admin review needed: ${message}`
    };
}

// ============================================================================
// HELPER FUNCTIONS
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
            
            await updateRequestStatus(request.id, 'processing');
            
            try {
                const result = await processRequest(request);
                
                if (result.success) {
                    console.log(`✅ Successfully processed ${request.id}`);
                    await updateRequestStatus(request.id, 'completed', result);
                    
                    if (request.issueId && !isNaN(request.issueId)) {
                        await updateIssueStatus(request.issueId, 'completed', result.summary, result);
                    }
                } else if (result.needsClarification) {
                    console.log(`🤔 Needs clarification: ${request.id}`);
                    await updateRequestStatus(request.id, 'needs_clarification', result);
                    
                    if (request.issueId && !isNaN(request.issueId)) {
                        await updateIssueStatus(request.issueId, 'needs_clarification', result.error);
                    }
                } else if (result.needsAdmin) {
                    console.log(`👨‍💼 Needs admin review: ${request.id}`);
                    await updateRequestStatus(request.id, 'needs_admin', result);
                    
                    if (request.issueId && !isNaN(request.issueId)) {
                        await updateIssueStatus(request.issueId, 'needs_admin', result.error);
                    }
                } else {
                    await updateRequestStatus(request.id, 'failed', result);
                    
                    if (request.issueId && !isNaN(request.issueId)) {
                        await updateIssueStatus(request.issueId, 'failed', result.error);
                    }
                }
            } catch (error) {
                console.error(`❌ Error: ${error.message}`);
                await updateRequestStatus(request.id, 'failed', { 
                    success: false, 
                    error: error.message 
                });
                
                if (request.issueId && !isNaN(request.issueId)) {
                    await updateIssueStatus(request.issueId, 'failed', error.message);
                }
            }
            
        } catch (error) {
            console.error('❌ Queue error:', error);
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
    
    console.log('👋 Worker finished');
}

async function loadQueue() {
    try {
        const data = await fs.readFile(QUEUE_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
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
    console.log('  🚀 Calling Claude CLI...');
    
    try {
        // Use execAsync EXACTLY like the working webtoys-edit-agent
        const { stdout, stderr } = await execAsync(
            `cat "${promptFile}" | ${CLAUDE_PATH} --print`,
            {
                maxBuffer: 1024 * 1024 * 50, // 50MB buffer like working agent
                timeout: 300000, // 5 minutes for CREATE_APP (edit-agent uses 10 min)
                shell: '/bin/bash'
            }
        );
        
        if (stdout) {
            console.log(`  ✅ Claude returned ${Math.round(stdout.length/1000)}KB of output`);
            return {
                success: true,
                stdout: stdout
            };
        } else {
            return {
                success: false,
                error: 'Claude returned no output'
            };
        }
    } catch (error) {
        // Handle timeout or other errors
        if (error.killed || error.signal === 'SIGTERM') {
            console.error('  ⏱️ Claude CLI timed out after 5 minutes');
            return {
                success: false,
                error: 'Claude CLI timed out after 5 minutes'
            };
        } else {
            console.error(`  ❌ Claude CLI error: ${error.message}`);
            return {
                success: false,
                error: `Claude CLI failed: ${error.message}`
            };
        }
    }
}

async function addIssueComment(issueId, comment) {
    try {
        const { data: issue } = await supabase
            .from('webtoys_issue_tracker_data')
            .select('*')
            .eq('id', issueId)
            .single();
        
        if (!issue) return false;
        
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
        
        await supabase
            .from('webtoys_issue_tracker_data')
            .update({
                content_data: updatedData,
                updated_at: new Date().toISOString()
            })
            .eq('id', issueId);
        
        console.log(`  💬 Comment added to issue #${issueId}`);
        return true;
    } catch (error) {
        console.log(`  ⚠️  Error adding comment: ${error.message}`);
        return false;
    }
}

async function updateIssueStatus(issueId, status, message, details = null) {
    try {
        // Fetch current issue
        const { data: issue } = await supabase
            .from('webtoys_issue_tracker_data')
            .select('*')
            .eq('id', issueId)
            .single();
        
        if (!issue) return false;
        
        // Map our internal status to Issue Tracker status
        let issueStatus;
        let commentText;
        
        switch (status) {
            case 'completed':
                issueStatus = 'closed';
                commentText = `✅ **Issue completed by Edit Agent**\n\n${message}`;
                if (details?.appUrl) {
                    commentText += `\n\n🔗 **App URL**: ${details.appUrl}`;
                }
                break;
                
            case 'failed':
                issueStatus = 'closed';
                commentText = `❌ **Issue could not be completed**\n\n${message}\n\nThis issue has been closed. Please create a new issue with more details if needed.`;
                break;
                
            case 'needs_clarification':
                // KEEP OPEN but mark as waiting for user input
                issueStatus = 'waiting_for_user';
                commentText = `🤔 **Clarification needed**\n\n${message}\n\nPlease add a comment with more details. The issue will remain open.`;
                break;
                
            case 'needs_admin':
                // KEEP OPEN but mark as needing admin
                issueStatus = 'needs_admin';  
                commentText = `👨‍💼 **Admin review required**\n\n${message}\n\n@bart - Please review this request.`;
                break;
                
            default:
                issueStatus = status;
                commentText = message;
        }
        
        // Update issue with new status and add comment
        const updatedData = {
            ...issue.content_data,
            status: issueStatus,
            lastAgentAction: new Date().toISOString(),
            comments: [
                ...(issue.content_data.comments || []),
                {
                    id: Date.now(),
                    author: 'Edit Agent',
                    text: commentText,
                    timestamp: new Date().toISOString(),
                    isAgent: true,
                    statusChange: issueStatus
                }
            ]
        };
        
        await supabase
            .from('webtoys_issue_tracker_data')
            .update({
                content_data: updatedData,
                updated_at: new Date().toISOString()
            })
            .eq('id', issueId);
        
        console.log(`  ✅ Issue #${issueId} → ${issueStatus}: ${message}`);
        return true;
    } catch (error) {
        console.error(`  ❌ Failed to update issue #${issueId}: ${error.message}`);
        return false;
    }
}

// Start processing
processQueue().catch(console.error);