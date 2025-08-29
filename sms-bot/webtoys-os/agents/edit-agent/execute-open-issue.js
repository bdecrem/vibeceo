#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// Note: deployApp is no longer imported - Claude will handle deployment directly

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execAsync = promisify(exec);

// Load environment variables properly
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env.local') });

// Debug: Check if environment variables are loaded
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ Environment variables not loaded properly!');
    console.error('   SUPABASE_URL:', process.env.SUPABASE_URL ? 'Set' : 'Missing');
    console.error('   SUPABASE_SERVICE_KEY:', process.env.SUPABASE_SERVICE_KEY ? 'Set' : 'Missing');
    console.error('   Looking for .env.local at:', path.join(__dirname, '../.env.local'));
    process.exit(1);
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const ISSUE_TRACKER_APP_ID = process.env.ISSUE_TRACKER_APP_ID || 'toybox-issue-tracker-v3';

// Note: All app creation, deployment, and desktop integration is now handled by Claude Code
// The script just orchestrates and provides clear instructions to Claude Code

// Parse issue description to understand what to create or modify
function parseIssueDescription(description) {
    const lower = description.toLowerCase();
    
    // Check for modification/update requests FIRST (before creation requests)
    if (lower.includes('update') || lower.includes('fix') || lower.includes('add') || lower.includes('modify') || lower.includes('enhance')) {
        // Extract app name from various patterns
        const appNamePatterns = [
            /(?:update|fix|add|modify|enhance)\s+(.+?)\s+(?:so that|to|with|by)/i,
            /(?:update|fix|add|modify|enhance)\s+"([^"]+)"/i,
            /(?:update|fix|add|modify|enhance)\s+'([^']+)'/i,
            /(?:update|fix|add|modify|enhance)\s+(\w+)/i
        ];
        
        let appName = null;
        for (const pattern of appNamePatterns) {
            const match = description.match(pattern);
            if (match) {
                appName = match[1].trim();
                
                // Clean up app name - remove common words like "the", "app", etc.
                appName = appName
                    .replace(/^(the\s+)/i, '')  // Remove "the " at start
                    .replace(/(\s+app)$/i, '')  // Remove " app" at end
                    .replace(/(\s+application)$/i, '')  // Remove " application" at end
                    .trim();
                
                break;
            }
        }
        
        if (appName) {
            return { 
                type: 'modification', 
                name: appName, 
                targetApp: appName,
                description: description 
            };
        }
    }
    
    // Check for text editor creation
    if (lower.includes('text editor') || lower.includes('notepad') || lower.includes('writer') || lower.includes('word processor')) {
        const nameMatch = description.match(/called\s+(\w+)|named\s+(\w+)|"([^"]+)"|'([^']+)'|\b(\w+)\s*$/);
        const appName = nameMatch ? (nameMatch[1] || nameMatch[2] || nameMatch[3] || nameMatch[4] || nameMatch[5]) : 'TextEdit';
        return { type: 'text-editor', name: appName, description: description };
    }
    
    // Check for paint/drawing apps
    if (lower.includes('paint') || lower.includes('draw') || lower.includes('sketch') || lower.includes('canvas') || lower.includes('art')) {
        const nameMatch = description.match(/called\s+(\w+)|named\s+(\w+)|"([^"]+)"|'([^']+)'|\b(\w+)\s*$/);
        const appName = nameMatch ? (nameMatch[1] || nameMatch[2] || nameMatch[3] || nameMatch[4] || nameMatch[5]) : 'Paint';
        return { type: 'paint', name: appName, description: description };
    }
    
    // Check for calculator
    if (lower.includes('calculator') || lower.includes('calc') || lower.includes('math')) {
        const nameMatch = description.match(/called\s+(\w+)|named\s+(\w+)|"([^"]+)"|'([^']+)'|\b(\w+)\s*$/);
        const appName = nameMatch ? (nameMatch[1] || nameMatch[2] || nameMatch[3] || nameMatch[4] || nameMatch[5]) : 'Calculator';
        return { type: 'calculator', name: appName, description: description };
    }
    
    // Check for game
    if (lower.includes('game') || lower.includes('play') || lower.includes('puzzle') || lower.includes('arcade')) {
        const nameMatch = description.match(/called\s+(\w+)|named\s+(\w+)|"([^"]+)"|'([^']+)'|\b(\w+)\s*$/);
        const appName = nameMatch ? (nameMatch[1] || nameMatch[2] || nameMatch[3] || nameMatch[4] || nameMatch[5]) : 'Game';
        return { type: 'game', name: appName, description: description };
    }
    
    // Check for chat/messaging
    if (lower.includes('chat') || lower.includes('message') || lower.includes('talk') || lower.includes('conversation')) {
        const nameMatch = description.match(/called\s+(\w+)|named\s+(\w+)|"([^"]+)"|'([^']+)'|\b(\w+)\s*$/);
        const appName = nameMatch ? (nameMatch[1] || nameMatch[2] || nameMatch[3] || nameMatch[4] || nameMatch[5]) : 'Chat';
        return { type: 'chat', name: appName, description: description };
    }
    
    // Check for generic "app" or "tool" creation
    if (lower.includes('create') && (lower.includes('app') || lower.includes('tool') || lower.includes('widget'))) {
        const nameMatch = description.match(/called\s+(\w+)|named\s+(\w+)|"([^"]+)"|'([^']+)'|\b(\w+)\s*$/);
        const appName = nameMatch ? (nameMatch[1] || nameMatch[2] || nameMatch[3] || nameMatch[4] || nameMatch[5]) : 'NewApp';
        return { type: 'app', name: appName, description: description };
    }
    
    return {
        type: 'unknown',
        description: description
    };
}

