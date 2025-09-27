#!/usr/bin/env node

/**
 * Cleanup Desktop Apps
 * Removes specified apps from WebtoysOS desktop configuration
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Apps to remove (as requested)
const APPS_TO_REMOVE = [
    'pixel-art-studio',  // Pixel Art Studio
    'word-chain',        // Word Chain
    'pxl-art'           // Pxl Art
];

async function cleanupDesktop() {
    console.log('🧹 Starting desktop cleanup...\n');
    
    try {
        // Get current desktop config
        const { data: config, error: fetchError } = await supabase
            .from('wtaf_desktop_config')
            .select('app_registry, icon_positions')
            .eq('desktop_version', 'webtoys-os-v3')
            .single();
            
        if (fetchError) {
            console.error('❌ Failed to fetch desktop config:', fetchError);
            return;
        }
        
        if (!config) {
            console.error('❌ No desktop config found');
            return;
        }
        
        // Track what we're removing
        const removedApps = [];
        
        // Filter out apps from registry
        const originalCount = config.app_registry.length;
        const filteredRegistry = config.app_registry.filter(app => {
            const shouldRemove = APPS_TO_REMOVE.includes(app.id);
            if (shouldRemove) {
                removedApps.push(app.name);
                console.log(`  ❌ Removing: ${app.name} (${app.id})`);
            }
            return !shouldRemove;
        });
        
        // Remove icon positions for removed apps
        const filteredIconPositions = {};
        for (const [appId, position] of Object.entries(config.icon_positions)) {
            if (!APPS_TO_REMOVE.includes(appId)) {
                filteredIconPositions[appId] = position;
            }
        }
        
        // Update the database
        const { error: updateError } = await supabase
            .from('wtaf_desktop_config')
            .update({
                app_registry: filteredRegistry,
                icon_positions: filteredIconPositions,
                updated_at: new Date().toISOString()
            })
            .eq('desktop_version', 'webtoys-os-v3');
            
        if (updateError) {
            console.error('❌ Failed to update desktop config:', updateError);
            return;
        }
        
        console.log('\n✅ Desktop cleanup complete!');
        console.log(`📊 Summary:`);
        console.log(`  - Apps before: ${originalCount}`);
        console.log(`  - Apps removed: ${removedApps.length}`);
        console.log(`  - Apps remaining: ${filteredRegistry.length}`);
        
        if (removedApps.length > 0) {
            console.log(`\n🗑️  Removed apps:`);
            removedApps.forEach(name => console.log(`  - ${name}`));
        }
        
        console.log('\n💡 Note: The app HTML files still exist in the database.');
        console.log('   They can be re-added to the desktop later if needed.');
        console.log('   URLs like /public/toybox-[app-name] will still work.');
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Run the cleanup
cleanupDesktop();