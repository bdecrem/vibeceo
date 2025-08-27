#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: '../.env.local' });

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const ISSUE_TRACKER_APP_ID = process.env.ISSUE_TRACKER_APP_ID || 'toybox-direct-updates';

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
    console.log('🔍 Looking for open issues...');
    
    // Fetch open issues
    const { data, error } = await supabase
        .from('wtaf_zero_admin_collaborative')
        .select('*')
        .eq('app_id', ISSUE_TRACKER_APP_ID)
        .eq('action_type', 'update_request')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    // Find the first open issue
    const openIssue = data.find(issue => {
        const content = typeof issue.content_data === 'string' 
            ? JSON.parse(issue.content_data) 
            : issue.content_data;
        return content.status === 'open';
    });

    if (!openIssue) {
        console.log('📭 No open issues found');
        return;
    }

    const content = typeof openIssue.content_data === 'string' 
        ? JSON.parse(openIssue.content_data) 
        : openIssue.content_data;

    console.log(`\n✅ Found open issue #${content.issueNumber}:`);
    console.log(`   Description: ${content.description}`);
    console.log(`   Submitted by: ${content.submittedBy}`);
    console.log(`   Priority: ${content.priority}`);
    
    // Update status to processing
    content.status = 'processing';
    content.processedAt = new Date().toISOString();
    
    await supabase
        .from('wtaf_zero_admin_collaborative')
        .update({ content_data: JSON.stringify(content) })
        .eq('id', openIssue.id);
    
    console.log('\n🤖 Executing issue with Claude...\n');
    
    // Create comprehensive prompt for Claude based on issue type
    const parsed = parseIssueDescription(content.description);
    
    // Simple, clear prompt that lets Claude Code use its full capabilities
    let claudePrompt = `${content.description}

IMPORTANT: After completing this request, ensure that:

1. **For NEW apps**: 
   - Deploy the app to Supabase database so it's accessible at https://webtoys.ai/public/[app-name]
   - Add the app to webtoys-os-v2 desktop using the documented 3-system approach (see ADDING-APPS-TO-WEBTOYS-OS-V2.md)
   - Use scripts in community-desktop-v2/scripts/ as reference (like add-painty-to-webtoys-os-v2.js)

2. **For MODIFIED apps**:
   - Deploy the updated version to Supabase database
   - Use safe-update-wrapper.js or appropriate deployment methods
   - Ensure changes are live at the existing URL

3. **General requirements**:
   - Create complete, standalone HTML files with all code included
   - Follow existing project patterns and conventions
   - Test that your changes work correctly

The project has deployment examples in community-desktop-v2/scripts/ that show how to properly deploy apps to the database.`;
    
    console.log('📋 Sending enhanced prompt to Claude:', claudePrompt.substring(0, 200) + '...');
    
    try {
        // Execute with Claude using proper CLI syntax (following fix-issues.js working pattern)
        const claudePath = '/Users/bartdecrem/.local/bin/claude';
        
        console.log('🚀 Executing Claude...');
        
        const PROJECT_ROOT = '/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/community-desktop-v2';
        
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
            timeout: 300000, // 5 minute timeout
            maxBuffer: 1024 * 1024 * 50, // 50MB buffer (same as fix-issues.js)
            env: { ...process.env }
        });
        
        // Clean up temp file
        await fs.promises.unlink(tempFile).catch(() => {});
        
        const duration = Math.round((Date.now() - startTime) / 1000);
        console.log(`✅ Claude completed in ${duration} seconds`);
        
        if (stdout) {
            console.log('Claude output (first 500 chars):', stdout.substring(0, 500));
            console.log('Total output length:', stdout.length, 'chars');
        }
        if (stderr) {
            console.error('Claude stderr:', stderr);
        }
        
        // Update issue status to completed
        content.status = 'completed';
        content.completedAt = new Date().toISOString();
        content.resolution = 'Executed by Claude';
        
        await supabase
            .from('wtaf_zero_admin_collaborative')
            .update({ content_data: JSON.stringify(content) })
            .eq('id', openIssue.id);
        
        // Claude Code should handle all deployment and desktop integration
        // The prompt includes clear instructions for what to do
        console.log('\n📝 Claude Code should have handled deployment and any desktop integration needed');

        console.log('\n✅ Issue completed successfully!');
        
    } catch (error) {
        console.error('❌ Claude execution failed:', error);
        
        content.status = 'failed';
        content.error = error.message;
        
        await supabase
            .from('wtaf_zero_admin_collaborative')
            .update({ content_data: JSON.stringify(content) })
            .eq('id', openIssue.id);
    }
}

executeOpenIssue();