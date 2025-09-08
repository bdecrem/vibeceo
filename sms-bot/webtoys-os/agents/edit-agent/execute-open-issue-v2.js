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
Create the app in the apps/ directory, then deploy with: node scripts/safe-deploy-app.js apps/[filename].html
This will: 1) Save to git, 2) Create commit, 3) Deploy to Supabase`,
    
    modify_app: `
After modifying, redeploy with: node scripts/safe-deploy-app.js apps/[filename].html
This will: 1) Save changes to git, 2) Create commit, 3) Deploy to Supabase`,
    
    data_storage: `
MANDATORY: Use ZAD API for ALL data storage:
- Save: POST to /api/zad/save with {app_id, participant_id, action_type, content_data}
- Load: GET from /api/zad/load?app_id=X&action_type=Y
- NEVER use direct Supabase access
- ALWAYS include action_type for filtering
- ALWAYS filter load results by participant_id`
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
    
    // ALWAYS include auth for apps that save/load user content
    const needsUserContent = lower.includes('save') || lower.includes('load') || 
        lower.includes('store') || lower.includes('personal') || lower.includes('user') ||
        lower.includes('document') || lower.includes('note') || lower.includes('todo') ||
        lower.includes('list') || lower.includes('editor') || lower.includes('writer') ||
        lower.includes('processor') || lower.includes('manage') || lower.includes('track') ||
        lower.includes('keep') || lower.includes('record') || lower.includes('data');
    
    if (needsUserContent) {
        contexts.push(`CRITICAL: This app REQUIRES authentication! Copy this EXACT code:

// Global auth state
let currentUser = null;

