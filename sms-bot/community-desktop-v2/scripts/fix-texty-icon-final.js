#!/usr/bin/env node

/**
 * Fix TEXTY Icon - The Final Solution
 * 
 * PROBLEM DISCOVERED:
 * - TEXTY exists in HTML but NOT in toybox-desktop-layout ZAD data
 * - Working icons (BDpaint, Hi, BD, etc.) exist in BOTH places
 * - Desktop system requires icons to be in BOTH locations to be visible
 * 
 * SOLUTION:
 * Add TEXTY to the toybox-desktop-layout ZAD data at position (610, 80)
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let result = dotenv.config({ path: path.join(__dirname, '../../.env.local') });
if (result.error) {
    result = dotenv.config({ path: path.join(__dirname, '../../.env') });
    if (result.error) {
        console.error('Error loading .env files:', result.error.message);
        process.exit(1);
    }
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function fixTextyIcon() {
    try {
        console.log('🔍 Fetching latest toybox-desktop-layout data...');
        
        // Get the most recent layout data
        const { data: layoutData, error: fetchError } = await supabase
            .from('wtaf_zero_admin_collaborative')
            .select('*')
            .eq('app_id', 'toybox-desktop-layout')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
            
        if (fetchError) {
            throw new Error(`Failed to fetch layout data: ${fetchError.message}`);
        }
        
        console.log('📦 Current layout data fetched');
        console.log(`📅 Last modified: ${layoutData.content_data.lastModified}`);
        console.log(`🔧 Modified by: ${layoutData.content_data.modifiedBy}`);
        
        // Check if TEXTY already exists
        const icons = layoutData.content_data.icons;
        if (icons.texty) {
            console.log('✅ TEXTY already exists in layout data:');
            console.log(`   Position: (${icons.texty.x}, ${icons.texty.y})`);
            console.log(`   Visible: ${icons.texty.visible}`);
            
            if (icons.texty.visible) {
                console.log('🎉 TEXTY is already visible! The problem might be elsewhere.');
                return;
            } else {
                console.log('🔧 TEXTY exists but is not visible. Making it visible...');
                icons.texty.visible = true;
                icons.texty.x = 610;
                icons.texty.y = 80;
            }
        } else {
            console.log('❌ TEXTY missing from layout data. Adding it...');
            icons.texty = {
                x: 610,
                y: 80,
                label: "TEXTY",
                visible: true
            };
        }
        
        // Update the layout data
        const updatedContentData = {
            ...layoutData.content_data,
            icons: icons,
            lastModified: new Date().toISOString(),
            modifiedBy: "claude-fix"
        };
        
        // Insert new record (don't update existing, as that's how the system works)
        const { error: insertError } = await supabase
            .from('wtaf_zero_admin_collaborative')
            .insert({
                app_id: 'toybox-desktop-layout',
                participant_id: 'global',
                participant_data: {},
                action_type: 'desktop_state',
                content_data: updatedContentData
            });
            
        if (insertError) {
            throw new Error(`Failed to insert updated layout: ${insertError.message}`);
        }
        
        console.log('✅ TEXTY icon fix completed successfully!');
        console.log('📍 TEXTY added at position (610, 80) with visible: true');
        console.log('🔄 New layout record inserted into ZAD system');
        console.log('🎯 TEXTY should now appear on the desktop!');
        
        // Show a summary of the fix
        console.log('\n📋 SUMMARY OF CHANGES:');
        console.log(`  - Added "texty" to toybox-desktop-layout icons`);
        console.log(`  - Position: (610, 80)`);
        console.log(`  - Label: "TEXTY"`);
        console.log(`  - Visible: true`);
        console.log(`  - Last modified: ${updatedContentData.lastModified}`);
        
    } catch (error) {
        console.error('❌ Fix failed:', error.message);
        throw error;
    }
}

// Run the fix
fixTextyIcon().catch(console.error);