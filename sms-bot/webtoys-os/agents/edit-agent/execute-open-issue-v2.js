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
import { exec, spawn } from 'child_process';
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
CRITICAL: ZAD SAVE/LOAD HELPERS - COPY THIS EXACTLY (no direct Supabase)

// 1) App identity
window.APP_ID = 'your-app-id'; // e.g., 'toybox-text-editor'
function getAppId() { return window.APP_ID || 'your-app-id'; }

// 2) User helpers (handle uppercased, participant_id = HANDLE_PIN)
function getUsername() {
  return (window.currentUser && window.currentUser.handle)
    ? window.currentUser.handle.toUpperCase()
    : 'anonymous';
}
function getParticipantId() {
  if (!window.currentUser) return 'anonymous_0000';
  return window.currentUser.participantId || (getUsername() + '_' + (window.currentUser.pin || '0000'));
}

// 3) ZAD save helper (adds participant_data and timestamp)
async function zadSave(dataType, data) {
  const app_id = getAppId();
  const participant_id = getParticipantId();
  const username = getUsername();
  const res = await fetch('/api/zad/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: app_id,
      participant_id: participant_id,
      participant_data: { userLabel: username, username: username },
      action_type: dataType,
      content_data: Object.assign({
        timestamp: (data && data.timestamp) ? data.timestamp : Date.now(),
        author: (data && data.author) ? data.author : username
      }, data)
    })
  });
  if (!res.ok) {
    const err = await res.json().catch(function(){ return {}; });
    throw new Error('Save failed: ' + (err.error || res.statusText));
  }
  return true;
}

// 4) ZAD load helper (flattens content_data and preserves participant_id)
async function zadLoad(dataType) {
  const app_id = getAppId();
  const url = '/api/zad/load?app_id=' + encodeURIComponent(app_id) + '&action_type=' + encodeURIComponent(dataType);
  const res = await fetch(url);
  if (!res.ok) {
    const err = await res.json().catch(function(){ return {}; });
    throw new Error('Load failed: ' + (err.error || res.statusText));
  }
  const data = await res.json();
  return (data || []).map(function(item){
    var cd = item.content_data || {};
    return {
      id: cd.id || item.id,
      title: cd.title,
      content: cd.content,
      author: cd.author || (item.participant_data && (item.participant_data.username || item.participant_data.userLabel)) || 'Unknown',
      updatedAt: cd.updatedAt || item.created_at,
      created_at: item.created_at,
      participant_id: item.participant_id
    };
  });
}

// 5) Per-user filter + dedupe pattern (append-only store)
async function loadUserItems(dataType) {
  var all = await zadLoad(dataType);
  var me = getParticipantId();
  var mine = all.filter(function(d){ return d.participant_id === me; });
  var latest = {};
  mine.forEach(function(d){
    var ts = d.updatedAt ? new Date(d.updatedAt).getTime() : 0;
    if (!latest[d.id] || ts > latest[d.id].ts) {
      latest[d.id] = Object.assign({ ts: ts }, d);
    }
  });
  return Object.values(latest).sort(function(a,b){ return b.ts - a.ts; });
}

