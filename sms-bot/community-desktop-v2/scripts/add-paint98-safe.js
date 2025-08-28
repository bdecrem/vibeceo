#!/usr/bin/env node

import { fetchCurrentToyBoxOS, safeUpdateToyBoxOS } from './safe-update-wrapper.js';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment from safe-update-wrapper's location
dotenv.config({ path: path.join(__dirname, '../../../.env.local') });
if (!process.env.SUPABASE_URL) {
    dotenv.config({ path: path.join(__dirname, '../../../.env') });
}
if (!process.env.SUPABASE_URL) {
    dotenv.config({ path: path.join(__dirname, '../../.env.local') });
}
if (!process.env.SUPABASE_URL) {
    dotenv.config({ path: path.join(__dirname, '../../.env') });
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function addPaint98ToDesktop() {
    console.log('🎨 Adding Paint 98 to WebtoysOS desktop using safe wrapper...\n');
    
    try {
        // 1. Verify Paint 98 exists
        console.log('1️⃣  Checking if Paint 98 app exists...');
        const { data: app, error: appError } = await supabase
            .from('wtaf_content')
            .select('app_slug')
            .eq('user_slug', 'public')
            .eq('app_slug', 'paint-98')
            .single();
        
        if (!app) {
            console.log('❌ Paint 98 app not found. Please deploy it first.');
            return;
        }
        console.log('✅ Paint 98 app exists');
        
        // 2. Fetch current HTML from database
        console.log('\n2️⃣  Fetching current WebtoysOS from database...');
        const current = await fetchCurrentToyBoxOS();
        let html = current.html_content;
        console.log('✅ Fetched WebtoysOS HTML');
        
        // 3. Check if Paint 98 is already added
        if (html.includes("'paint-98'")) {
            console.log('⚠️  Paint 98 already exists in windowedApps registry');
            return;
        }
        
        // 4. Add to windowedApps registry
        console.log('\n3️⃣  Adding to windowedApps registry...');
        const registryPattern = /(window\.windowedApps\s*=\s*\{[\s\S]*?)(\s*\};)/;
        const registryMatch = html.match(registryPattern);
        
        if (registryMatch) {
            // Add Paint 98 entry before closing brace
            const paint98Entry = `
            'paint-98': {
                name: 'Paint 98',
                url: '/public/paint-98',
                icon: '🎨',
                width: 800,
                height: 600
            },`;
            
            const newRegistry = registryMatch[1] + paint98Entry + registryMatch[2];
            html = html.replace(registryMatch[0], newRegistry);
            console.log('✅ Added Paint 98 to windowedApps registry');
        } else {
            console.log('❌ Could not find windowedApps registry');
            return;
        }
        
        // 5. Add desktop icon INSIDE #desktop div
        console.log('\n4️⃣  Adding desktop icon...');
        
        // Find a good position - let's use 620px, 180px (right side, second row)
        const iconHTML = `
    <!-- Paint 98 -->
    <div class="desktop-icon" 
         style="left: 620px; top: 180px;"
         onclick="openWindowedApp('paint-98')"
         title="Paint 98">
        <div class="icon">🎨</div>
        <div class="label">Paint 98</div>
    </div>`;
        
        // Find the desktop div and add after its opening tag
        const desktopPattern = /(<div id="desktop">)/;
        const desktopMatch = html.match(desktopPattern);
        
        if (desktopMatch) {
            const insertIndex = desktopMatch.index + desktopMatch[0].length;
            html = html.slice(0, insertIndex) + iconHTML + html.slice(insertIndex);
            console.log('✅ Added Paint 98 desktop icon at position (620, 180)');
        } else {
            console.log('❌ Could not find #desktop div');
            return;
        }
        
        // 6. Save to database with backup
        console.log('\n5️⃣  Saving to database (with automatic backup)...');
        await safeUpdateToyBoxOS(html, 'Added Paint 98 app to desktop');
        
        // 7. Update layout data
        console.log('\n6️⃣  Updating layout data system...');
        const { data: layoutData } = await supabase
            .from('wtaf_zero_admin_collaborative')
            .select('*')
            .eq('app_id', 'toybox-desktop-layout')
            .eq('action_type', 'desktop_state')
            .eq('participant_id', 'global')
            .order('created_at', { ascending: false })
            .limit(1);
        
        if (layoutData && layoutData[0]) {
            const icons = layoutData[0].content_data.icons || {};
            
            // Add Paint 98 to icons
            icons['paint98'] = {
                x: 620,
                y: 180,
                visible: true,
                label: 'Paint 98'
            };
            
            // Insert new layout record
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
                        modifiedBy: 'add-paint98-script'
                    }
                });
            
            if (layoutError) {
                console.log('⚠️  Failed to update layout data:', layoutError.message);
            } else {
                console.log('✅ Updated layout data system');
            }
        } else {
            // Create initial layout data
            const { error: layoutError } = await supabase
                .from('wtaf_zero_admin_collaborative')
                .insert({
                    app_id: 'toybox-desktop-layout',
                    participant_id: 'global',
                    action_type: 'desktop_state',
                    content_data: {
                        icons: {
                            'paint98': {
                                x: 620,
                                y: 180,
                                visible: true,
                                label: 'Paint 98'
                            }
                        },
                        lastModified: new Date().toISOString(),
                        modifiedBy: 'add-paint98-script'
                    }
                });
            
            if (!layoutError) {
                console.log('✅ Created initial layout data with Paint 98');
            }
        }
        
        console.log('\n🎉 Successfully added Paint 98 to WebtoysOS desktop!');
        console.log('🔗 View at: https://webtoys.ai/public/toybox-os');
        console.log('📁 Backup saved to: backups/ folder');
        
    } catch (error) {
        console.error('❌ Error:', error);
        console.log('\n💡 To restore from backup:');
        console.log('   node scripts/update-toybox-os.js ../backups/toybox-os_latest-backup.html');
    }
}

// Run the script
addPaint98ToDesktop();