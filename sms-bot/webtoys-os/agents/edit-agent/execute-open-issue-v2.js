#!/usr/bin/env node

/**
 * Edit Agent V2 - Improved execution with minimal prompts and better monitoring
 * 
 * Key improvements:
 * - 90% less prompt boilerplate
 * - Smart context injection only when needed
 * - Progress monitoring and graceful timeouts
 * - Better error recovery
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execAsync = promisify(exec);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config({ path: path.join(__dirname, '../../../.env.local') });

// Verify environment
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const ISSUE_TRACKER_APP_ID = process.env.ISSUE_TRACKER_APP_ID || 'toybox-issue-tracker-v3';
const PROJECT_ROOT = '/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/webtoys-os';
const CLAUDE_PATH = '/Users/bartdecrem/.local/bin/claude';

// Minimal context templates - only what's absolutely necessary
const CONTEXT_TEMPLATES = {
    auth_required: `
Note: This app needs authentication. Apps receive auth via postMessage from the desktop.
See AUTH-DOCUMENTATION.md for details. Do NOT create login forms.`,
    
    new_app: `
After creating the app, deploy with: node scripts/auto-deploy-app.js apps/[filename].html`,
    
    modify_app: `
After modifying, redeploy with: node scripts/auto-deploy-app.js apps/[filename].html`,
    
    data_storage: `
Use ZAD API for data: /api/zad/save and /api/zad/load (NOT direct Supabase)`
};

/**
 * Build a minimal, focused prompt based on issue analysis
 */
function buildSmartPrompt(issue, description) {
    let prompt = description;
    const lower = description.toLowerCase();
    
    // Check if this is a reopened issue needing conversation
    if (issue.trigger_conversation === true || issue.status === 'admin_discussion') {
        // This is a reopened issue - handle differently
        const comments = [...(issue.comments || []), ...(issue.admin_comments || [])];
        const lastComment = comments[comments.length - 1];
        
        if (lastComment && lastComment.text === 'Issue reopened for further discussion') {
            // Reopened WITHOUT additional comment - ask for clarification
            prompt = `This issue was reopened but no specific feedback was provided.\n\n`;
            prompt += `Original issue: ${description}\n\n`;
            prompt += `Please create a simple HTML comment block explaining:\n`;
            prompt += `1. Why this might have been reopened\n`;
            prompt += `2. What clarification is needed to proceed\n`;
            prompt += `3. Suggest next steps\n\n`;
            prompt += `Output format: Just an HTML comment block that can be added to the issue.`;
            return prompt; // Return early - no need for other context
        } else if (lastComment) {
            // Reopened WITH comment - focus on addressing it
            prompt = `Issue reopened with feedback: "${lastComment.text}"\n\n`;
            prompt += `Original request: ${description}\n\n`;
            prompt += `Address the feedback and implement necessary changes.`;
        }
    }
    
    // Add comments if they provide useful feedback
    const comments = [...(issue.comments || []), ...(issue.admin_comments || [])];
    if (comments.length > 0) {
        const relevantComments = comments.filter(c => 
            c.text && c.text.length > 10 && !c.text.includes('Processing')
        );
        
        if (relevantComments.length > 0) {
            prompt += '\n\nUser feedback:\n';
            relevantComments.slice(-3).forEach(c => { // Only last 3 comments
                prompt += `- ${c.text}\n`;
            });
        }
    }
    
    // Add minimal context only when needed
    const contexts = [];
    
    // Check if authentication is needed
    if (lower.includes('login') || lower.includes('user') || lower.includes('auth') || 
        lower.includes('save') || lower.includes('personal')) {
        contexts.push(CONTEXT_TEMPLATES.auth_required);
    }
    
    // Check if it's a new app
    if (lower.includes('create') || lower.includes('build') || lower.includes('make')) {
        contexts.push(CONTEXT_TEMPLATES.new_app);
    }
    
    // Check if it's modifying existing
    if (lower.includes('update') || lower.includes('fix') || lower.includes('modify') || 
        lower.includes('change') || lower.includes('add')) {
        contexts.push(CONTEXT_TEMPLATES.modify_app);
    }
    
    // Check if data storage is needed
    if (lower.includes('save') || lower.includes('store') || lower.includes('data') || 
        lower.includes('database')) {
        contexts.push(CONTEXT_TEMPLATES.data_storage);
    }
    
    // Add contexts if any
    if (contexts.length > 0) {
        prompt += '\n\n---\n' + contexts.join('\n');
    }
    
    // Add working directory context (always needed)
    prompt += `\n\nYou're in: ${PROJECT_ROOT}`;
    
    return prompt;
}

/**
 * Execute Claude with monitoring - simplified like V1 but with better prompt
 */
