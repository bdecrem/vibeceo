#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import('./safe-update-wrapper.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

setTimeout(async () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    async function addFortuneCookieToDesktop() {
        console.log('🥠 Adding Fortune Cookie to webtoys-os-v2 using our documented process...');

        try {
            // 1. Check app exists
            console.log('1️⃣ Checking if Fortune Cookie app exists...');
            const { data: app, error: appError } = await supabase
                .from('wtaf_content')
                .select('app_slug, user_slug, original_prompt')
                .eq('user_slug', 'public')
                .eq('app_slug', 'fortune-cookie')
                .single();

            if (appError) {
                console.log('❌ Fortune Cookie app not found:', appError.message);
                return;
            }
            console.log('✅ Found Fortune Cookie app:', app);

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
            const backupPath = path.join(__dirname, '../backups', `webtoys-os-v2_add-fortune-cookie_${timestamp}.html`);
            fs.writeFileSync(backupPath, html);
            console.log('💾 Created backup:', path.basename(backupPath));

            // 4. Add to windowedApps registry
            console.log('3️⃣ Adding Fortune Cookie to windowedApps registry...');
            if (!html.includes("'fortune-cookie':")) {
                const registryPattern = /(window\.windowedApps\s*=\s*\{[\s\S]*?)(\s*\};)/;
                const registryMatch = html.match(registryPattern);
                
                if (registryMatch) {
                    const appEntry = `
            'fortune-cookie': {
                name: 'Fortune Cookie',
                url: '/public/fortune-cookie',
                icon: '🥠',
                width: 600,
                height: 500
            },`;
                    
                    const newRegistry = registryMatch[1] + appEntry + registryMatch[2];
                    html = html.replace(registryMatch[0], newRegistry);
                    console.log('✅ Added Fortune Cookie to windowedApps registry');
                } else {
                    console.error('❌ Could not find windowedApps registry');
                    return;
                }
            } else {
                console.log('⚠️  Fortune Cookie already in windowedApps registry');
            }

            // 5. Add HTML desktop icon INSIDE #desktop div (using free position)
            console.log('4️⃣ Adding Fortune Cookie desktop icon...');
            if (!html.includes('onclick="openWindowedApp(\'fortune-cookie\')"')) {
                const desktopDivPattern = /<div id="desktop">\s*/;
                const desktopMatch = html.match(desktopDivPattern);
                
                if (desktopMatch) {
                    const insertPoint = desktopMatch.index + desktopMatch[0].length;
                    
                    // Use position (760, 80) - right side, top row
                    const iconHTML = `
    <!-- Fortune Cookie App -->
    <div class="desktop-icon" 
         style="left: 760px; top: 80px;"
         onclick="openWindowedApp('fortune-cookie')"
         title="Fortune Cookie - Click cookies to reveal fortunes">
        <div class="icon">🥠</div>
        <div class="label">Fortune Cookie</div>
    </div>
`;
                    
                    html = html.slice(0, insertPoint) + iconHTML + html.slice(insertPoint);
                    console.log('✅ Added Fortune Cookie desktop icon inside #desktop div at (760, 80)');
                } else {
                    console.error('❌ Could not find #desktop div');
                    return;
                }
            } else {
                console.log('⚠️  Fortune Cookie desktop icon already exists');
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
            console.log('6️⃣ Adding Fortune Cookie to layout data...');
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
                icons['fortune-cookie'] = {
                    x: 760,
                    y: 80,
                    visible: true,
                    label: 'Fortune Cookie'
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
                            modifiedBy: 'add-fortune-cookie-script'
                        }
                    });
                    
                if (layoutError) {
                    console.error('❌ Layout data update failed:', layoutError);
                } else {
                    console.log('✅ Added Fortune Cookie to layout data at (760, 80) with visible: true');
                }
            } else {
                console.log('⚠️  No layout data found');
            }

            console.log('🎉 Successfully added Fortune Cookie to webtoys-os-v2!');
            console.log('📋 Fortune Cookie Summary:');
            console.log('  - Position: (760, 80) - right side, top row');
            console.log('  - Icon: 🥠');
            console.log('  - Opens in: Windowed iframe (600x500)');
            console.log('  - Features: Interactive fortune cookies, favorites, stats');
            console.log('🔗 Test at: https://webtoys.ai/public/webtoys-os-v2');
            console.log('🔗 Direct app: https://webtoys.ai/public/fortune-cookie');

        } catch (error) {
            console.error('❌ Error:', error);
        }
    }

    await addFortuneCookieToDesktop();
}, 100);