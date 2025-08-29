#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables - try multiple locations
let envLoaded = false;
const envPaths = [
    path.join(__dirname, '../../../.env.local'),
    path.join(__dirname, '../../../.env'),
    path.join(__dirname, '../../.env.local'),
    path.join(__dirname, '../../.env')
];

for (const envPath of envPaths) {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
        envLoaded = true;
        console.log('✅ Loaded environment from:', path.basename(envPath));
        break;
    }
}

if (!envLoaded) {
    // Environment variables might be already set in the shell
    console.log('⚠️ No .env file found, using existing environment variables');
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

// Ensure backups directory exists
const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

async function renameKidPixToPaint98() {
    console.log('🎨 Updating KidPix Paint to Paint 98 on webtoys-os-v2...\n');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    try {
        // 0. First verify paint-98 exists
        const { data: paintApp, error: paintError } = await supabase
            .from('wtaf_content')
            .select('app_slug')
            .eq('user_slug', 'public')
            .eq('app_slug', 'paint-98')
            .single();
            
        if (paintError || !paintApp) {
            console.error('❌ paint-98 app not found. Please ensure it exists first.');
            return;
        }
        console.log('✅ Verified paint-98 exists');
        
        // 1. Fetch current webtoys-os-v2 HTML from database
        console.log('📥 Fetching current webtoys-os-v2 from database...');
        const { data: current, error: fetchError } = await supabase
            .from('wtaf_content')
            .select('html_content, updated_at')
            .eq('user_slug', 'public')
            .eq('app_slug', 'webtoys-os-v2')  // webtoys-os-v2!
            .single();
            
        if (fetchError) {
            console.error('❌ Failed to fetch webtoys-os-v2:', fetchError);
            return;
        }
        
        let html = current.html_content;
        
        // 2. Create backup
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const backupPath = path.join(backupDir, `webtoys-os-v2_kidpix-to-paint98_${timestamp}.html`);
        fs.writeFileSync(backupPath, html);
        console.log('💾 Created backup:', path.basename(backupPath));
        
        // Also create latest backup
        const latestPath = path.join(backupDir, 'webtoys-os-v2_latest-backup.html');
        fs.writeFileSync(latestPath, html);
        
        // 3. Update the windowedApps registry to point to paint-98
        console.log('📝 Updating windowedApps registry...');
        
        // Find the kidpix-paint entry and update it to point to paint-98
        const registryPattern = /(window\.windowedApps\s*=\s*\{[\s\S]*?)'kidpix-paint'\s*:\s*\{[^}]*\}/;
        const registryMatch = html.match(registryPattern);
        
        if (registryMatch) {
            // Replace the kidpix-paint entry with updated paint-98 configuration
            const newEntry = `'kidpix-paint': {
                name: 'Paint 98',
                url: '/public/paint-98',
                icon: '🎨',
                width: 800,
                height: 600
            }`;
            
            html = html.replace(registryMatch[0], registryMatch[1] + newEntry);
            console.log('✅ Updated registry to point to paint-98');
        } else {
            console.log('⚠️ Could not find kidpix-paint entry in windowedApps registry');
        }
        
        // 4. Update the HTML desktop icon label
        console.log('🖼️ Updating desktop icon label...');
        
        // Find the desktop icon with onclick="openWindowedApp('kidpix-paint')" and update its label
        const iconPattern = /(onclick="openWindowedApp\('kidpix-paint'\)"[^>]*>[\s\S]*?<div class="label">)[^<]*/;
        if (html.match(iconPattern)) {
            html = html.replace(iconPattern, '$1Paint 98');
            console.log('✅ Updated desktop icon label to "Paint 98"');
        } else {
            // Try alternative pattern
            const altPattern = /(<div class="label">)(KidPix Paint|KidPix)(<\/div>[\s\S]*?onclick="openWindowedApp\('kidpix-paint'\)")/;
            if (html.match(altPattern)) {
                html = html.replace(altPattern, '$1Paint 98$3');
                console.log('✅ Updated desktop icon label to "Paint 98" (alternative pattern)');
            } else {
                console.log('⚠️ Could not find kidpix-paint desktop icon');
            }
        }
        
        // Also update the title attribute if it exists
        html = html.replace(/title="KidPix Paint"/g, 'title="Paint 98"');
        html = html.replace(/title="KidPix"/g, 'title="Paint 98"');
        
        // 5. Save updated HTML to database
        console.log('\n💾 Saving changes to database...');
        
        // Save metadata
        const metadataPath = path.join(backupDir, `webtoys-os-v2_kidpix-to-paint98_${timestamp}.json`);
        fs.writeFileSync(metadataPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            description: 'Updated KidPix Paint to Paint 98 on webtoys-os-v2',
            changes: [
                'Updated windowedApps registry to point to /public/paint-98',
                'Renamed desktop icon label to "Paint 98"',
                'Updated title attributes'
            ],
            backupFile: path.basename(backupPath)
        }, null, 2));
        
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
            console.error('❌ Update failed:', updateError);
            console.log('💡 Restore from backup:', backupPath);
            return;
        }
        
        // 6. Update layout data system (if it exists for webtoys-os-v2)
        console.log('\n📊 Checking layout data system...');
        
        const { data: layoutData, error: layoutError } = await supabase
            .from('wtaf_zero_admin_collaborative')
            .select('*')
            .eq('app_id', 'webtoys-desktop-layout')  // Changed from toybox to webtoys
            .eq('action_type', 'desktop_state')
            .eq('participant_id', 'global')
            .order('created_at', { ascending: false })
            .limit(1);
        
        if (layoutData && layoutData[0]) {
            const icons = layoutData[0].content_data.icons;
            
            // Check if kidpix-paint icon exists in layout
            if (icons && icons['kidpix-paint']) {
                // Update the label
                icons['kidpix-paint'].label = 'Paint 98';
                
                // Insert new layout record with updated data
                const { error: insertError } = await supabase
                    .from('wtaf_zero_admin_collaborative')
                    .insert({
                        app_id: 'webtoys-desktop-layout',
                        participant_id: 'global',
                        action_type: 'desktop_state',
                        content_data: {
                            ...layoutData[0].content_data,
                            icons: icons,
                            lastModified: new Date().toISOString(),
                            modifiedBy: 'rename-kidpix-script'
                        }
                    });
                
                if (insertError) {
                    console.error('⚠️ Layout data update skipped:', insertError.message);
                } else {
                    console.log('✅ Updated layout data with new label');
                }
            } else {
                console.log('ℹ️ KidPix Paint not found in layout data (this is okay)');
            }
        } else {
            console.log('ℹ️ No layout data found for webtoys-os-v2 (this is okay)');
        }
        
        console.log('\n🎉 Successfully updated KidPix Paint to Paint 98!');
        console.log('🔗 View at: https://webtoys.ai/public/webtoys-os-v2');
        console.log('📁 Backup saved to:', path.basename(backupPath));
        
    } catch (error) {
        console.error('❌ Error:', error);
        console.log('\n💡 To restore from backup, use the backup file in the backups/ directory');
    }
}

// Run the rename operation
renameKidPixToPaint98();