#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

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

    async function forceAddToyboxIssueTracker() {
        console.log('🔧 FORCE adding toybox-issue-tracker to webtoys-os-v2...');

        try {
            // Fetch current webtoys-os-v2
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
            console.log('📄 Fetched webtoys-os-v2 from database');
            
            // Create backup
            const backupPath = path.join(__dirname, '../backups', `webtoys-os-v2_FORCE_${new Date().toISOString().replace(/[:.]/g, '-')}.html`);
            fs.writeFileSync(backupPath, html);
            console.log('💾 Created backup:', path.basename(backupPath));

            // Check current state
            const hasToyboxIcon = html.includes('onclick="openWindowedApp(\'toybox-issue-tracker\')"');
            const hasWebtoysosIcon = html.includes('onclick="openWindowedApp(\'webtoysos-issue-tracker\')"');
            
            console.log('Current state:');
            console.log('  toybox-issue-tracker icon:', hasToyboxIcon ? '✅ Present' : '❌ Missing');
            console.log('  webtoysos-issue-tracker icon:', hasWebtoysosIcon ? '✅ Present' : '❌ Missing');

            // Step 1: Ensure toybox-issue-tracker is in windowedApps
            if (!html.includes("'toybox-issue-tracker':")) {
                console.log('Adding toybox-issue-tracker to windowedApps...');
                
                const windowedAppsPattern = /(window\.windowedApps = \{[^}]*)(}\s*;)/s;
                html = html.replace(windowedAppsPattern, (match, p1, p2) => {
                    return p1 + `,
            'toybox-issue-tracker': {
                name: 'Issue Tracker (TB)',
                url: '/public/toybox-issue-tracker',
                icon: '🐛',
                width: 900,
                height: 700
            }` + p2;
                });
                console.log('✅ Added to windowedApps');
            }

            // Step 2: Add the desktop icon if missing
            if (!hasToyboxIcon) {
                console.log('Adding toybox-issue-tracker desktop icon...');
                
                // Find a good spot - after webtoysos-issue-tracker if it exists, or after App Studio
                let inserted = false;
                
                // Try to insert after webtoysos-issue-tracker
                if (hasWebtoysosIcon) {
                    const pattern = /(<div class="desktop-icon"[^>]*onclick="openWindowedApp\('webtoysos-issue-tracker'\)"[^>]*>[\s\S]*?<\/div>\s*<\/div>)/;
                    html = html.replace(pattern, (match) => {
                        inserted = true;
                        return match + `
        <div class="desktop-icon" onclick="openWindowedApp('toybox-issue-tracker')">
            <div class="icon">🐛</div>
            <div class="label">Issues (TB)</div>
        </div>`;
                    });
                }
                
                // If not inserted yet, try after App Studio
                if (!inserted) {
                    const appStudioPattern = /(<div class="desktop-icon"[^>]*onclick="openWindowedApp\('app-studio'\)"[^>]*>[\s\S]*?<\/div>\s*<\/div>)/;
                    html = html.replace(appStudioPattern, (match) => {
                        inserted = true;
                        return match + `
        <div class="desktop-icon" onclick="openWindowedApp('toybox-issue-tracker')">
            <div class="icon">🐛</div>
            <div class="label">Issues (TB)</div>
        </div>`;
                    });
                }
                
                // Last resort: add before the closing div of desktop
                if (!inserted) {
                    const desktopPattern = /(<div id="desktop"[^>]*>[\s\S]*?)(<\/div>\s*<!--\s*Window)/;
                    html = html.replace(desktopPattern, (match, p1, p2) => {
                        inserted = true;
                        return p1 + `
        <div class="desktop-icon" onclick="openWindowedApp('toybox-issue-tracker')">
            <div class="icon">🐛</div>
            <div class="label">Issues (TB)</div>
        </div>
        ` + p2;
                    });
                }
                
                console.log(inserted ? '✅ Added desktop icon' : '❌ Failed to add desktop icon');
            }

            // Save the updated HTML
            console.log('💾 Saving to database...');
            const { error: updateError } = await supabase
                .from('wtaf_content')
                .update({ html_content: html })
                .eq('user_slug', 'public')
                .eq('app_slug', 'webtoys-os-v2');

            if (updateError) {
                console.error('❌ Failed to update:', updateError);
                return;
            }

            console.log('✅ FORCE UPDATE COMPLETE!');
            console.log('');
            console.log('The toybox-issue-tracker should now be visible:');
            console.log('  🐛 Icon: Bug emoji');
            console.log('  📝 Label: "Issues (TB)"');
            console.log('  🔗 Opens: /public/toybox-issue-tracker');
            console.log('');
            console.log('Please HARD REFRESH: https://webtoys.ai/public/webtoys-os-v2');
            console.log('(Cmd+Shift+R on Mac, Ctrl+Shift+R on PC)');

        } catch (error) {
            console.error('❌ Error:', error);
        }
    }

    forceAddToyboxIssueTracker();
}, 100);