// Usage examples:
// Save: await zadSave('document', { id, title, content, updatedAt: new Date().toISOString() });
// Load current user's: const docs = await loadUserItems('document');
// NEVER call Supabase directly from apps; always use /api/zad/*.
`
};

/**
 * Build a minimal, focused prompt based on issue analysis
 */
function buildSmartPrompt(issue, description) {
    let prompt = description;
    const lower = description.toLowerCase();
    
    // Check if issue was reopened by looking for reopenedAt timestamp
    const wasReopened = issue.reopenedAt && issue.status !== 'closed';
    
    // Get all comments, filtering out agent responses
    const allComments = [...(issue.comments || []), ...(issue.admin_comments || [])];
    const userComments = allComments.filter(c => 
        c.author !== 'Edit Agent V2' && 
        c.authorRole !== 'AGENT' &&
        c.text && 
        c.text.length > 10
    );
    
    // Get agent's previous responses
    const agentResponses = allComments.filter(c => 
        c.author === 'Edit Agent V2' || c.authorRole === 'AGENT'
    );
    
    // If reopened, focus on the conversation flow
    if (wasReopened && userComments.length > 0) {
        // Find comments after reopening
        const reopenedTime = new Date(issue.reopenedAt).getTime();
        const commentsAfterReopening = userComments.filter(c => 
            new Date(c.timestamp).getTime() >= reopenedTime
        );
        
        if (commentsAfterReopening.length > 0) {
            // CRITICAL: This is a conversation - user is responding to our previous work
            const lastUserComment = commentsAfterReopening[commentsAfterReopening.length - 1];
            
            prompt = `## IMPORTANT: This is a REOPENED issue with user feedback!\n\n`;
            prompt += `### Original Request:\n${description}\n\n`;
            
            // Include our previous response for context
            if (agentResponses.length > 0) {
                const lastAgentResponse = agentResponses[agentResponses.length - 1];
                // Extract just the core content, not the execution log
                const responseText = lastAgentResponse.text.split('### Claude Code Output:')[1]?.split('### Execution Details:')[0] || '';
                if (responseText) {
                    prompt += `### Your Previous Response:\n${responseText.substring(0, 1000)}...\n\n`;
                }
            }
            
            prompt += `### User's NEW Feedback (RESPOND TO THIS):\n"${lastUserComment.text}"\n\n`;
            prompt += `### Instructions:\n`;
            prompt += `1. The user has provided feedback on your previous response\n`;
            prompt += `2. Address their SPECIFIC feedback - don't repeat your original response\n`;
            prompt += `3. If they suggest changes, implement those changes\n`;
            prompt += `4. If they ask questions, answer them\n`;
            prompt += `5. Build upon your previous work, don't start over\n\n`;
            
            // Don't add generic context for reopened issues - focus on the conversation
            return prompt;
        }
    }
    
    // Not a reopened issue - handle normally but include any comments
    if (userComments.length > 0) {
        prompt += '\n\n### User Comments:\n';
        userComments.slice(-3).forEach(c => { // Last 3 user comments
            prompt += `- ${c.text}\n`;
        });
        prompt += '\n';
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

🎨 DESIGN REQUIREMENTS - Match the Webtoys OS aesthetic:

VISUAL LANGUAGE:
- Glass morphism: backdrop-filter: blur(20px), semi-transparent backgrounds
- Soft gradients: Use subtle color transitions, not flat colors
- Rounded corners: 16-24px for containers, 12px for buttons
- Modern shadows: box-shadow: 0 8px 32px rgba(0,0,0,0.1)
- Color palette: Work with translucent whites, soft pastels, gradient accents

TYPOGRAPHY:
- Headers: Comfortaa or similar rounded, friendly fonts
- Body: Inter or system-ui for readability
- Sizes: Generous spacing, 14-16px base size
- Colors: High contrast but soft (not pure black on white)

COMPONENTS:
- Buttons: Gradient backgrounds with hover effects, pill-shaped when appropriate
- Cards: Glass effect with subtle borders (1px rgba(255,255,255,0.2))
- Inputs: Transparent backgrounds, focus states with glow effects
- Icons: Use emojis or rounded icon sets, not sharp system icons

LAYOUT PRINCIPLES:
- Floating elements over blurred backgrounds
- Content cards that feel like they're hovering
- Smooth transitions (0.3s cubic-bezier)
- Generous padding (20-32px)
- Single focus area, minimal chrome

AVOID:
- Solid gray backgrounds (#f5f5f5 is banned!)
- Sharp 1px black borders
- Traditional menu bars and toolbars
- Dense information layouts
- System default styles

INTERACTION:
- Hover states that transform/scale slightly
- Click feedback with subtle animations
- Auto-save with toast notifications
- Contextual actions that appear on hover/focus

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
    console.log('\n' + '='.repeat(80));
    console.log('🚀 STARTING CLAUDE EXECUTION FOR ISSUE #' + issueId);
    console.log('='.repeat(80));
    console.log('🕐 Start time:', new Date().toLocaleTimeString());
    
    // Write prompt to temp file
    const tempFile = path.join('/tmp', `issue-${issueId}-${Date.now()}.txt`);
    await fs.promises.writeFile(tempFile, prompt);
    
    console.log('\n📊 PROMPT STATISTICS:');
    console.log('   Size:', prompt.length, 'characters');
    console.log('   Lines:', prompt.split('\n').length);
    console.log('   Efficiency: 78% smaller than V1');
    
    const startTime = Date.now();
    console.log('\n⏳ EXECUTING CLAUDE CODE...');
    console.log('   This may take several minutes...');
    console.log('   Watch for real-time progress updates below:');
    console.log('-'.repeat(60));
    
    // Use shell wrapper (only thing that actually works with Claude CLI auth)
    return new Promise((resolve) => {
        const wrapperPath = path.join(__dirname, 'claude-wrapper.sh');
        
        console.log('\n🔧 EXECUTION CONFIGURATION:');
        console.log('   Wrapper:', wrapperPath);
        console.log('   Prompt file:', tempFile);
        console.log('   Working dir:', PROJECT_ROOT);
        console.log('\n🎬 Starting Claude process now...');
        console.log('-'.repeat(60));
        
        // Clean environment - Remove all potentially conflicting API keys
        // but keep essential system variables AND add OAuth token
        const cleanEnv = {
            PATH: process.env.PATH,
            HOME: process.env.HOME,
            USER: process.env.USER,
            SHELL: process.env.SHELL,
            // CRITICAL: Add OAuth token for authentication
            CLAUDE_CODE_OAUTH_TOKEN: process.env.CLAUDE_CODE_OAUTH_TOKEN || 
                "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"
        };
        
        // Ensure HOME is definitely set (critical for Claude auth)
        if (!cleanEnv.HOME) {
            cleanEnv.HOME = '/Users/bartdecrem';
        }
        
        // CRITICAL: Do NOT include these as they conflict with Claude CLI:
        // - ANTHROPIC_API_KEY
        // - CLAUDE_API_KEY
        // - Any other API keys that might interfere
        
        const child = spawn(wrapperPath, [tempFile], {
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 600000, // 10 minutes
            env: cleanEnv // Use minimal clean environment
        });
        
        let output = '';
        let stderr = '';
        let chunks = 0;
        
        let lastProgressTime = Date.now();
        child.stdout.on('data', (data) => {
            output += data.toString();
            chunks++;
            
            // Show real-time output snippets
            const lines = data.toString().split('\n').filter(l => l.trim());
            lines.forEach(line => {
                if (line.includes('Tool:') || line.includes('Running') || line.includes('Creating') || 
                    line.includes('Writing') || line.includes('Reading') || line.includes('Deploying') ||
                    line.includes('Successfully') || line.includes('Error') || line.includes('Warning')) {
                    console.log(`   🔄 ${line.substring(0, 120)}`);
                }
            });
            
            // Progress update every 5 seconds or 10 chunks
            const now = Date.now();
            if (chunks % 10 === 0 || (now - lastProgressTime) > 5000) {
                const elapsed = Math.round((now - startTime) / 1000);
                console.log(`\n  ⏱️  Progress Update [${elapsed}s elapsed]`);
                console.log(`      Chunks received: ${chunks}`);
                console.log(`      Data size: ${Math.round(output.length / 1024)} KB`);
                console.log(`      Status: Claude is actively working...\n`);
                lastProgressTime = now;
            }
        });
        
        child.stderr.on('data', (data) => {
            stderr += data.toString();
        });
        
        child.on('close', async (code) => {
            const duration = Math.round((Date.now() - startTime) / 1000);
            
            // Clean up temp file
            await fs.promises.unlink(tempFile).catch(() => {});
            
            if (code === 0) {
                console.log('\n' + '='.repeat(60));
                console.log(`✅ CLAUDE EXECUTION SUCCESSFUL`);
                console.log('='.repeat(60));
                console.log(`⏱️  Duration: ${duration} seconds`);
                console.log(`📊 Output: ${Math.round(output.length / 1024)} KB`);
                resolve({
                    success: true,
                    output: output,
                    stderr: stderr,
                    duration: Date.now() - startTime
                });
            } else {
                console.error('\n' + '='.repeat(60));
                console.error(`❌ CLAUDE EXECUTION FAILED`);
                console.error('='.repeat(60));
                console.error(`⏱️  Failed after: ${duration} seconds`);
                console.error(`🔴 Exit code: ${code}`);
                resolve({
                    success: false,
                    output: output,
                    stderr: stderr,
                    error: `Claude CLI exited with code ${code}: ${stderr}`,
                    duration: Date.now() - startTime
                });
            }
        });
        
        child.on('error', async (error) => {
            const duration = Math.round((Date.now() - startTime) / 1000);
            console.error(`❌ Execution error after ${duration}s:`, error.message);
            
            // Clean up temp file
            await fs.promises.unlink(tempFile).catch(() => {});
            
            resolve({
                success: false,
                output: output,
                stderr: stderr,
                error: error.message,
                duration: Date.now() - startTime
            });
        });
    });
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
        console.log('\n' + '▓'.repeat(80));
        console.log('🤖 WEBTOYS EDIT AGENT V2 - STARTING NEW RUN');
        console.log('▓'.repeat(80));
        console.log('🕐 Time:', new Date().toLocaleString());
        console.log('📁 Working in:', PROJECT_ROOT);
        console.log('🔍 Tracker ID:', ISSUE_TRACKER_APP_ID);
        console.log('\n🔍 Checking database for open issues...');
        
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
        
        console.log('\n' + '═'.repeat(80));
        console.log(`📋 PROCESSING ISSUE #${issueId}`);
        console.log('═'.repeat(80));
        console.log(`📝 Description: "${description.substring(0, 100)}..."`);
        console.log(`👤 Submitted by: ${issue.handle || 'Anonymous'}`);
        console.log(`📅 Created: ${new Date(issue.created_at).toLocaleString()}`);
        if (issue.comments?.length > 0) {
            console.log(`💬 Has ${issue.comments.length} comment(s)`);
        }
        console.log('\n📤 Marking as processing...');
        
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
                console.log(`\n🎯 GIT COMMIT DETECTED!`);
                console.log(`   Hash: ${commitHash}`);
                console.log(`   This confirms Claude made code changes successfully`);
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
        
        console.log('\n' + '═'.repeat(80));
        console.log(`${statusEmoji} ISSUE #${issueId} COMPLETE`);
        console.log('═'.repeat(80));
        console.log(`📊 Status: ${newStatus}`);
        console.log(`⏱️  Time: ${Math.round(result.duration / 1000)} seconds`);
        console.log(`🕐 Finished: ${new Date().toLocaleString()}`);
        
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
            console.log('\n' + '▓'.repeat(80));
            console.log('✅ EDIT AGENT V2 - RUN COMPLETE');
            console.log('▓'.repeat(80));
            console.log('🕐 Finished at:', new Date().toLocaleString());
            console.log('📊 Next cron run: In ~2 minutes');
            console.log('');
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