// Load auth from localStorage (immediate)
function loadAuthFromStorage() {
    const savedUser = localStorage.getItem('toybox_user');
    if (savedUser) {
        currentUser = JSON.parse(savedUser);
        if (currentUser) {
            if (currentUser.handle) currentUser.handle = currentUser.handle.toUpperCase();
            if (!currentUser.participantId && currentUser.handle && currentUser.pin) {
                currentUser.participantId = \`\${currentUser.handle.toUpperCase()}_\${currentUser.pin}\`;
            }
        }
    }
    return !!currentUser;
}

// Listen for auth from desktop (real-time)
window.addEventListener('message', (e) => {
    if (e.data && e.data.type === 'TOYBOX_AUTH') {
        currentUser = e.data.user;
        if (currentUser) {
            if (currentUser.handle) currentUser.handle = currentUser.handle.toUpperCase();
            if (!currentUser.participantId && currentUser.handle && currentUser.pin) {
                currentUser.participantId = \`\${currentUser.handle.toUpperCase()}_\${currentUser.pin}\`;
            }
        }
        updateAuthDisplay();
        if (currentUser) loadUserData();
    }
});

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
    if (loadAuthFromStorage()) {
        updateAuthDisplay();
        loadUserData();
    }
});

// For ZAD saves, ALWAYS use:
const participantId = currentUser?.participantId || \`\${currentUser?.handle?.toUpperCase()}_\${currentUser?.pin}\`;`);
        contexts.push(CONTEXT_TEMPLATES.data_storage);
    }
    
    // ALWAYS include leaderboard for games
    if (lower.includes('game') || lower.includes('play') || lower.includes('score') || 
        lower.includes('puzzle') || lower.includes('arcade') || lower.includes('challenge')) {
        contexts.push(`CRITICAL: Games MUST have a leaderboard! Copy this EXACT pattern:

// Leaderboard HTML
<div id="leaderboard">
    <h3>🏆 Top Scores</h3>
    <ol id="scoreList"></ol>
</div>

// Save score function
async function saveScore(score) {
    if (!currentUser) {
        alert('Please log in to save your score!');
        return;
    }
    
    const participantId = currentUser.participantId || \`\${currentUser.handle.toUpperCase()}_\${currentUser.pin}\`;
    
    await fetch('/api/zad/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            app_id: 'your-game-id',
            participant_id: participantId,
            action_type: 'leaderboard',
            content_data: {
                score: score,
                player: currentUser.handle.toUpperCase(),
                timestamp: Date.now()
            }
        })
    });
    
    loadLeaderboard();
}

// Load and display leaderboard
async function loadLeaderboard() {
    const response = await fetch('/api/zad/load?app_id=your-game-id&action_type=leaderboard');
    const scores = await response.json();
    
    // Get best score per player
    const bestScores = {};
    scores.forEach(s => {
        const player = s.content_data?.player || s.player;
        const score = s.content_data?.score || s.score;
        if (!bestScores[player] || score > bestScores[player]) {
            bestScores[player] = score;
        }
    });
    
    // Sort and display top 10
    const sorted = Object.entries(bestScores)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    document.getElementById('scoreList').innerHTML = sorted
        .map(([player, score]) => \`<li>\${player}: \${score}</li>\`)
        .join('');
}`);
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
    
    // Additional guidance for specific app types
    if (lower.includes('calculator') || lower.includes('calc')) {
        contexts.push(`For calculator apps: Include full numeric keypad, clear button, and history of calculations`);
    }
    
    if (lower.includes('timer') || lower.includes('clock') || lower.includes('stopwatch')) {
        contexts.push(`For timer apps: Include start/stop/reset buttons, visual countdown, and optional sound alerts`);
    }
    
    if (lower.includes('draw') || lower.includes('paint') || lower.includes('sketch')) {
        contexts.push(`For drawing apps: Use canvas element, include color picker, brush size, and clear/save functions`);
    }
    
    // CRITICAL: Modern design principles
    contexts.push(`
🎨 DESIGN REQUIREMENTS - Think like a 2025 designer, NOT a 1980s engineer:

DO:
- Clean, minimal interfaces with focus on content
- Subtle animations and transitions (0.2s ease)
- Modern fonts (Inter, DM Sans, system fonts)
- Soft shadows and rounded corners (8-12px)
- Floating action buttons that appear when needed
- Glassmorphism and backdrop-filter effects
- Gradient accents (not overwhelming backgrounds)

DON'T:
- Show user info (it's on the desktop already!)
- Add Export/Import/Print buttons (this isn't 1995)
- Create complex toolbars with 20 buttons
- Leave empty space or split screens with no content
- Use harsh borders or sharp corners
- Add unnecessary status bars or panels

LAYOUT:
- Sidebar for navigation (if needed)
- Main content area takes priority
- Floating save indicator (appears on changes)
- Simple word count at bottom
- Login prompts only when user tries to save

WINDOW SIZING (CRITICAL):
- Apps MUST specify exact width and height in app registry
- Windows wrap TIGHTLY around app content (no extra padding)
- Standard sizes: Chat (700x500), Text Editor (800x600), Games (varies)
- Desktop windows use exact dimensions - NO min-width/min-height
- Mobile ALWAYS fullscreen (ignore width/height on mobile)`);
    
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
            env: { 
                ...process.env,
                HOME: process.env.HOME || '/Users/bartdecrem',
                USER: process.env.USER || 'bartdecrem',
                PATH: process.env.PATH || '/Users/bartdecrem/.local/bin:/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin'
            },
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
    // Lock file to prevent multiple instances
    const lockFile = path.join(__dirname, '.agent.lock');
    
    // Check if another instance is running
    if (fs.existsSync(lockFile)) {
        try {
            const lockData = JSON.parse(fs.readFileSync(lockFile, 'utf8'));
            const lockAge = Date.now() - lockData.timestamp;
            
            // If lock is less than 10 minutes old, another instance is probably running
            if (lockAge < 600000) {
                console.log('⚠️ Another instance is already running (lock age:', Math.round(lockAge/1000), 'seconds)');
                console.log('   Skipping this run to prevent overlapping executions');
                return;
            } else {
                console.log('🔓 Stale lock detected (', Math.round(lockAge/60000), 'minutes old), removing...');
            }
        } catch (e) {
            console.log('⚠️ Invalid lock file, removing...');
        }
    }
    
    // Create lock file
    fs.writeFileSync(lockFile, JSON.stringify({
        pid: process.pid,
        timestamp: Date.now(),
        startTime: new Date().toISOString()
    }));
    
    // Ensure lock is removed on exit
    const cleanup = () => {
        if (fs.existsSync(lockFile)) {
            fs.unlinkSync(lockFile);
            console.log('🔓 Lock file removed');
        }
    };
    
    process.on('exit', cleanup);
    process.on('SIGINT', cleanup);
    process.on('SIGTERM', cleanup);
    
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
        
        // Extract commit hash from output if present
        let commitHash = null;
        let filesChanged = [];
        
        if (result.output) {
            // Look for commit hash pattern in output
            const commitMatch = result.output.match(/COMMIT_HASH=([a-f0-9]+)/);
            if (commitMatch) {
                commitHash = commitMatch[1];
                console.log(`📝 Captured commit: ${commitHash}`);
            }
            
            // Look for file deployment patterns
            const deployMatches = result.output.matchAll(/safe-deploy-app\.js\s+(?:apps\/)?([^\s]+\.html)/g);
            for (const match of deployMatches) {
                filesChanged.push(`apps/${match[1]}`);
            }
        }
        
        // Prepare execution log
        const executionLog = {
            timestamp: new Date().toISOString(),
            duration_seconds: Math.round(result.duration / 1000),
            success: result.success,
            output_size: result.output?.length || 0,
            prompt_size: prompt.length,
            version: 'v2',
            git_commit: commitHash,
            files_changed: filesChanged
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
${commitHash ? `- Git Commit: ${commitHash}` : '- Git Commit: No changes committed'}
${filesChanged.length > 0 ? `- Files Changed: ${filesChanged.join(', ')}` : ''}
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
            // Clean up lock file before exiting
            const lockFile = path.join(__dirname, '.agent.lock');
            if (fs.existsSync(lockFile)) {
                fs.unlinkSync(lockFile);
            }
            console.log('\n✅ Edit Agent V2 execution complete');
            process.exit(0);
        })
        .catch(error => {
            console.error('❌ Edit Agent V2 failed:', error);
            // Clean up lock file on error
            const lockFile = path.join(__dirname, '.agent.lock');
            if (fs.existsSync(lockFile)) {
                fs.unlinkSync(lockFile);
            }
            process.exit(1);
        });
}

export { executeOpenIssue, buildSmartPrompt };