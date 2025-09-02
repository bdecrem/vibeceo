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
import { createReadStream } from 'fs';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables - try multiple locations
dotenv.config({ path: path.join(__dirname, '../../../../.env.local') });
dotenv.config({ path: path.join(__dirname, '../../../.env.local') });
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Verify required environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing required environment variables!');
    console.error('   Please ensure SUPABASE_URL and SUPABASE_SERVICE_KEY are set');
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
                
                // Update issue tracker if this came from there (only for numeric IDs)
                if (request.issueId && !isNaN(request.issueId)) {
                    await updateIssueStatus(request.issueId, 'completed', result.summary);
                }
            } else {
                console.error(`❌ Failed to process ${request.id}: ${result.error}`);
                await updateRequestStatus(request.id, 'failed', result);
                
                if (request.issueId && !isNaN(request.issueId)) {
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
 * Detect if this is an app creation request vs an edit request
 */
function isAppCreationRequest(description, appSlug) {
    // If targeting the desktop and asking to create/make/add an app
    if (appSlug === 'toybox-os-v3-test') {
        const createPatterns = [
            /\b(create|make|build|add|develop)\s+.*\s+(app|application|game|tool|editor|calculator|processor)/i,
            /\b(add|create|make)\s+(a|an)\s+\w+\s+(to|on|for)\s+(the\s+)?desktop/i,
            /\b(add|make|create)\s+(a|an)\s+\w+\s+(app|game|tool|processor|editor)/i,
            /\b(sudoku|chess|calculator|notepad|editor|paint|word processor)\s+(app|game|tool)?/i,
            /\badd\s+(a|an)\s+(simple|basic|new)?\s*\w+/i  // Catch "add a simple X"
        ];
        
        return createPatterns.some(pattern => pattern.test(description));
    }
    return false;
}

/**
 * Extract app info from creation request
 */
function extractAppInfo(description) {
    // Common app names that might be mentioned
    const knownApps = {
        'sudoku': { name: 'Sudoku', icon: '🔢', type: 'game' },
        'chess': { name: 'Chess', icon: '♟️', type: 'game' },
        'calculator': { name: 'Calculator', icon: '🧮', type: 'tool' },
        'notepad': { name: 'Notepad', icon: '📝', type: 'tool' },
        'text editor': { name: 'Text Editor', icon: '📝', type: 'tool' },
        'paint': { name: 'Paint', icon: '🎨', type: 'tool' },
        'b3rt': { name: 'B3rt', icon: '📝', type: 'editor' },
        'bert': { name: 'Bert', icon: '📝', type: 'editor' }
    };
    
    const lowerDesc = description.toLowerCase();
    
    // Check for known apps
    for (const [key, info] of Object.entries(knownApps)) {
        if (lowerDesc.includes(key)) {
            return {
                name: info.name,
                icon: info.icon,
                type: info.type,
                slug: `toybox-${info.name.toLowerCase().replace(/\s+/g, '-')}`
            };
        }
    }
    
    // Try to extract custom app name
    const patterns = [
        /[Cc]all\s+it\s+(\w+)/i,  // "Call it BREAT"
        /(?:called|named)\s+(\w+)/i,
        /(?:create|make|build|add)\s+(?:a|an)?\s*(?:simple|basic)?\s*(\w+)/i,
        /(\w+)\s+(?:app|application|game|tool)/i
    ];
    
    for (const pattern of patterns) {
        const match = description.match(pattern);
        if (match && match[1]) {
            const name = match[1];
            return {
                name: name.charAt(0).toUpperCase() + name.slice(1),
                icon: '📱',
                type: 'app',
                slug: `toybox-${name.toLowerCase()}`
            };
        }
    }
    
    // Fallback
    return {
        name: 'New App',
        icon: '📱',
        type: 'app',
        slug: 'toybox-new-app'
    };
}

/**
 * Process app creation request (like Claude Code would!)
 */
async function processAppCreation(request) {
    console.log('  🎨 Detected app creation request (Claude Code mode!)');
    
    const appInfo = extractAppInfo(request.description);
    
    // Make sure we create a UNIQUE app each time
    let finalSlug = appInfo.slug;
    let counter = 1;
    
    // Keep checking until we find an unused slug
    while (true) {
        const { data: existing } = await supabase
            .from('wtaf_content')
            .select('id')
            .eq('user_slug', 'public')
            .eq('app_slug', finalSlug)
            .single();
        
        if (!existing) {
            break; // This slug is available!
        }
        
        // Try next number
        counter++;
        finalSlug = `${appInfo.slug}-${counter}`;
        console.log(`  ⚠️  ${appInfo.slug} exists, trying ${finalSlug}...`);
    }
    
    appInfo.slug = finalSlug;
    console.log(`  📱 Creating NEW app: ${appInfo.name} (${appInfo.slug})`);
    
    // Build a focused prompt for creating just the app
    const prompt = buildAppCreationPrompt(appInfo, request.description);
    
    // Save prompt to temp file
    const tempDir = os.tmpdir();
    const promptFile = path.join(tempDir, `create-app-${request.id}.md`);
    await fs.writeFile(promptFile, prompt, 'utf-8');
    
    console.log('  🤖 Calling Claude CLI to generate app...');
    console.log(`  📝 Prompt size: ${(prompt.length / 1024).toFixed(1)} KB (much smaller!)`);
    
    // Execute Claude CLI
    const result = await executeClaudeWithSpawn(promptFile, request.id);
    
    // Clean up temp file
    await fs.unlink(promptFile).catch(() => {});
    
    if (!result.success) {
        throw new Error(`Claude CLI failed: ${result.error}`);
    }
    
    // Extract HTML from Claude's response
    const appHtml = extractHtmlFromResponse(result.stdout);
    
    if (!appHtml || !validateHtml(appHtml)) {
        throw new Error('Failed to generate valid app HTML');
    }
    
    console.log(`  ✅ Generated ${appInfo.name} app (${appHtml.length} bytes)`);
    
    // Step 1: Deploy the NEW app to Supabase (like Claude Code's Write tool)
    console.log('  📤 Deploying NEW app to Supabase...');
    
    const timestamp = new Date().toISOString();
    
    // Always INSERT a new app (slug is already unique from above)
    const { error: deployError } = await supabase
        .from('wtaf_content')
        .insert({
            user_slug: 'public',
            app_slug: appInfo.slug,
            html_content: appHtml,
            created_at: timestamp,
            updated_at: timestamp,
            original_prompt: `${appInfo.name} - Created by Edit Agent: ${request.description}`
        });
    
    if (deployError) {
        throw new Error(`Failed to deploy app: ${deployError.message}`);
    }
    
    // Step 2: Register in desktop config (like Claude Code running a script)
    console.log('  📋 Registering app in desktop...');
    
    // Get current desktop config
    const { data: configData, error: configError } = await supabase
        .from('wtaf_desktop_config')
        .select('*')
        .eq('desktop_version', 'webtoys-os-v3')
        .is('user_id', null)
        .single();
    
    if (configError) {
        throw new Error(`Failed to get desktop config: ${configError.message}`);
    }
    
    // Parse the app registry
    let appRegistry = configData.app_registry || [];
    const appId = appInfo.slug.replace('toybox-', '');
    
    // Add or update app entry
    const appEntry = {
        id: appId,
        name: appInfo.name,
        url: `/public/${appInfo.slug}`,
        icon: appInfo.icon,
        width: 800,
        height: 600,
        resizable: true
    };
    
    const existingIndex = appRegistry.findIndex(app => app.id === appId);
    if (existingIndex >= 0) {
        appRegistry[existingIndex] = appEntry;
        console.log('  ♻️  Updated existing app registration');
    } else {
        appRegistry.push(appEntry);
        console.log('  ✅ Added new app to registry');
    }
    
    // Update the desktop config
    const { error: updateError } = await supabase
        .from('wtaf_desktop_config')
        .update({
            app_registry: appRegistry,
            updated_at: timestamp
        })
        .eq('id', configData.id);
    
    if (updateError) {
        throw new Error(`Failed to update desktop config: ${updateError.message}`);
    }
    
    // Create a backup (like Claude Code would!)
    await createBackup(appInfo.slug, appHtml, 'created');
    
    console.log(`  🎉 Successfully created ${appInfo.name}!`);
    console.log(`  🔗 URL: https://webtoys.ai/public/${appInfo.slug}`);
    
    return {
        success: true,
        summary: `Created ${appInfo.name} app and added to desktop`,
        appUrl: `https://webtoys.ai/public/${appInfo.slug}`,
        changes: `New app created: ${appInfo.name} with icon ${appInfo.icon}`
    };
}

/**
 * Build app creation prompt (focused, specific)
 */
function buildAppCreationPrompt(appInfo, description) {
    const templates = {
        game: `Create a fun, playable ${appInfo.name} game`,
        tool: `Create a functional ${appInfo.name} tool`,
        editor: `Create a text editor called ${appInfo.name}`,
        app: `Create a ${appInfo.name} application`
    };
    
    return `You are creating a new WebtoysOS application.

Request: "${description}"

Create a complete, self-contained HTML application for: ${templates[appInfo.type] || templates.app}

Requirements:
1. Single HTML file with all code inline
2. Clean, modern design
3. Works in an iframe (windowed environment)
4. Responsive and mobile-friendly
5. Include these WebtoysOS integrations:

\`\`\`javascript
// Required at the top of script section
window.APP_ID = '${appInfo.slug.replace('toybox-', '')}';
let currentUser = null;

// Listen for authentication
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'TOYBOX_AUTH') {
        currentUser = event.data.user;
        // Update UI based on login
    }
});

// Data persistence helpers
async function save(dataType, data) {
    const participantId = currentUser ? 
        \`\${currentUser.handle.toUpperCase()}_\${currentUser.pin}\` : 'anonymous';
    
    return await fetch('/api/zad/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            app_id: window.APP_ID,
            participant_id: participantId,
            action_type: dataType,
            content_data: data
        })
    }).then(r => r.ok);
}

async function load(dataType) {
    const response = await fetch(\`/api/zad/load?app_id=\${window.APP_ID}&action_type=\${dataType}\`);
    return await response.json() || [];
}
\`\`\`

Return ONLY the complete HTML code, starting with <!DOCTYPE html> and ending with </html>.
No explanations or markdown blocks.`;
}

/**
 * Execute Claude CLI using spawn (improved approach from working agent)
 */
async function executeClaudeWithSpawn(promptFile, requestId) {
    console.log(`  🚀 Spawning Claude process...`);
    
    try {
        // Create a promise to handle the Claude process
        const runClaude = () => {
            return new Promise((resolve, reject) => {
                let stdout = '';
                let stderr = '';
                
                // Spawn Claude process
                console.log(`  ⚙️  Starting Claude with --print flag...`);
                const claude = spawn(CLAUDE_PATH, ['--print'], {
                    // Remove maxBuffer from spawn options - it's for exec not spawn
                });
                
                // Feed the prompt file content to Claude's stdin using fs module
                console.log(`  📤 Feeding prompt to Claude's stdin...`);
                
                // Use fs.createReadStream to pipe file to stdin
                const readStream = createReadStream(promptFile);
                readStream.on('error', (err) => {
                    console.error(`  ❌ Error reading prompt file: ${err.message}`);
                    claude.kill('SIGTERM');
                    reject(new Error(`Failed to read prompt file: ${err.message}`));
                });
                
                readStream.pipe(claude.stdin);
                
                let outputChunks = 0;
                let lastProgressTime = Date.now();
                
                // Collect output with progress tracking
                claude.stdout.on('data', (data) => {
                    stdout += data.toString();
                    outputChunks++;
                    
                    // Show progress every 3 seconds
                    if (Date.now() - lastProgressTime > 3000) {
                        console.log(`  ⏳ Claude is processing... (received ${outputChunks} chunks, ${(stdout.length / 1024).toFixed(1)} KB so far)`);
                        lastProgressTime = Date.now();
                    }
                });
                
                claude.stderr.on('data', (data) => {
                    const error = data.toString();
                    stderr += error;
                    // Only log non-warning stderr
                    if (!error.toLowerCase().includes('warning')) {
                        console.log(`  ⚠️  Claude stderr: ${error.substring(0, 200)}`);
                    }
                });
                
                // Handle completion
                claude.on('close', (code) => {
                    console.log(`  🏁 Claude process closed with code: ${code}`);
                    if (code !== 0) {
                        console.log(`  ❌ Claude failed with stderr: ${stderr.substring(0, 500)}`);
                        reject(new Error(`Claude CLI exited with code ${code}: ${stderr}`));
                    } else {
                        console.log(`  ✅ Claude completed successfully (${(stdout.length / 1024).toFixed(1)} KB output)`);
                        resolve({ stdout, stderr });
                    }
                });
                
                claude.on('error', (err) => {
                    console.log(`  💥 Claude process error: ${err.message}`);
                    reject(new Error(`Failed to start Claude CLI: ${err.message}`));
                });
                
                // Set timeout (6 minutes for very complex edits like WebtoysOS desktop)
                console.log(`  ⏱️  Setting 6-minute timeout for Claude...`);
                const timeout = setTimeout(() => {
                    console.log(`  ⏰ Timeout reached! Killing Claude process...`);
                    claude.kill('SIGTERM');
                    // Give it 2 seconds to die gracefully, then force kill
                    setTimeout(() => {
                        if (!claude.killed) {
                            console.log(`  🔥 Force killing Claude process...`);
                            claude.kill('SIGKILL');
                        }
                    }, 2000);
                    reject(new Error('Claude CLI timed out after 6 minutes'));
                }, 360000); // 6 minutes for complex desktop apps
                
                // Clear timeout if process completes
                claude.on('exit', () => {
                    clearTimeout(timeout);
                });
            });
        };
        
        const { stdout, stderr } = await runClaude();
        
        if (stderr && !stderr.toLowerCase().includes('warning')) {
            console.error('  ⚠️  Claude stderr:', stderr);
        }
        
        // Debug: Log first 500 chars of Claude's output
        console.log(`  📄 Claude output (first 500 chars): ${stdout.substring(0, 500)}`);
        console.log(`  📊 Total output length: ${stdout.length} characters`);
        
        return {
            success: true,
            stdout,
            stderr
        };
        
    } catch (error) {
        console.error(`  ❌ Error executing Claude:`, error.message);
        
        // If spawn fails, try fallback with execAsync (like working agent)
        if (error.message.includes('timed out')) {
            console.log('  🔄 Retrying with simpler exec approach...');
            try {
                const { stdout, stderr } = await execAsync(
                    `${CLAUDE_PATH} --print < "${promptFile}"`,
                    {
                        maxBuffer: 1024 * 1024 * 50, // 50MB
                        timeout: 360000, // 6 minutes
                        shell: '/bin/bash'
                    }
                );
                
                console.log(`  📄 Retry output (first 500 chars): ${stdout.substring(0, 500)}`);
                return {
                    success: true,
                    stdout,
                    stderr
                };
            } catch (retryError) {
                console.error(`  ❌ Retry also failed:`, retryError.message);
                return {
                    success: false,
                    error: retryError.message
                };
            }
        }
        
        return {
            success: false,
            error: error.message
        };
    }
}

/**
 * Process an edit request using Claude CLI
 */
async function processEdit(request) {
    try {
        // INTELLIGENT DETECTION: Is this app creation vs editing?
        if (isAppCreationRequest(request.description, request.appSlug)) {
            return await processAppCreation(request);
        }
        
        // Regular edit flow - load the current app HTML
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
        const promptFile = path.join(tempDir, `edit-issue-${request.id}.md`);
        await fs.writeFile(promptFile, prompt, 'utf-8');
        
        console.log('  🤖 Calling Claude CLI...');
        console.log(`  📍 Using Claude at: ${CLAUDE_PATH}`);
        console.log(`  📝 Prompt size: ${(prompt.length / 1024).toFixed(1)} KB`);
        
        // Execute Claude CLI using spawn (like the working agent)
        const result = await executeClaudeWithSpawn(promptFile, request.id);
        
        // Clean up temp file
        await fs.unlink(promptFile).catch(() => {});
        
        if (!result.success) {
            throw new Error(`Claude CLI failed: ${result.error}`);
        }
        
        // Extract HTML from Claude's response
        const editedHtml = extractHtmlFromResponse(result.stdout);
        
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
            changes: result.stdout.substring(0, 500)
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
 * Extract HTML from Claude's response (improved from working agent)
 */
function extractHtmlFromResponse(response) {
    // Claude returns raw HTML when using --print (not JSON)
    let html = response.trim();
    
    // Debug: Log first 500 chars of Claude's output for troubleshooting
    console.log(`  📄 Raw Claude output (first 500 chars): ${html.substring(0, 500)}`);
    console.log(`  📊 Total output length: ${html.length} characters`);
    
    // Remove any markdown code blocks if Claude added them
    html = html.replace(/^```html?\n?/gm, '');
    html = html.replace(/\n?```$/gm, '');
    
    // Make validation more flexible - check for any HTML tag (like working agent)
    if (html.includes('<!DOCTYPE') || html.includes('<html') || (html.includes('<') && html.includes('>'))) {
        console.log(`  ✅ Valid HTML detected`);
        return html;
    } else {
        console.log(`  ❌ No valid HTML detected in output`);
        // Log more details for debugging
        if (html.length < 100) {
            console.log(`  📝 Full output: ${html}`);
        }
        return null;
    }
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
        console.log(`  🔄 Updating issue #${issueId} status to ${status}...`);
        
        // Get current issue (don't use .single() to avoid errors)
        const { data: issues, error: fetchError } = await supabase
            .from('webtoys_issue_tracker_data')
            .select('content_data')
            .eq('id', issueId);
        
        if (fetchError) throw fetchError;
        
        if (!issues || issues.length === 0) {
            throw new Error(`Issue #${issueId} not found`);
        }
        
        if (issues.length > 1) {
            console.warn(`  ⚠️ Multiple issues found with ID ${issueId}, using first one`);
        }
        
        const issue = issues[0];
        
        // Update content data (status is inside content_data)
        const updatedData = {
            ...issue.content_data,
            status,
            processedAt: new Date().toISOString(),
            processingLog: message,
            processedBy: 'edit-agent-cli'
        };
        
        // Update issue (no status column, only content_data)
        const { error: updateError } = await supabase
            .from('webtoys_issue_tracker_data')
            .update({ 
                content_data: updatedData,
                updated_at: new Date().toISOString()
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