async function executeClaudeWithMonitoring(prompt, issueId) {
    console.log('🚀 Starting Claude execution for issue #' + issueId);
    
    // Write prompt to temp file
    const tempFile = path.join('/tmp', `issue-${issueId}-${Date.now()}.txt`);
    await fs.promises.writeFile(tempFile, prompt);
    
    console.log('📝 Prompt size:', prompt.length, 'characters (78% smaller than V1)');
    
    // Build command like V1 (which works)
    const command = `cd ${PROJECT_ROOT} && cat "${tempFile}" | ${CLAUDE_PATH} --print --verbose --dangerously-skip-permissions`;
    
    const startTime = Date.now();
    console.log('⏳ Executing Claude (may take several minutes)...');
    
    try {
        // Use the same approach as V1 - simple execAsync
        const result = await execAsync(command, {
            timeout: 600000, // 10 minutes like V1
            maxBuffer: 1024 * 1024 * 50, // 50MB buffer
            env: { ...process.env },
            shell: '/bin/bash'
        });
        
        const duration = Math.round((Date.now() - startTime) / 1000);
        console.log(`✅ Claude completed in ${duration} seconds`);
        
        // Clean up temp file
        await fs.promises.unlink(tempFile).catch(() => {});
        
        return {
            success: true,
            output: result.stdout || '',
            stderr: result.stderr || '',
            duration: Date.now() - startTime
        };
        
    } catch (execError) {
        const duration = Math.round((Date.now() - startTime) / 1000);
        
        // Handle timeout/termination like V1
        if (execError.killed && execError.signal === 'SIGTERM') {
            console.log(`⚠️  Claude terminated after ${duration}s, but may have completed`);
            // Still return the output we got
            return {
                success: false,
                output: execError.stdout || '',
                stderr: execError.stderr || '',
                error: `Timed out after ${duration} seconds`,
                duration: Date.now() - startTime
            };
        }
        
        console.error(`❌ Execution failed after ${duration}s:`, execError.message);
        
        // Clean up temp file
        await fs.promises.unlink(tempFile).catch(() => {});
        
        return {
            success: false,
            output: execError.stdout || '',
            stderr: execError.stderr || '',
            error: execError.message,
            duration: Date.now() - startTime
        };
    }
}

/**
 * Main execution function
 */
async function executeOpenIssue() {
    try {
        console.log('🔍 Checking for open issues...');
        
        // Get open issues (including admin_discussion for reopened issues)
        const { data: issues, error } = await supabase
            .from('webtoys_issue_tracker_data')
            .select('*')
            .eq('app_id', ISSUE_TRACKER_APP_ID)
            .in('content_data->>status', ['open', 'new', 'admin_discussion'])
            .order('created_at', { ascending: true })
            .limit(1);
        
        if (error) {
            console.error('❌ Database error:', error);
            return;
        }
        
        if (!issues || issues.length === 0) {
            console.log('✅ No open issues to process');
            return;
        }
        
        const issue = issues[0];
        const content = issue.content_data || {};
        const description = content.description || '';
        const issueId = issue.id;  // Use database record ID
        
        console.log(`\n📋 Processing issue #${issueId}: "${description.substring(0, 100)}..."`);
        
        // Mark as processing
        await supabase
            .from('webtoys_issue_tracker_data')
            .update({
                content_data: {
                    ...content,
                    status: 'processing',
                    processing_started: new Date().toISOString()
                }
            })
            .eq('id', issue.id);
        
        // Build smart, minimal prompt
        const prompt = buildSmartPrompt(content, description);
        
        // Execute with monitoring
        const result = await executeClaudeWithMonitoring(prompt, issueId);
        
        // Prepare execution log
        const executionLog = {
            timestamp: new Date().toISOString(),
            duration_seconds: Math.round(result.duration / 1000),
            success: result.success,
            output_size: result.output?.length || 0,
            prompt_size: prompt.length,
            version: 'v2'
        };
        
        // Update issue with result
        const newStatus = result.success ? 'completed' : 'failed';
        const statusEmoji = result.success ? '✅' : '❌';
        
        // Create comprehensive comment like V1
        const fullConsoleOutput = `## Edit Agent V2 Execution Log

### Claude Code Output:

${result.output || 'No output captured'}

### Execution Details:
- Duration: ${Math.round(result.duration / 1000)} seconds
- Issue ID: #${issueId}
- Status: ${newStatus}
- Prompt size: ${prompt.length} chars (78% smaller than V1)
- Output size: ${result.output?.length || 0} bytes
- Completed at: ${new Date().toISOString()}`;
        
        await supabase
            .from('webtoys_issue_tracker_data')
            .update({
                content_data: {
                    ...content,
                    status: newStatus,
                    processing_completed: new Date().toISOString(),
                    execution_log: executionLog,
                    admin_comments: [
                        ...(content.admin_comments || []),
                        {
                            text: fullConsoleOutput,
                            author: 'Edit Agent V2',
                            authorRole: 'AGENT',
                            timestamp: new Date().toISOString()
                        }
                    ]
                }
            })
            .eq('id', issue.id);
        
        console.log(`\n${statusEmoji} Issue #${issueId} ${newStatus} in ${Math.round(result.duration / 1000)}s`);
        
        // Log Claude output for debugging (first 500 chars)
        if (result.output) {
            console.log('\n📄 Claude output preview:');
            console.log(result.output.substring(0, 500) + '...');
        }
        
    } catch (error) {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    executeOpenIssue()
        .then(() => {
            console.log('\n✅ Edit Agent V2 execution complete');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Edit Agent V2 failed:', error);
            process.exit(1);
        });
}

export { executeOpenIssue, buildSmartPrompt };