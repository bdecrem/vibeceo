#!/usr/bin/env node

/**
 * Verify Icon Status
 * 
 * Quick diagnostic script to check if an icon exists in both required locations:
 * 1. HTML structure (wtaf_content)
 * 2. Layout data (wtaf_zero_admin_collaborative)
 * 
 * Usage: node verify-icon-status.js [icon-name]
 * Example: node verify-icon-status.js texty
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

let result = dotenv.config({ path: path.join(__dirname, '../../.env.local') });
if (result.error) {
    result = dotenv.config({ path: path.join(__dirname, '../../.env') });
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function verifyIcon(iconName) {
    if (!iconName) {
        console.log('Usage: node verify-icon-status.js [icon-name]');
        console.log('Example: node verify-icon-status.js texty');
        return;
    }
    
    console.log(`🔍 Checking status of icon: ${iconName}`);
    console.log('=' .repeat(50));
    
    try {
        // Check HTML structure
        console.log('1️⃣  Checking HTML structure...');
        const { data: htmlData, error: htmlError } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os')
            .single();
            
        if (htmlError) throw new Error(`HTML fetch failed: ${htmlError.message}`);
        
        const htmlHasIcon = htmlData.html_content.includes(`openWindowedApp('${iconName}')`);
        console.log(`   HTML contains icon: ${htmlHasIcon ? '✅ YES' : '❌ NO'}`);
        
        if (htmlHasIcon) {
            // Extract position from HTML
            const styleMatch = htmlData.html_content.match(new RegExp(`style="[^"]*"[^>]*onclick="openWindowedApp\\('${iconName}'\\)"`));
            if (styleMatch) {
                const leftMatch = styleMatch[0].match(/left:\s*(\d+)px/);
                const topMatch = styleMatch[0].match(/top:\s*(\d+)px/);
                if (leftMatch && topMatch) {
                    console.log(`   HTML position: (${leftMatch[1]}, ${topMatch[1]})`);
                }
            }
        }
        
        // Check layout data
        console.log('2️⃣  Checking layout data...');
        const { data: layoutData, error: layoutError } = await supabase
            .from('wtaf_zero_admin_collaborative')
            .select('content_data, created_at')
            .eq('app_id', 'toybox-desktop-layout')
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
            
        if (layoutError) throw new Error(`Layout fetch failed: ${layoutError.message}`);
        
        const iconData = layoutData.content_data.icons[iconName];
        const layoutHasIcon = !!iconData;
        console.log(`   Layout contains icon: ${layoutHasIcon ? '✅ YES' : '❌ NO'}`);
        
        if (layoutHasIcon) {
            console.log(`   Layout position: (${iconData.x}, ${iconData.y})`);
            console.log(`   Layout label: "${iconData.label}"`);
            console.log(`   Layout visible: ${iconData.visible ? '✅ YES' : '❌ NO'}`);
        }
        
        console.log('3️⃣  Summary:');
        if (htmlHasIcon && layoutHasIcon && iconData?.visible) {
            console.log('🎉 ICON STATUS: WORKING - Should be visible on desktop');
        } else if (htmlHasIcon && layoutHasIcon && !iconData?.visible) {
            console.log('⚠️  ICON STATUS: HIDDEN - In layout but not visible');
        } else if (htmlHasIcon && !layoutHasIcon) {
            console.log('❌ ICON STATUS: BROKEN - In HTML but missing from layout data');
            console.log('💡 FIX: Add icon to layout data with visible: true');
        } else if (!htmlHasIcon && layoutHasIcon) {
            console.log('❌ ICON STATUS: BROKEN - In layout but missing from HTML');
            console.log('💡 FIX: Add icon HTML structure');
        } else {
            console.log('❌ ICON STATUS: MISSING - Not found in either location');
            console.log('💡 FIX: Add to both HTML and layout data');
        }
        
    } catch (error) {
        console.error('❌ Verification failed:', error.message);
    }
}

// Run with command line argument
const iconName = process.argv[2];
verifyIcon(iconName);