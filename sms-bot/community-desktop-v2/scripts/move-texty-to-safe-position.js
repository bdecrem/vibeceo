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

    async function moveTextyToSafePosition() {
        console.log('🔧 Moving TEXTY to a safe, visible position...');

        try {
            // 1. Update HTML position
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

            // Create backup
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(__dirname, '../backups', `webtoys-os-v2_move-texty_${timestamp}.html`);
            fs.writeFileSync(backupPath, html);
            console.log('💾 Created backup:', path.basename(backupPath));

            // Move TEXTY to safe position in HTML (40, 320 - definitely empty space)
            html = html.replace(
                'style="left: 420px; top: 120px;"',
                'style="left: 40px; top: 320px;"'
            );
            console.log('✅ Updated TEXTY position in HTML to (40, 320)');

            // Update database
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

            // 2. Update layout data to match
            const { data: layoutData } = await supabase
                .from('wtaf_zero_admin_collaborative')
                .select('*')
                .eq('app_id', 'toybox-desktop-layout')
                .eq('action_type', 'desktop_state')
                .eq('participant_id', 'global')
                .order('created_at', { ascending: false })
                .limit(1);

            if (layoutData && layoutData[0]) {
                const currentLayout = layoutData[0];
                const icons = { ...currentLayout.content_data.icons };
                
                // Update TEXTY position in layout data
                icons.texty = {
                    x: 40,
                    y: 320,
                    visible: true,
                    label: 'TEXTY'
                };

                const updatedContentData = {
                    ...currentLayout.content_data,
                    icons: icons,
                    lastModified: new Date().toISOString(),
                    modifiedBy: 'position-fix-script'
                };

                const { error: saveError } = await supabase
                    .from('wtaf_zero_admin_collaborative')
                    .insert({
                        app_id: 'toybox-desktop-layout',
                        participant_id: 'global',
                        action_type: 'desktop_state',
                        content_data: updatedContentData
                    });

                if (saveError) {
                    console.error('❌ Layout data update failed:', saveError);
                } else {
                    console.log('✅ Updated layout data position to (40, 320)');
                }
            }

            console.log('🎯 TEXTY moved to safe position (40, 320)');
            console.log('🔗 Test at: https://webtoys.ai/public/webtoys-os-v2');

        } catch (error) {
            console.error('❌ Error:', error);
        }
    }

    await moveTextyToSafePosition();
}, 100);