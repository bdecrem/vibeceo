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

    async function checkCurrentDesktop() {
        console.log('🔍 Checking current webtoys-os-v2 in database...');

        try {
            // Fetch webtoys-os-v2 from database
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

            const html = data.html_content;
            console.log('✅ Fetched webtoys-os-v2 from database');
            console.log('📏 HTML size:', html.length, 'bytes');

            // Save current version for inspection
            const currentPath = path.join(__dirname, '../current-webtoys-os-v2-from-db.html');
            fs.writeFileSync(currentPath, html);
            console.log('💾 Saved current version to:', path.basename(currentPath));

            // Check for toybox-issue-tracker
            console.log('\n🔍 Checking for toybox-issue-tracker...');
            
            // Check in windowedApps registry
            const hasInRegistry = html.includes("'toybox-issue-tracker'");
            console.log(hasInRegistry ? '✅ Found in windowedApps registry' : '❌ NOT found in windowedApps registry');
            
            // Check for desktop icon
            const hasIcon = html.includes('onclick="openWindowedApp(\'toybox-issue-tracker\')"');
            console.log(hasIcon ? '✅ Found desktop icon' : '❌ NO desktop icon found');

            // Check for webtoysos-issue-tracker
            console.log('\n🔍 Checking for webtoysos-issue-tracker...');
            const hasWebtoysosRegistry = html.includes("'webtoysos-issue-tracker'");
            console.log(hasWebtoysosRegistry ? '✅ Found in windowedApps registry' : '❌ NOT found in windowedApps registry');
            
            const hasWebtoysosIcon = html.includes('onclick="openWindowedApp(\'webtoysos-issue-tracker\')"');
            console.log(hasWebtoysosIcon ? '✅ Found desktop icon' : '❌ NO desktop icon found');

            // Extract and show windowedApps entries
            const windowedAppsMatch = html.match(/window\.windowedApps = \{([^}]+)\}/s);
            if (windowedAppsMatch) {
                const apps = windowedAppsMatch[1];
                const appNames = apps.match(/'([^']+)':/g);
                console.log('\n📋 All apps in windowedApps registry:');
                if (appNames) {
                    appNames.forEach(app => {
                        console.log('  -', app.replace(/['":]/g, ''));
                    });
                }
            }

            // Count desktop icons
            const iconCount = (html.match(/onclick="openWindowedApp\([^)]+\)"/g) || []).length;
            console.log('\n🎯 Total desktop icons with openWindowedApp:', iconCount);

            if (!hasInRegistry || !hasIcon) {
                console.log('\n⚠️  toybox-issue-tracker is NOT properly configured!');
                console.log('Need to add it to the desktop.');
            } else {
                console.log('\n✅ toybox-issue-tracker is properly configured!');
            }

        } catch (error) {
            console.error('❌ Error:', error);
        }
    }

    // Run the check
    checkCurrentDesktop();
}, 100);