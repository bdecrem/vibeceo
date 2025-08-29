#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment through safe wrapper
import('./safe-update-wrapper.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

setTimeout(async () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing required environment variables');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    async function addIssueTrackerToDesktop() {
        console.log('🖥️ Adding Issue Tracker to WebtoysOS v2 desktop...');

        try {
            // Fetch webtoys-os-v2 from database
            console.log('📱 Fetching webtoys-os-v2 from database...');
            const { data, error } = await supabase
                .from('wtaf_content')
                .select('*')
                .eq('user_slug', 'public')
                .eq('app_slug', 'webtoys-os-v2')
                .single();

            if (error || !data) {
                console.error('❌ Failed to fetch webtoys-os-v2:', error);
                return;
            }

            let html = data.html_content;
            console.log('✅ Fetched webtoys-os-v2 from database');

            // Create a backup first
            const backupPath = path.join(__dirname, '../backups', `webtoys-os-v2_${new Date().toISOString().replace(/[:.]/g, '-')}.html`);
            fs.writeFileSync(backupPath, html);
            console.log('💾 Created backup:', path.basename(backupPath));

            // Step 1: Add to windowedApps registry
            console.log('📝 Adding toybox-issue-tracker to windowedApps registry...');
            
            // Find the windowedApps object
            const windowedAppsPattern = /window\.windowedApps = \{([^}]+)\}/s;
            const match = html.match(windowedAppsPattern);
            
            if (!match) {
                console.error('❌ Could not find window.windowedApps registry');
                return;
            }

            // Check if issue tracker already exists
            if (html.includes("'toybox-issue-tracker'") || html.includes('"toybox-issue-tracker"')) {
                console.log('ℹ️ Issue Tracker already exists in windowedApps registry');
            } else {
                // Add the issue tracker to windowedApps
                const newWindowedApps = match[0].replace(
                    '};',
                    `,
            'toybox-issue-tracker': {
                name: 'Issue Tracker',
                url: '/public/toybox-issue-tracker',
                icon: '🐛',
                width: 900,
                height: 700
            }
        };`
                );
                
                html = html.replace(windowedAppsPattern, newWindowedApps);
                console.log('✅ Added to windowedApps registry');
            }

            // Step 2: Add desktop icon
            console.log('🎨 Adding desktop icon for Toybox Issue Tracker...');
            
            // Check if toybox-issue-tracker icon already exists
            if (html.includes('onclick="openWindowedApp(\'toybox-issue-tracker\')"')) {
                console.log('ℹ️ Toybox Issue Tracker icon already exists on desktop');
            } else {
                // Find where to insert the icon - after the existing webtoysos-issue-tracker
                const existingIssueTrackerPattern = /<div class="desktop-icon"[^>]*onclick="openWindowedApp\('webtoysos-issue-tracker'\)"[^>]*>[\s\S]*?<\/div>\s*<\/div>/;
                const existingMatch = html.match(existingIssueTrackerPattern);
                
                if (existingMatch) {
                    // Add the new icon after the existing issue tracker
                    const toyboxIssueTrackerIcon = `
        
        <div class="desktop-icon" onclick="openWindowedApp('toybox-issue-tracker')">
            <div class="icon">🐛</div>
            <div class="label">Issue Tracker (TB)</div>
        </div>`;

                    // Insert after the existing issue tracker icon
                    const insertPosition = existingMatch.index + existingMatch[0].length;
                    html = html.slice(0, insertPosition) + toyboxIssueTrackerIcon + html.slice(insertPosition);
                    console.log('✅ Added Toybox Issue Tracker desktop icon');
                } else {
                    // Fallback: Add it at the end of the desktop area
                    const desktopAreaPattern = /<div id="desktop"[^>]*>([\s\S]*?)<\/div>\s*<!--\s*End Desktop/;
                    const desktopMatch = html.match(desktopAreaPattern);
                    
                    if (desktopMatch) {
                        const toyboxIssueTrackerIcon = `
        <div class="desktop-icon" onclick="openWindowedApp('toybox-issue-tracker')">
            <div class="icon">🐛</div>
            <div class="label">Issue Tracker (TB)</div>
        </div>
        `;
                        html = html.replace(desktopAreaPattern, (match, content) => {
                            return `<div id="desktop">${content}${toyboxIssueTrackerIcon}</div>
        <!-- End Desktop`;
                        });
                        console.log('✅ Added Toybox Issue Tracker desktop icon to desktop area');
                    } else {
                        console.error('❌ Could not find suitable location for desktop icon');
                    }
                }
            }

            // Step 3: Save the updated desktop back to database
            console.log('💾 Saving updated desktop to database...');
            const { error: updateError } = await supabase
                .from('wtaf_content')
                .update({ 
                    html_content: html
                })
                .eq('user_slug', 'public')
                .eq('app_slug', 'webtoys-os-v2');

            if (updateError) {
                console.error('❌ Failed to update webtoys-os-v2:', updateError);
                return;
            }

            console.log('✅ Successfully added Issue Tracker to WebtoysOS v2 desktop!');
            console.log('');
            console.log('The Issue Tracker is now available:');
            console.log('1. 🐛 Desktop icon labeled "Issue Tracker"');
            console.log('2. 📋 Opens in a 900x700 window');
            console.log('3. 🔗 Links to /public/toybox-issue-tracker');
            console.log('');
            console.log('Test it at: https://webtoys.ai/public/webtoys-os-v2');
            console.log('');
            console.log('Backup saved at:', path.basename(backupPath));

        } catch (error) {
            console.error('❌ Error:', error);
        }
    }

    // Run the update
    addIssueTrackerToDesktop();
}, 100);