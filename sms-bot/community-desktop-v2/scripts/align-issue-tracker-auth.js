#!/usr/bin/env node

/**
 * Align Issue Tracker authentication with Chat app pattern
 * - Use currentUser instead of window.toyboxUser
 * - Load auth from localStorage on startup
 * - Properly handle auth updates via postMessage
 * - Use currentUser.handle consistently
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });
if (!process.env.SUPABASE_URL) {
    dotenv.config({ path: path.join(__dirname, '../../.env') });
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function alignIssueTrackerAuth() {
    try {
        console.log('🔄 Aligning Issue Tracker authentication with Chat app pattern...');
        
        // Fetch current Issue Tracker
        const { data } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        let html = data.html_content;
        
        // Backup
        const backupPath = path.join(__dirname, '..', 'backups', `issue-tracker_before_auth_align_${Date.now()}.html`);
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.writeFile(backupPath, html);
        console.log(`📁 Backup saved to: ${backupPath}`);
        
        // Step 1: Change window.toyboxUser to currentUser throughout
        console.log('📝 Changing window.toyboxUser to currentUser...');
        html = html.replace(/window\.toyboxUser/g, 'currentUser');
        
        // Step 2: Add proper initialization at the top of the script
        const scriptStart = '<script>';
        const newInit = `<script>
        // Configuration
        window.APP_ID = 'toybox-issue-tracker';
        
        // Global user variable (following Chat app pattern)
        let currentUser = null;`;
        
        if (!html.includes('let currentUser')) {
            html = html.replace(scriptStart, newInit);
            console.log('✅ Added proper currentUser initialization');
        }
        
        // Step 3: Add loadAuth function from localStorage (like Chat app)
        const loadAuthFunction = `
        // Get auth from localStorage (shared with ToyBox OS)
        function loadAuth() {
            const savedUser = localStorage.getItem('toybox_user');
            if (savedUser) {
                try {
                    currentUser = JSON.parse(savedUser);
                    console.log('Issue Tracker loaded user:', currentUser);
                    updateCurrentUserInfo();
                } catch (e) {
                    console.error('Failed to parse user:', e);
                    updateCurrentUserInfo();
                }
            } else {
                updateCurrentUserInfo();
            }
        }`;
        
        // Insert loadAuth function after APP_ID if not already present
        if (!html.includes('function loadAuth()')) {
            const insertPoint = "window.APP_ID = 'toybox-issue-tracker';";
            const insertIndex = html.indexOf(insertPoint);
            if (insertIndex > -1) {
                const endOfLine = html.indexOf('\n', insertIndex);
                html = html.slice(0, endOfLine + 1) + loadAuthFunction + html.slice(endOfLine + 1);
                console.log('✅ Added loadAuth function');
            }
        }
        
        // Step 4: Update the message listener to match Chat app pattern
        const oldListener = `window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'TOYBOX_AUTH') {
                currentUser = event.data.user;
                console.log('ToyBox OS user authenticated:', currentUser);
                const userDisplay = document.getElementById('userDisplay');
                if (userDisplay && currentUser) {
                    userDisplay.textContent = \`Logged in as: \${currentUser?.handle || currentUser}\`;
                }
            }
        });`;
        
        const newListener = `// Listen for auth changes from ToyBox OS (following Chat pattern)
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'TOYBOX_AUTH') {
                console.log('Issue Tracker received auth update:', event.data.user);
                if (event.data.user) {
                    currentUser = event.data.user;
                    updateCurrentUserInfo();
                } else {
                    currentUser = null;
                    updateCurrentUserInfo();
                }
            }
        });`;
        
        // Replace the listener if found
        if (html.includes('TOYBOX_AUTH')) {
            // Find and replace the existing listener
            const listenerRegex = /window\.addEventListener\('message'[^}]*TOYBOX_AUTH[^}]*\}\s*\);/s;
            html = html.replace(listenerRegex, newListener);
            console.log('✅ Updated message listener to match Chat pattern');
        }
        
        // Step 5: Add initialization on DOM load (like Chat app)
        const domLoadInit = `
        // Initialize on page load (following Chat pattern)
        window.addEventListener('DOMContentLoaded', function() {
            loadAuth();  // Load from localStorage first
            loadRecentUpdates();  // Load issues
            updateLastIssueInfo();  // Update issue counter
        });`;
        
        // Replace or add DOMContentLoaded listener
        if (html.includes('loadRecentUpdates();') && !html.includes('DOMContentLoaded')) {
            // Find where loadRecentUpdates is called and wrap it properly
            const oldStartup = `// Load on startup
        loadRecentUpdates();`;
            const newStartup = domLoadInit;
            
            html = html.replace(oldStartup, newStartup);
            console.log('✅ Added proper DOMContentLoaded initialization');
        }
        
        // Step 6: Ensure submittedBy uses currentUser.handle correctly
        const oldSubmittedBy = /submittedBy:\s*currentUser\?\.handle \|\| currentUser \|\| 'anonymous'/g;
        const newSubmittedBy = "submittedBy: currentUser?.handle || 'anonymous'";
        
        html = html.replace(oldSubmittedBy, newSubmittedBy);
        console.log('✅ Fixed submittedBy to use currentUser.handle');
        
        // Step 7: Update participant_id to match
        const oldParticipantId = /participant_id:\s*currentUser\?\.handle \|\| currentUser \|\| 'anonymous'/g;
        const newParticipantId = "participant_id: currentUser?.handle || 'anonymous'";
        
        html = html.replace(oldParticipantId, newParticipantId);
        console.log('✅ Fixed participant_id to use currentUser.handle');
        
        // Step 8: Update the user info display function
        const updateUserInfoPattern = /const username = currentUser\?\.handle \|\| currentUser;/g;
        const newUserInfoPattern = "const username = currentUser?.handle;";
        
        html = html.replace(updateUserInfoPattern, newUserInfoPattern);
        
        // Step 9: Ensure BART check uses handle properly
        const bartCheckOld = /const username = currentUser\?\.handle \|\| currentUser;\s*if \(username === 'BART'\)/;
        const bartCheckNew = `const username = currentUser?.handle;
            if (username === 'BART')`;
        
        html = html.replace(bartCheckOld, bartCheckNew);
        console.log('✅ Fixed BART admin check');
        
        // Update in Supabase
        const { error } = await supabase
            .from('wtaf_content')
            .update({
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker');
        
        if (error) throw error;
        
        console.log('\n✅ Issue Tracker authentication aligned with Chat app!');
        console.log('\n🎯 What was changed:');
        console.log('  • Now uses currentUser variable (not window.toyboxUser)');
        console.log('  • Loads auth from localStorage on startup');
        console.log('  • Properly handles auth updates via postMessage');
        console.log('  • Uses currentUser.handle consistently');
        console.log('  • Follows exact same pattern as ToyBox Chat');
        console.log('\n🔄 Reload Issue Tracker to test authentication!');
        console.log('  • https://webtoys.ai/public/toybox-issue-tracker');
        console.log('\nWhen logged in, your username will appear on created tickets.');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

alignIssueTrackerAuth();