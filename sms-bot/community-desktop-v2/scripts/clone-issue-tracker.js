#!/usr/bin/env node

/**
 * Clone issue-tracker from webtoys.ai/bart/issue-tracker and adapt for ToyBox OS
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

async function cloneIssueTracker() {
    try {
        console.log('📋 Cloning issue-tracker app...');
        
        // Fetch the issue-tracker app
        const { data: issueTrackerData, error: fetchError } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'bart')
            .eq('app_slug', 'issue-tracker')
            .single();
        
        if (fetchError || !issueTrackerData) {
            console.error('❌ Could not fetch issue-tracker:', fetchError);
            return;
        }
        
        console.log('✅ Found issue-tracker app');
        
        let html = issueTrackerData.html_content;
        
        // Save original for reference
        const originalPath = path.join(__dirname, '..', 'backups', `issue-tracker_original_${Date.now()}.html`);
        await fs.writeFile(originalPath, html);
        console.log(`💾 Saved original to ${originalPath}`);
        
        // Minimal changes for ToyBox OS:
        
        // 1. Update the title
        html = html.replace(
            /<title>.*?<\/title>/,
            '<title>ToyBox OS Issue Tracker</title>'
        );
        
        // 2. Update the header
        html = html.replace(
            /<h1[^>]*>.*?<\/h1>/,
            '<h1>🐛 ToyBox OS Issue Tracker</h1>'
        );
        
        // 3. Update any references to what it's tracking
        html = html.replace(
            /Track and manage issues/gi,
            'Track and manage ToyBox OS issues'
        );
        
        // 4. Update the app description if present
        html = html.replace(
            /Submit bugs, feature requests/gi,
            'Submit ToyBox OS bugs, feature requests'
        );
        
        // 5. Add ToyBox OS context to any agent prompts
        html = html.replace(
            /agent-issue-tracker/g,
            'toybox-os-issue-tracker'
        );
        
        // 6. Make sure it has proper ZAD configuration for ToyBox
        if (html.includes('window.APP_ID')) {
            html = html.replace(
                /window\.APP_ID\s*=\s*['"][^'"]*['"]/,
                "window.APP_ID = 'toybox-issue-tracker'"
            );
        } else {
            // Add APP_ID if missing
            html = html.replace(
                '<script>',
                `<script>
        window.APP_ID = 'toybox-issue-tracker';`
            );
        }
        
        // 7. Update any webhook or API endpoints to point to ToyBox OS context
        html = html.replace(
            /\/api\/webhook\/agent-issue-tracker/g,
            '/api/webhook/toybox-os-issue-tracker'
        );
        
        // 8. Add ToyBox OS compatibility
        const toyboxCompatibility = `
        // ToyBox OS compatibility
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'TOYBOX_AUTH') {
                window.toyboxUser = event.data.user;
                console.log('ToyBox OS user:', window.toyboxUser);
            }
        });`;
        
        if (!html.includes('TOYBOX_AUTH')) {
            html = html.replace(
                '</script>',
                toyboxCompatibility + '\n    </script>'
            );
        }
        
        // 9. Update styling to fit ToyBox OS window better
        html = html.replace(
            'body {',
            `body {
            margin: 0;
            padding: 10px;
            height: 100vh;
            overflow-y: auto;`
        );
        
        // Save the adapted version
        const adaptedPath = path.join(__dirname, '..', 'backups', `toybox-issue-tracker_${Date.now()}.html`);
        await fs.writeFile(adaptedPath, html);
        console.log(`💾 Saved adapted version to ${adaptedPath}`);
        
        // Upload to Supabase as toybox-issue-tracker
        const { error: insertError } = await supabase
            .from('wtaf_content')
            .upsert({
                user_slug: 'public',
                app_slug: 'toybox-issue-tracker',
                html_content: html,
                original_prompt: 'ToyBox OS Issue Tracker - Submit bugs and feature requests for ToyBox OS',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
        
        if (insertError) {
            console.error('❌ Failed to save to Supabase:', insertError);
            return;
        }
        
        console.log('✅ ToyBox Issue Tracker saved to Supabase');
        
        // Now update ToyBox OS to register this app
        const { data: toyboxData } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os')
            .single();
        
        let toyboxHtml = toyboxData.html_content;
        
        // Backup ToyBox OS
        const toyboxBackup = path.join(__dirname, '..', 'backups', `toybox_before_issue_tracker_${Date.now()}.html`);
        await fs.writeFile(toyboxBackup, toyboxHtml);
        
        // Add to windowedApps registry
        const appRegistration = `
            'toybox-issue-tracker': {
                name: 'Issue Tracker',
                url: '/public/toybox-issue-tracker',
                icon: '🐛',
                width: 700,
                height: 600
            },`;
        
        // Insert after window.windowedApps = {
        toyboxHtml = toyboxHtml.replace(
            'window.windowedApps = {',
            `window.windowedApps = {${appRegistration}`
        );
        
        // Add desktop icon next to App Studio
        const desktopIcon = `
        <div class="desktop-icon" onclick="openWindowedApp('toybox-issue-tracker')">
            <div class="icon">🐛</div>
            <div class="label">Issues</div>
        </div>`;
        
        // Find App Studio icon and add after it
        const appStudioPattern = /<div class="desktop-icon"[^>]*onclick="openWindowedApp\('app-studio'\)"[^>]*>[\s\S]*?<\/div>\s*<\/div>/;
        const appStudioMatch = toyboxHtml.match(appStudioPattern);
        
        if (appStudioMatch) {
            toyboxHtml = toyboxHtml.replace(
                appStudioMatch[0],
                appStudioMatch[0] + desktopIcon
            );
        } else {
            // If App Studio not found, add before the closing desktop div
            toyboxHtml = toyboxHtml.replace(
                '    </div>\n    \n    <!-- Menu Bar -->',
                desktopIcon + '\n    </div>\n    \n    <!-- Menu Bar -->'
            );
        }
        
        // Update ToyBox OS
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({
                html_content: toyboxHtml,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os');
        
        if (updateError) {
            console.error('❌ Failed to update ToyBox OS:', updateError);
            return;
        }
        
        console.log('✅ ToyBox OS updated with Issue Tracker!');
        console.log('\n📋 Issue Tracker is now available:');
        console.log('  • Icon: 🐛 "Issues" on desktop');
        console.log('  • Alternative to App Studio for tracking issues');
        console.log('  • Specifically for ToyBox OS bugs/features');
        console.log('  • URL: https://webtoys.ai/public/toybox-issue-tracker');
        console.log('\n🔄 Reload ToyBox OS to see the new Issue Tracker!');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

cloneIssueTracker();