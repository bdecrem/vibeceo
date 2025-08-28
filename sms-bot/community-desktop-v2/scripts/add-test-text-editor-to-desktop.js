#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing Supabase environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addTestEditorToDesktop() {
    console.log('🖥️ Adding TEST Text Editor to WebtoysOS desktop...');

    try {
        // 1. Check that TEST text editor app exists
        console.log('1️⃣ Checking if TEST text editor app exists...');
        const { data: app, error: appError } = await supabase
            .from('wtaf_content')
            .select('app_slug, user_slug, original_prompt')
            .eq('user_slug', 'public')
            .eq('app_slug', 'test-text-editor')
            .single();

        if (appError) {
            console.log('❌ TEST text editor app not found:', appError.message);
            return;
        }
        console.log('✅ Found TEST text editor app:', app);

        // 2. Get current webtoys-os-v2 HTML
        console.log('2️⃣ Fetching webtoys-os-v2...');
        const { data: current, error } = await supabase
            .from('wtaf_content')
            .select('html_content, updated_at')
            .eq('user_slug', 'public')
            .eq('app_slug', 'webtoys-os-v2')
            .single();

        if (error) {
            console.error('❌ Failed to fetch webtoys-os-v2:', error);
            return;
        }

        let html = current.html_content;
        console.log('✅ Fetched webtoys-os-v2 (', html.length, 'bytes)');

        // 3. Create backup
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupPath = path.join(__dirname, '../backups', `webtoys-os-v2_add-test-editor_${timestamp}.html`);
        fs.writeFileSync(backupPath, html);
        console.log('💾 Created backup:', path.basename(backupPath));

        // 4. Add to windowedApps registry
        console.log('3️⃣ Adding TEST text editor to windowedApps registry...');
        if (!html.includes("'test-text-editor':")) {
            const registryPattern = /(window\.windowedApps\s*=\s*\{[\s\S]*?)(\s*\};)/;
            const registryMatch = html.match(registryPattern);
            
            if (registryMatch) {
                const appEntry = `
            'test-text-editor': {
                name: 'TEST',
                url: '/public/test-text-editor',
                icon: '📝',
                width: 600,
                height: 400
            },`;
                
                const newRegistry = registryMatch[1] + appEntry + registryMatch[2];
                html = html.replace(registryMatch[0], newRegistry);
                console.log('✅ Added TEST to windowedApps registry');
            } else {
                console.error('❌ Could not find windowedApps registry');
                return;
            }
        } else {
            console.log('⚠️  TEST already in windowedApps registry');
        }

        // 5. Add HTML desktop icon INSIDE #desktop div
        console.log('4️⃣ Adding TEST desktop icon...');
        if (!html.includes('onclick="openWindowedApp(\'test-text-editor\')"')) {
            const desktopDivPattern = /<div id="desktop">\s*/;
            const desktopMatch = html.match(desktopDivPattern);
            
            if (desktopMatch) {
                const insertPoint = desktopMatch.index + desktopMatch[0].length;
                
                // Use position (720, 80) - right side, top row, next to other apps
                const iconHTML = `
    <!-- TEST Text Editor -->
    <div class="desktop-icon" 
         style="left: 720px; top: 80px;"
         onclick="openWindowedApp('test-text-editor')"
         title="TEST Text Editor">
        <div class="icon">📝</div>
        <div class="label">TEST</div>
    </div>
`;
                
                html = html.slice(0, insertPoint) + iconHTML + html.slice(insertPoint);
                console.log('✅ Added TEST desktop icon inside #desktop div at (720, 80)');
            } else {
                console.error('❌ Could not find #desktop div');
                return;
            }
        } else {
            console.log('⚠️  TEST desktop icon already exists');
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
            console.error('❌ HTML update failed:', updateError);
            return;
        }
        console.log('✅ Updated HTML in database');

        // 7. Add to layout data
        console.log('6️⃣ Adding TEST to layout data...');
        const { data: layoutData } = await supabase
            .from('wtaf_zero_admin_collaborative')
            .select('*')
            .eq('app_id', 'toybox-desktop-layout')
            .eq('action_type', 'desktop_state')
            .eq('participant_id', 'global')
            .order('created_at', { ascending: false })
            .limit(1);

        if (layoutData && layoutData[0]) {
            const icons = { ...layoutData[0].content_data.icons };
            icons['test-text-editor'] = {
                x: 720,
                y: 80,
                visible: true,
                label: 'TEST'
            };

            const { error: layoutError } = await supabase
                .from('wtaf_zero_admin_collaborative')
                .insert({
                    app_id: 'toybox-desktop-layout',
                    participant_id: 'global',
                    action_type: 'desktop_state',
                    content_data: {
                        ...layoutData[0].content_data,
                        icons: icons,
                        lastModified: new Date().toISOString(),
                        modifiedBy: 'add-test-editor-script'
                    }
                });
                
            if (layoutError) {
                console.error('❌ Layout data update failed:', layoutError);
            } else {
                console.log('✅ Added TEST to layout data at (720, 80) with visible: true');
            }
        } else {
            console.log('⚠️  No layout data found');
        }

        console.log('🎉 Successfully added TEST Text Editor to webtoys-os-v2!');
        console.log('📋 TEST Summary:');
        console.log('  - Position: (720, 80) - right side, top row');
        console.log('  - Icon: 📝');
        console.log('  - Opens in: Windowed iframe');
        console.log('🔗 Test at: https://webtoys.ai/public/webtoys-os-v2');

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

addTestEditorToDesktop();