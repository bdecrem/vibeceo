#!/usr/bin/env node

/**
 * Remove specific text editor apps from WebtoysOS v3 desktop
 * This script removes apps from both the app_registry and icon_positions
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

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

// Apps to remove (based on app IDs)
const APPS_TO_REMOVE = [
    'notepad',
    'text-editor',
    't3xt',
    'words',
    'w0rdz',
    'textz'
];

// Also check for variations with "toybox-" prefix in app_slug
const APP_SLUGS_TO_REMOVE = APPS_TO_REMOVE.map(id => `toybox-${id}`);

async function removeApps() {
    console.log('\n🗑️  Removing text editor apps from WebtoysOS v3...\n');
    console.log('Apps to remove:', APPS_TO_REMOVE.join(', '));
    
    // Step 1: Get current desktop config
    console.log('\n📋 Fetching desktop config...');
    
    const { data: configData, error: configError } = await supabase
        .from('wtaf_desktop_config')
        .select('*')
        .eq('desktop_version', 'webtoys-os-v3')
        .is('user_id', null)
        .single();
    
    if (configError) {
        console.error('❌ Error fetching desktop config:', configError);
        process.exit(1);
    }
    
    console.log('✅ Fetched desktop config');
    
    // Step 2: Remove from app_registry
    let appRegistry = configData.app_registry || [];
    const originalRegistryCount = appRegistry.length;
    
    console.log(`\n📦 Current app registry has ${originalRegistryCount} apps`);
    
    // Filter out the apps we want to remove
    const newRegistry = appRegistry.filter(app => {
        const shouldRemove = APPS_TO_REMOVE.includes(app.id) || 
                            APPS_TO_REMOVE.includes(app.id.toLowerCase()) ||
                            APP_SLUGS_TO_REMOVE.some(slug => app.url && app.url.includes(slug));
        
        if (shouldRemove) {
            console.log(`   Removing: ${app.name} (ID: ${app.id})`);
        }
        
        return !shouldRemove;
    });
    
    const removedCount = originalRegistryCount - newRegistry.length;
    console.log(`   Removed ${removedCount} apps from registry`);
    
    // Step 3: Remove from icon_positions
    let iconPositions = configData.icon_positions || {};
    const originalIconCount = Object.keys(iconPositions).length;
    
    console.log(`\n🎯 Current icon positions has ${originalIconCount} entries`);
    
    // Create new icon positions without the removed apps
    const newIconPositions = {};
    for (const [appId, position] of Object.entries(iconPositions)) {
        const shouldRemove = APPS_TO_REMOVE.includes(appId) || 
                            APPS_TO_REMOVE.includes(appId.toLowerCase());
        
        if (!shouldRemove) {
            newIconPositions[appId] = position;
        } else {
            console.log(`   Removing icon position for: ${appId}`);
        }
    }
    
    const removedIconCount = originalIconCount - Object.keys(newIconPositions).length;
    console.log(`   Removed ${removedIconCount} icon positions`);
    
    // Step 4: Update desktop config
    console.log('\n💾 Updating desktop config...');
    
    const timestamp = new Date().toISOString();
    
    const { error: updateError } = await supabase
        .from('wtaf_desktop_config')
        .update({
            app_registry: newRegistry,
            icon_positions: newIconPositions,
            updated_at: timestamp
        })
        .eq('desktop_version', 'webtoys-os-v3')
        .is('user_id', null);
    
    if (updateError) {
        console.error('❌ Error updating desktop config:', updateError);
        process.exit(1);
    }
    
    console.log('✅ Desktop config updated successfully');
    
    // Step 5: Optionally delete the apps from wtaf_content table
    console.log('\n🗄️  Checking for apps in database...');
    
    for (const appSlug of APP_SLUGS_TO_REMOVE) {
        const { data: appData, error: checkError } = await supabase
            .from('wtaf_content')
            .select('app_slug')
            .eq('user_slug', 'public')
            .eq('app_slug', appSlug)
            .single();
        
        if (appData && !checkError) {
            console.log(`   Found ${appSlug} in database - keeping for potential future use`);
            // Not deleting from wtaf_content - just removing from desktop
        }
    }
    
    // Summary
    console.log('\n✨ Removal complete!');
    console.log(`📊 Summary:`);
    console.log(`   - Removed ${removedCount} apps from registry`);
    console.log(`   - Removed ${removedIconCount} icon positions`);
    console.log(`   - Apps remain in database for potential restoration`);
    console.log(`\n🖥️  Desktop: https://webtoys.ai/public/toybox-os-v3-test`);
    console.log('\nRefresh the desktop to see the changes.');
}

// Run the script
removeApps().catch(console.error);