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

    async function addTextyToDesktop() {
        console.log('🔧 Adding TEXTY as windowed app to webtoys-os-v2...');

        try {
            // 1. First check if TEXTY app exists
            console.log('1️⃣ Checking if TEXTY app exists...');
            const { data: textyApp, error: textyError } = await supabase
                .from('wtaf_content')
                .select('app_slug, user_slug')
                .eq('user_slug', 'public')
                .eq('app_slug', 'texty')
                .single();

            if (textyError) {
                console.log('❌ TEXTY app not found in database:', textyError.message);
                console.log('⚠️  You need to create the TEXTY app first at /public/texty');
                return;
            }

            console.log('✅ TEXTY app found:', textyApp);

            // 2. Fetch current webtoys-os-v2
            console.log('2️⃣ Fetching current webtoys-os-v2...');
            const { data: current, error } = await supabase
                .from('wtaf_content')
                .select('html_content, updated_at')
                .eq('user_slug', 'public')
                .eq('app_slug', 'webtoys-os-v2')
                .single();

            if (error || !current) {
                console.error('❌ Failed to fetch webtoys-os-v2:', error);
                return;
            }

            let html = current.html_content;
            console.log('✅ Fetched webtoys-os-v2 (', html.length, 'bytes)');

            // 3. Create backup
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(__dirname, '../backups', `webtoys-os-v2_before-texty_${timestamp}.html`);
            fs.writeFileSync(backupPath, html);
            console.log('💾 Created backup:', path.basename(backupPath));

            // 4. Add TEXTY to windowedApps registry
            console.log('3️⃣ Adding TEXTY to windowedApps registry...');
            
            // Find the windowedApps object
            const windowedAppsMatch = html.match(/(window\.windowedApps\s*=\s*\{)([\s\S]*?)(\s*\};)/);
            if (!windowedAppsMatch) {
                console.error('❌ Could not find windowedApps registry in HTML');
                return;
            }

            // Check if TEXTY already exists
            if (html.includes("'texty':")) {
                console.log('⚠️  TEXTY already exists in windowedApps registry');
            } else {
                // Add TEXTY entry before the closing brace
                const textyEntry = `
            'texty': {
                name: 'TEXTY',
                url: '/public/texty',
                icon: '📄',
                width: 700,
                height: 500
            },`;

                const beforeClosing = windowedAppsMatch[1] + windowedAppsMatch[2];
                const afterClosing = windowedAppsMatch[3];
                
                // Add the entry
                const newWindowedApps = beforeClosing + textyEntry + afterClosing;
                html = html.replace(windowedAppsMatch[0], newWindowedApps);
                console.log('✅ Added TEXTY to windowedApps registry');
            }

            // 5. Add TEXTY desktop icon
            console.log('4️⃣ Adding TEXTY desktop icon...');
            
            // Check if TEXTY icon already exists
            if (html.includes('onclick="openWindowedApp(\'texty\')"')) {
                console.log('⚠️  TEXTY desktop icon already exists');
            } else {
                // Find a good place to add the icon (after other icons)
                const iconPattern = /<div class="desktop-icon"[^>]*onclick="openWindowedApp\([^)]+\)"[^>]*>[\s\S]*?<\/div>/g;
                const lastIconMatch = [...html.matchAll(iconPattern)].pop();
                
                if (lastIconMatch) {
                    const textyIcon = `
    
    <!-- TEXTY Text Editor -->
    <div class="desktop-icon" 
         style="left: 420px; top: 120px;"
         onclick="openWindowedApp('texty')"
         title="TEXTY Text Editor">
        <div class="icon">📄</div>
        <div class="label">TEXTY</div>
    </div>`;

                    const insertIndex = lastIconMatch.index + lastIconMatch[0].length;
                    html = html.slice(0, insertIndex) + textyIcon + html.slice(insertIndex);
                    console.log('✅ Added TEXTY desktop icon');
                } else {
                    console.error('❌ Could not find location to insert desktop icon');
                }
            }

            // 6. Update database
            console.log('5️⃣ Updating webtoys-os-v2 in database...');
            const { error: updateError } = await supabase
                .from('wtaf_content')
                .update({ 
                    html_content: html,
                    updated_at: new Date().toISOString()
                })
                .eq('user_slug', 'public')
                .eq('app_slug', 'webtoys-os-v2');

            if (updateError) {
                console.error('❌ Update failed:', updateError);
                return;
            }

            console.log('✅ Successfully added TEXTY to webtoys-os-v2!');
            console.log('🔗 Live at: https://webtoys.ai/public/webtoys-os-v2');

            // 7. Save updated version locally
            const updatedPath = path.join(__dirname, '../current-webtoys-os-v2-with-texty.html');
            fs.writeFileSync(updatedPath, html);
            console.log('💾 Saved updated version to:', path.basename(updatedPath));

        } catch (error) {
            console.error('❌ Error:', error);
        }
    }

    // Run the update
    await addTextyToDesktop();
}, 100);