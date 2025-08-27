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

    async function deployAndAddBDwords() {
        console.log('📝 Deploying BDwords text editor...\n');

        try {
            // Step 1: Deploy BDwords to database
            console.log('1️⃣ Deploying BDwords to database...');
            const htmlPath = path.join(__dirname, '../apps/bdwords.html');
            const html = fs.readFileSync(htmlPath, 'utf8');
            console.log(`   📄 Read bdwords.html (${html.length} bytes)`);

            // Check if exists
            const { data: existing } = await supabase
                .from('wtaf_content')
                .select('app_slug')
                .eq('user_slug', 'public')
                .eq('app_slug', 'toybox-bdwords')
                .single();

            if (existing) {
                // Update
                const { error } = await supabase
                    .from('wtaf_content')
                    .update({
                        html_content: html,
                        original_prompt: 'BDwords - Text editor for WebtoysOS'
                    })
                    .eq('user_slug', 'public')
                    .eq('app_slug', 'toybox-bdwords');
                
                if (error) throw error;
                console.log('   ✅ Updated existing BDwords app');
            } else {
                // Insert
                const { error } = await supabase
                    .from('wtaf_content')
                    .insert({
                        user_slug: 'public',
                        app_slug: 'toybox-bdwords',
                        html_content: html,
                        original_prompt: 'BDwords - Text editor for WebtoysOS'
                    });
                
                if (error) throw error;
                console.log('   ✅ Created new BDwords app');
            }

            // Step 2: Add to webtoys-os-v2 desktop
            console.log('\n2️⃣ Adding BDwords to desktop...');
            
            const { data: desktop, error: desktopError } = await supabase
                .from('wtaf_content')
                .select('*')
                .eq('user_slug', 'public')
                .eq('app_slug', 'webtoys-os-v2')
                .single();

            if (desktopError || !desktop) {
                console.error('   ❌ Failed to fetch webtoys-os-v2:', desktopError);
                return;
            }

            let desktopHtml = desktop.html_content;
            
            // Backup
            const backupPath = path.join(__dirname, '../backups', `webtoys-os-v2_bdwords_${new Date().toISOString().replace(/[:.]/g, '-')}.html`);
            fs.writeFileSync(backupPath, desktopHtml);
            console.log('   💾 Created backup');

            // Add to windowedApps if needed
            if (!desktopHtml.includes("'toybox-bdwords'")) {
                const windowedAppsPattern = /(window\.windowedApps = \{[^}]*)(}\s*;)/s;
                desktopHtml = desktopHtml.replace(windowedAppsPattern, (match, p1, p2) => {
                    return p1 + `,
            'toybox-bdwords': {
                name: 'BDwords',
                url: '/public/toybox-bdwords',
                icon: '📄',
                width: 800,
                height: 600
            }` + p2;
                });
                console.log('   ✅ Added to windowedApps registry');
            }

            // Add desktop icon if needed
            if (!desktopHtml.includes('onclick="openWindowedApp(\'toybox-bdwords\')"')) {
                // Add after Text Editor or App Studio
                const textEditorPattern = /(<div class="desktop-icon"[^>]*onclick="openWindowedApp\('toybox-text-editor'\)"[^>]*>.*?<\/div>\s*<\/div>)/s;
                const appStudioPattern = /(<div class="desktop-icon"[^>]*onclick="openWindowedApp\('app-studio'\)"[^>]*>.*?<\/div>\s*<\/div>)/s;
                
                const bdwordsIcon = `
        <div class="desktop-icon" onclick="openWindowedApp('toybox-bdwords')">
            <div class="icon">📄</div>
            <div class="label">BDwords</div>
        </div>`;

                if (desktopHtml.match(textEditorPattern)) {
                    desktopHtml = desktopHtml.replace(textEditorPattern, (match) => match + bdwordsIcon);
                    console.log('   ✅ Added desktop icon after Text Editor');
                } else if (desktopHtml.match(appStudioPattern)) {
                    desktopHtml = desktopHtml.replace(appStudioPattern, (match) => match + bdwordsIcon);
                    console.log('   ✅ Added desktop icon after App Studio');
                } else {
                    console.log('   ⚠️ Could not find location for desktop icon');
                }
            }

            // Save updated desktop
            const { error: updateError } = await supabase
                .from('wtaf_content')
                .update({ html_content: desktopHtml })
                .eq('user_slug', 'public')
                .eq('app_slug', 'webtoys-os-v2');

            if (updateError) {
                console.error('   ❌ Failed to update desktop:', updateError);
                return;
            }

            console.log('   ✅ Updated webtoys-os-v2 desktop');

            // Success message
            console.log('\n✅ BDwords successfully deployed!');
            console.log('\n📍 Access points:');
            console.log('   • Direct: https://webtoys.ai/public/toybox-bdwords');
            console.log('   • Desktop: https://webtoys.ai/public/webtoys-os-v2');
            console.log('\n📝 Features:');
            console.log('   • Line numbers');
            console.log('   • Word/character count');
            console.log('   • Find & Replace');
            console.log('   • Multiple documents');
            console.log('   • Keyboard shortcuts');

        } catch (error) {
            console.error('❌ Error:', error);
        }
    }

    deployAndAddBDwords();
}, 100);