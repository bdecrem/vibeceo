#!/usr/bin/env node

// Test with a prompt similar to what the agent actually sends
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';

const execAsync = promisify(exec);

async function testRealPrompt() {
    // Create a prompt similar to what buildSmartPrompt creates
    const prompt = `Add a simple text editor called Moi

User feedback:
- Edit Agent on 9/7/2025, 7:37:00 ...

---
CRITICAL: This app REQUIRES authentication! Copy this EXACT code:

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
const participantId = currentUser?.participantId || \`\${currentUser?.handle?.toUpperCase()}_\${currentUser?.pin}\`;

MANDATORY: Use ZAD API for ALL data storage:
- Save: POST to /api/zad/save with {app_id, participant_id, action_type, content_data}
- Load: GET from /api/zad/load?app_id=X&action_type=Y
- NEVER use direct Supabase access
- ALWAYS include action_type for filtering
- ALWAYS filter load results by participant_id

Create the app in the apps/ directory, then deploy with: node scripts/safe-deploy-app.js apps/[filename].html
This will: 1) Save to git, 2) Create commit, 3) Deploy to Supabase

You're in: /Users/bartdecrem/Documents/code/vibeceo8/sms-bot/webtoys-os`;
    
    const tempFile = `/tmp/test-real-${Date.now()}.txt`;
    fs.writeFileSync(tempFile, prompt);
    
    console.log('📝 Testing with agent-like prompt...');
    console.log('📏 Prompt size:', prompt.length, 'characters');
    
    const command = `cd /Users/bartdecrem/Documents/code/vibeceo8/sms-bot/webtoys-os && cat "${tempFile}" | /Users/bartdecrem/.local/bin/claude --print --verbose --dangerously-skip-permissions`;
    
    const startTime = Date.now();
    
    try {
        const result = await execAsync(command, {
            timeout: 60000, // 60 seconds
            maxBuffer: 1024 * 1024 * 50
        });
        
        const duration = (Date.now() - startTime) / 1000;
        console.log(`✅ SUCCESS after ${duration}s`);
        console.log('Output preview (first 500 chars):');
        console.log(result.stdout.substring(0, 500));
        
    } catch (error) {
        const duration = (Date.now() - startTime) / 1000;
        console.log(`❌ FAILED after ${duration}s`);
        console.log('Error:', error.message);
        console.log('Code:', error.code);
        console.log('Signal:', error.signal);
        
        if (error.stdout) {
            console.log('\nOutput received:');
            console.log(error.stdout.substring(0, 200));
        }
    }
    
    // Clean up
    if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
}

testRealPrompt();