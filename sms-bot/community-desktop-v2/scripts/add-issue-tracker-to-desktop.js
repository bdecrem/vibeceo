#!/usr/bin/env node

/**
 * Add webtoysos-issue-tracker to ToyBox OS desktop
 * This adds it to the windowedApps registry and creates a desktop icon
 */

import { fetchCurrentToyBoxOS, safeUpdateToyBoxOS } from './safe-update-wrapper.js';

async function addIssueTrackerToDesktop() {
    try {
        console.log('📥 Fetching current ToyBox OS...');
        const current = await fetchCurrentToyBoxOS();
        let html = current.html_content;
        
        console.log('🔍 Adding issue tracker to windowedApps registry...');
        
        // Check if already added
        if (html.includes("'webtoysos-issue-tracker'")) {
            console.log('⚠️ webtoysos-issue-tracker already exists in registry, skipping...');
        } else {
            // Find the windowedApps section and add the issue tracker
            // Match the entire windowedApps object more carefully
            const startIdx = html.indexOf('windowedApps = {');
            const endIdx = html.indexOf('};', startIdx);
            
            if (startIdx === -1 || endIdx === -1) {
                console.error('❌ Could not find windowedApps registry in ToyBox OS');
                return;
            }
            
            // Add the issue tracker entry before the closing brace
            const issueTrackerEntry = `,
            'webtoysos-issue-tracker': {
                name: 'Issue Tracker (Bart)',
                url: '/public/webtoysos-issue-tracker',
                icon: '🔧',
                width: 900,
                height: 700
            }`;
            
            // Insert before the closing brace
            html = html.substring(0, endIdx) + issueTrackerEntry + '\n        ' + html.substring(endIdx);
            console.log('✅ Added webtoysos-issue-tracker to registry');
        }
        
        console.log('🎯 Adding desktop icon for Issue Tracker...');
        
        // Find a good place to add the icon - let's add it after the Notepad icon
        // Look for the Community Notepad icon
        const notepadIconPattern = /(<div class="desktop-icon"[^>]*onclick="openWindowedApp\('community-notepad'\)"[^>]*>[\s\S]*?<\/div>\s*<\/div>)/;
        
        if (notepadIconPattern.test(html)) {
            // Add the Issue Tracker icon after Notepad
            const issueTrackerIcon = `
            
            <div class="desktop-icon" onclick="openWindowedApp('webtoysos-issue-tracker')">
                <div class="icon">🐛</div>
                <div class="label">Issue Tracker</div>
            </div>`;
            
            html = html.replace(notepadIconPattern, `$1${issueTrackerIcon}`);
        } else {
            // If we can't find Notepad, look for any desktop-icon and add after the first one
            const anyIconPattern = /(<div class="desktop-icon"[^>]*>[\s\S]*?<\/div>\s*<\/div>)/;
            
            if (anyIconPattern.test(html)) {
                const issueTrackerIcon = `
            
            <div class="desktop-icon" onclick="openWindowedApp('webtoysos-issue-tracker')">
                <div class="icon">🐛</div>
                <div class="label">Issue Tracker</div>
            </div>`;
                
                html = html.replace(anyIconPattern, `$1${issueTrackerIcon}`);
            } else {
                console.error('❌ Could not find a suitable place to add the desktop icon');
                return;
            }
        }
        
        console.log('💾 Saving updated ToyBox OS...');
        await safeUpdateToyBoxOS(html, 'Added Issue Tracker to desktop (webtoysos-issue-tracker)');
        
        console.log('✅ Successfully added Issue Tracker to ToyBox OS!');
        console.log('');
        console.log('📌 The Issue Tracker is now available:');
        console.log('   - Desktop icon: 🐛 Issue Tracker');
        console.log('   - Opens in a window (900x700)');
        console.log('   - URL: /public/webtoysos-issue-tracker');
        console.log('');
        console.log('🎉 You can now click the Issue Tracker icon on ToyBox OS desktop!');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Run the update
addIssueTrackerToDesktop();