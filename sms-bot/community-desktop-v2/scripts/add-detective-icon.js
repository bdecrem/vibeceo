#!/usr/bin/env node

/**
 * Add Detective's Case Files icon to WebtoysOS desktop
 * Following the ADDING-APPS-TO-WEBTOYS-OS-V2.md guide
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { fetchCurrentToyBoxOS, safeUpdateToyBoxOS } from './safe-update-wrapper.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
let result = dotenv.config({ path: path.join(__dirname, '../../.env.local') });
if (result.error) {
    result = dotenv.config({ path: path.join(__dirname, '../../.env') });
    if (result.error) {
        console.error('Error loading .env files:', result.error.message);
        process.exit(1);
    }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function addDetectiveIcon() {
    try {
        console.log('🔍 Adding Detective\'s Case Files icon to desktop...');
        
        // 1. Verify the app exists
        const { data: app, error: appError } = await supabase
            .from('wtaf_content')
            .select('app_slug, user_slug')
            .eq('user_slug', 'public')
            .eq('app_slug', 'detective-mystery')
            .single();

        if (appError) {
            console.error('❌ Detective app not found in database:', appError.message);
            return;
        }
        
        console.log('✅ Detective app found in database');
        
        // 2. Fetch current HTML from database
        const current = await fetchCurrentToyBoxOS();
        let html = current.html_content;
        
        // 3. Check if already has the icon
        if (html.includes('onclick="openWindowedApp(\'detective-mystery\')"')) {
            console.log('⚠️ Detective icon already exists in HTML');
            return;
        }
        
        // 4. Add HTML desktop icon INSIDE #desktop div
        // According to the guide, we need to place it inside #desktop div
        const desktopDivPattern = /<div id="desktop">\s*/;
        const desktopMatch = html.match(desktopDivPattern);
        
        if (desktopMatch) {
            const insertPoint = desktopMatch.index + desktopMatch[0].length;
            
            // Choose a safe position (620px, 240px) - right side, middle row
            const iconHTML = `
    <!-- Detective's Case Files -->
    <div class="desktop-icon" 
         style="left: 620px; top: 240px;"
         onclick="openWindowedApp('detective-mystery')"
         title="Detective's Case Files">
        <div class="icon">🔍</div>
        <div class="label">Detective's Case Files</div>
    </div>
`;
            
            html = html.slice(0, insertPoint) + iconHTML + html.slice(insertPoint);
            console.log('✅ Added desktop icon inside #desktop div at position (620, 240)');
        } else {
            console.error('❌ Could not find #desktop div');
            return;
        }
        
        // 5. Update database with safe wrapper
        await safeUpdateToyBoxOS(html, 'Added Detective\'s Case Files desktop icon');
        
        // 6. Add to layout data system
        console.log('📊 Adding to layout data system...');
        
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
            icons.detective = {
                x: 620,
                y: 240,
                visible: true,
                label: "Detective's Case Files"
            };

            await supabase
                .from('wtaf_zero_admin_collaborative')
                .insert({
                    app_id: 'toybox-desktop-layout',
                    participant_id: 'global',
                    action_type: 'desktop_state',
                    content_data: {
                        ...layoutData[0].content_data,
                        icons: icons,
                        lastModified: new Date().toISOString(),
                        modifiedBy: 'add-detective-icon-script'
                    }
                });
                
            console.log('✅ Added to layout data system');
        } else {
            console.log('⚠️ No existing layout data found, creating new entry');
            
            await supabase
                .from('wtaf_zero_admin_collaborative')
                .insert({
                    app_id: 'toybox-desktop-layout',
                    participant_id: 'global',
                    action_type: 'desktop_state',
                    content_data: {
                        icons: {
                            detective: {
                                x: 620,
                                y: 240,
                                visible: true,
                                label: "Detective's Case Files"
                            }
                        },
                        lastModified: new Date().toISOString(),
                        modifiedBy: 'add-detective-icon-script'
                    }
                });
                
            console.log('✅ Created new layout data entry');
        }
        
        console.log('✨ Desktop icon added successfully!');
        console.log('📱 The Detective app should now appear on your WebtoysOS desktop');
        console.log('🔗 Live at: https://webtoys.ai/public/toybox-os');
        
    } catch (error) {
        console.error('Error adding icon:', error);
        process.exit(1);
    }
}

// Run the update
addDetectiveIcon();