async function executeOpenIssue() {
    // Safety check - allow disabling the edit agent
    if (fs.existsSync(path.join(__dirname, 'STOP-EDIT-AGENT.txt'))) {
        console.log('⛔ EDIT AGENT IS DISABLED (STOP-EDIT-AGENT.txt exists)');
        process.exit(0);
    }
    
    console.log('🔍 Looking for open issues...');
    
    // Fetch open issues
    const { data, error } = await supabase
        .from('webtoys_issue_tracker_data')
        .select('*')
        .eq('app_id', ISSUE_TRACKER_APP_ID)
        .in('action_type', ['update_request', 'issue'])
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    // Find the first open, pending, or processing issue that can be worked on
    const openIssue = data.find(issue => {
        const content = typeof issue.content_data === 'string' 
            ? JSON.parse(issue.content_data) 
            : issue.content_data;
        // Skip deleted issues
        if (content.deleted) return false;
        // Look for any status that represents an actionable issue
        return ['open', 'pending', 'new'].includes(content.status);
    });

    if (!openIssue) {
        console.log('📭 No open or pending issues found');
        return;
    }

    const content = typeof openIssue.content_data === 'string' 
        ? JSON.parse(openIssue.content_data) 
        : openIssue.content_data;

    // V3 compatibility: Map fields appropriately
    const issueNumber = openIssue.id;  // V3 uses database ID
    const description = content.description || content.title || '';
    const author = content.author || content.submittedBy || 'unknown';
    const priority = content.priority || 'normal';

    console.log(`\n✅ Found open issue #${issueNumber}:`);
    console.log(`   Description: ${description}`);
    console.log(`   Submitted by: ${author}`);
    console.log(`   Priority: ${priority}`);
    
    // Update status to processing
    content.status = 'processing';
    content.processedAt = new Date().toISOString();
    
    await supabase
        .from('webtoys_issue_tracker_data')
        .update({ content_data: content })
        .eq('id', openIssue.id);
    
    console.log('\n🤖 Executing issue with Claude...\n');
    
    // Create comprehensive prompt for Claude based on issue type
    const parsed = parseIssueDescription(description);  // Use the v3-compatible description
    
    // Simple, clear prompt that lets Claude Code use its full capabilities
    let claudePrompt = `${description}

IMPORTANT: After completing this request, you must:

1. **For NEW apps**: 
   - Create the app HTML file in the /apps directory with a descriptive filename (e.g., calculator.html, paint.html)
   - The app should be a standalone HTML file with all code included
   - Deploy it by running: node scripts/auto-deploy-app.js apps/[filename].html
   - This will automatically add it to the desktop and make it accessible

2. **For MODIFIED apps**:
   - Update the existing app file in the /apps directory
   - Deploy the changes by running: node scripts/auto-deploy-app.js apps/[filename].html
   - This ensures the desktop has the latest version

3. **General requirements**:
   - Create complete, standalone HTML files with all code included
   - Follow existing project patterns and conventions
   - Apps should integrate with the v3 desktop system
   - After creating the app, ALWAYS deploy it using the auto-deploy-app.js script
   - The deployment script handles all desktop integration automatically

DEPLOYMENT COMMAND:
After creating your app file, run:
node scripts/auto-deploy-app.js apps/[your-app-name].html

This command will:
- Deploy the app to Supabase
- Add it to the desktop app registry
- Create a desktop icon
- Make it accessible at the proper URL

The v3 desktop is at /core/desktop-v3.html and apps go in the /apps directory.`;
    
    console.log('📋 Sending enhanced prompt to Claude:', claudePrompt.substring(0, 200) + '...');
    
    try {
        // Execute with Claude using proper CLI syntax (following fix-issues.js working pattern)
        const claudePath = '/Users/bartdecrem/.local/bin/claude';
        
        console.log('🚀 Executing Claude...');
        
        // Use the v3 webtoys-os directory structure
        const PROJECT_ROOT = '/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/webtoys-os';  // Keep v3 directory
        
        // Write prompt to temp file to avoid shell escaping issues (same as fix-issues.js)
        const tempFile = path.join('/tmp', `execute-open-issue-${Date.now()}.txt`);
        await fs.promises.writeFile(tempFile, claudePrompt);
        
        // Use pipe to pass prompt (same pattern as working fix-issues.js)
        // Add --verbose flag for more output
        const command = `cd ${PROJECT_ROOT} && cat "${tempFile}" | ${claudePath} --print --verbose --dangerously-skip-permissions`;
        console.log('📋 Command:', command);
        console.log('⏳ This may take several minutes for complex tasks...');
        
        const startTime = Date.now();
        const { stdout, stderr } = await execAsync(command, {
            timeout: 300000, // 5 minute timeout - give Claude time to create apps
            maxBuffer: 1024 * 1024 * 50, // 50MB buffer (same as fix-issues.js)
            env: { ...process.env }
        });
        
        // Clean up temp file
        await fs.promises.unlink(tempFile).catch(() => {});
        
        const duration = Math.round((Date.now() - startTime) / 1000);
        console.log(`✅ Claude completed in ${duration} seconds`);
        
        // Capture the full Claude output
        let claudeOutput = '';
        if (stdout) {
            claudeOutput = stdout;
            console.log('Claude output (first 500 chars):', stdout.substring(0, 500));
            console.log('Total output length:', stdout.length, 'chars');
        }
        if (stderr) {
            console.error('Claude stderr:', stderr);
            claudeOutput += '\n\nSTDERR:\n' + stderr;
        }
        
        // Create the full console output comment
        const fullConsoleOutput = `## Edit Agent Execution Log

### Claude Code Output:

${claudeOutput || 'No output captured'}

### Execution Details:
- Duration: ${duration} seconds
- Issue ID: #${issueNumber}
- Completed at: ${new Date().toISOString()}`;
        
        // Add the full console output as a comment to the ticket
        const editAgentComment = {
            text: fullConsoleOutput,
            author: 'Edit Agent',
            authorRole: 'AGENT',
            timestamp: new Date().toISOString()
        };
        
        // Initialize admin_comments array if it doesn't exist
        if (!content.admin_comments) {
            content.admin_comments = [];
        }
        
        // Add the edit agent's comment
        content.admin_comments.push(editAgentComment);
        
        // Update issue status to completed
        content.status = 'completed';
        content.completedAt = new Date().toISOString();
        content.resolution = 'Executed by Claude Edit Agent';
        
        // Also store the full output in a dedicated field for easier access
        content.edit_agent_output = fullConsoleOutput;
        content.edit_agent_execution_time = `${duration} seconds`;
        content.claude_raw_output = claudeOutput;
        
        await supabase
            .from('webtoys_issue_tracker_data')
            .update({ content_data: content })
            .eq('id', openIssue.id);
        
        console.log('\n✅ Issue completed successfully!');
        
    } catch (error) {
        if (error.killed && error.signal === 'SIGKILL') {
            console.error('❌ Claude execution timed out after 5 minutes');
            console.error('   The task may have been too complex or Claude encountered an issue');
        } else {
            console.error('❌ Claude execution failed:', error);
        }
        
        // Add error as a comment
        const errorComment = {
            text: `❌ Execution failed: ${error.message}`,
            author: 'Edit Agent',
            authorRole: 'AGENT',
            timestamp: new Date().toISOString()
        };
        
        // Initialize admin_comments array if it doesn't exist
        if (!content.admin_comments) {
            content.admin_comments = [];
        }
        
        // Add the error comment
        content.admin_comments.push(errorComment);
        
        content.status = 'failed';
        content.error = error.message;
        
        await supabase
            .from('webtoys_issue_tracker_data')
            .update({ content_data: content })
            .eq('id', openIssue.id);
    }
}

executeOpenIssue();