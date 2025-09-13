#!/usr/bin/env node

/**
 * Remove specific apps from WebtoysOS v3 desktop
 * This script removes apps from the desktop registry and icon positions
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

async function removeApps(appIds) {
    console.log(`\n🗑️  Removing apps from WebtoysOS v3: ${appIds.join(', ')}\n`);
    
    // Get current desktop config
    console.log('📋 Fetching current desktop config...');
    const { data: configData, error: configError } = await supabase
        .from('wtaf_desktop_config')
        .select('*')
        .eq('desktop_version', 'webtoys-os-v3')
        .is('user_id', null)  // Get the public/default desktop
        .single();
    
    if (configError) {
        console.error('❌ Error fetching desktop config:', configError);
        process.exit(1);
    }
    
    console.log('✅ Fetched desktop config');
    
    // Remove from app registry
    let appRegistry = configData.app_registry || [];
    const originalCount = appRegistry.length;
    
    appRegistry = appRegistry.filter(app => !appIds.includes(app.id));
    const removedFromRegistry = originalCount - appRegistry.length;
    
    console.log(`📱 Removed ${removedFromRegistry} apps from registry`);
    
    // Remove from icon positions
    let iconPositions = configData.icon_positions || {};
    let removedFromIcons = 0;
    
    appIds.forEach(appId => {
        if (iconPositions[appId]) {
            delete iconPositions[appId];
            removedFromIcons++;
        }
    });
    
    console.log(`🎯 Removed ${removedFromIcons} icons from desktop`);
    
    // Update the desktop config
    const timestamp = new Date().toISOString();
    console.log('💾 Updating desktop config...');
    
    const { error: updateError } = await supabase
        .from('wtaf_desktop_config')
        .update({
            app_registry: appRegistry,
            icon_positions: iconPositions,
            updated_at: timestamp
        })
        .eq('desktop_version', 'webtoys-os-v3')
        .is('user_id', null);
    
    if (updateError) {
        console.error('❌ Error updating desktop config:', updateError);
        process.exit(1);
    }
    
    console.log('✅ Desktop config updated successfully!');
    console.log('\n📊 Summary:');
    console.log(`   Apps removed from registry: ${removedFromRegistry}`);
    console.log(`   Icons removed from desktop: ${removedFromIcons}`);
    console.log(`   Apps to remove: ${appIds.join(', ')}`);
    console.log('\n🔗 Check the desktop: https://webtoys.ai/public/toybox-os-v3-test');
    
    return {
        removedFromRegistry,
        removedFromIcons,
        remainingApps: appRegistry.length
    };
}

// If run directly from command line
if (import.meta.url === `file://${process.argv[1]}`) {
    const appsToRemove = process.argv.slice(2);
    
    if (appsToRemove.length === 0) {
        console.error('❌ Usage: node remove-apps.js <app-id1> [app-id2] ...');
        console.error('   Example: node remove-apps.js bart oauth-celebration');
        process.exit(1);
    }
    
    removeApps(appsToRemove).catch(console.error);
}

export { removeApps };