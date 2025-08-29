#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

setTimeout(async () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    async function addCalculatorToDesktop() {
        console.log('🧮 Adding Calculator to webtoys-os-v2 using our documented process...');

        try {
            // 1. Check app exists
            console.log('1️⃣ Checking if Calculator app exists...');
            const { data: app, error: appError } = await supabase
                .from('wtaf_content')
                .select('app_slug, user_slug, original_prompt')
                .eq('user_slug', 'public')
                .eq('app_slug', 'calculator')
                .single();

            if (appError) {
                console.log('❌ Calculator app not found:', appError.message);
                return;
            }
            console.log('✅ Found Calculator app:', app);

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
            const backupPath = path.join(__dirname, '../backups', `webtoys-os-v2_add-calculator_${timestamp}.html`);
            fs.writeFileSync(backupPath, html);
            console.log('💾 Created backup:', path.basename(backupPath));

            // 4. Add to windowedApps registry
            console.log('3️⃣ Adding Calculator to windowedApps registry...');
            if (!html.includes("'calculator':")) {
                const registryPattern = /(window\.windowedApps\s*=\s*\{[\s\S]*?)(\s*\};)/;
                const registryMatch = html.match(registryPattern);
                
                if (registryMatch) {
                    const appEntry = `
            'calculator': {
                name: 'Calculator',
                url: '/public/calculator',
                icon: '🧮',
                width: 320,
                height: 450
            },`;
                    
                    const newRegistry = registryMatch[1] + appEntry + registryMatch[2];
                    html = html.replace(registryMatch[0], newRegistry);
                    console.log('✅ Added Calculator to windowedApps registry');
                } else {
                    console.error('❌ Could not find windowedApps registry');
                    return;
                }
            } else {
                console.log('⚠️  Calculator already in windowedApps registry');
            }

            // 5. Add HTML desktop icon INSIDE #desktop div (using free position)
            console.log('4️⃣ Adding Calculator desktop icon...');
            if (!html.includes('onclick="openWindowedApp(\'calculator\')"')) {
                const desktopDivPattern = /<div id="desktop">\s*/;
                const desktopMatch = html.match(desktopDivPattern);
                
                if (desktopMatch) {
                    const insertPoint = desktopMatch.index + desktopMatch[0].length;
                    
                    // Use position (700, 80) - right side, top row (next to other apps)
                    const iconHTML = `
    <!-- Calculator App -->
    <div class="desktop-icon" 
         style="left: 700px; top: 80px;"
         onclick="openWindowedApp('calculator')"
         title="Calculator">
        <div class="icon">🧮</div>
        <div class="label">Calculator</div>
    </div>
`;
                    
                    html = html.slice(0, insertPoint) + iconHTML + html.slice(insertPoint);
                    console.log('✅ Added Calculator desktop icon inside #desktop div at (700, 80)');
                } else {
                    console.error('❌ Could not find #desktop div');
                    return;
                }
            } else {
                console.log('⚠️  Calculator desktop icon already exists');
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
            console.log('6️⃣ Adding Calculator to layout data...');
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
                icons.calculator = {
                    x: 700,
                    y: 80,
                    visible: true,
                    label: 'Calculator'
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
                            modifiedBy: 'add-calculator-script'
                        }
                    });
                    
                if (layoutError) {
                    console.error('❌ Layout data update failed:', layoutError);
                } else {
                    console.log('✅ Added Calculator to layout data at (700, 80) with visible: true');
                }
            } else {
                console.log('⚠️  No layout data found');
            }

            console.log('🎉 Successfully added Calculator to webtoys-os-v2!');
            console.log('📋 Calculator Summary:');
            console.log('  - Position: (700, 80) - right side, top row');
            console.log('  - Icon: 🧮');
            console.log('  - Window size: 320x450 (compact calculator size)');
            console.log('  - Opens in: Windowed iframe');
            console.log('🔗 Test at: https://webtoys.ai/public/webtoys-os-v2');

        } catch (error) {
            console.error('❌ Error:', error);
        }
    }

    await addCalculatorToDesktop();
}, 100);