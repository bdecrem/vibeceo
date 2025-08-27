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

    async function addTextyToLayoutData() {
        console.log('🔧 Adding TEXTY to toybox-desktop-layout data...');

        try {
            // 1. Get current layout data
            console.log('1️⃣ Fetching current layout data...');
            const { data: layoutData, error: layoutError } = await supabase
                .from('wtaf_zero_admin_collaborative')
                .select('*')
                .eq('app_id', 'toybox-desktop-layout')
                .eq('action_type', 'desktop_state')
                .eq('participant_id', 'global')
                .order('created_at', { ascending: false })
                .limit(1);

            if (layoutError) {
                console.error('❌ Error fetching layout data:', layoutError);
                return;
            }

            if (!layoutData || layoutData.length === 0) {
                console.log('❌ No layout data found');
                return;
            }

            const currentLayout = layoutData[0];
            console.log('✅ Found layout data from:', currentLayout.content_data?.lastModified);

            // 2. Add TEXTY to the icons
            const icons = { ...currentLayout.content_data.icons };
            
            if (icons.texty) {
                console.log('⚠️  TEXTY already exists in layout data');
                console.log('Current TEXTY:', icons.texty);
            } else {
                // Add TEXTY with visible: true and good positioning
                icons.texty = {
                    x: 420,
                    y: 120,
                    visible: true,
                    label: 'TEXTY'
                };
                console.log('✅ Added TEXTY to layout data');
            }

            // 3. Update the layout data
            console.log('2️⃣ Updating layout data...');
            const updatedContentData = {
                ...currentLayout.content_data,
                icons: icons,
                lastModified: new Date().toISOString(),
                modifiedBy: 'texty-fix-script'
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
                console.error('❌ Error saving layout data:', saveError);
                return;
            }

            console.log('✅ Successfully added TEXTY to layout data!');
            console.log('🔗 TEXTY should now be visible on the desktop');

            // 4. Show summary
            console.log('📋 TEXTY layout data:');
            console.log('  - Position:', icons.texty.x + ',' + icons.texty.y);
            console.log('  - Visible:', icons.texty.visible);
            console.log('  - Label:', icons.texty.label);

        } catch (error) {
            console.error('❌ Error:', error);
        }
    }

    await addTextyToLayoutData();
}, 100);