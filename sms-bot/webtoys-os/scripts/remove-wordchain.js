#!/usr/bin/env node

/**
 * Remove Word Chain App from WebtoysOS Desktop
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

async function removeWordChain() {
    console.log('🎯 Removing Word Chain from WebtoysOS desktop...\n');
    
    try {
        // Get current desktop config
        const { data: config, error: fetchError } = await supabase
            .from('wtaf_desktop_config')
            .select('*')
            .eq('desktop_version', 'webtoys-os-v3')
            .single();

        if (fetchError) {
            console.error('❌ Error fetching desktop config:', fetchError);
            return;
        }

        if (!config || !config.app_registry) {
            console.log('❌ No desktop config or app registry found');
            return;
        }

        console.log(`📱 Current registry has ${config.app_registry.length} apps`);
        
        // Filter out Word Chain app
        const originalCount = config.app_registry.length;
        const filteredApps = config.app_registry.filter(app => {
            const idLower = app.id.toLowerCase();
            const nameLower = app.name.toLowerCase();
            const urlLower = (app.url || '').toLowerCase();
            
            // Check for wordchain/word chain app
            if (idLower.includes('wordchain') || idLower.includes('word-chain') ||
                nameLower.includes('word chain') || nameLower.includes('wordchain') ||
                urlLower.includes('wordchain') || urlLower.includes('word-chain')) {
                console.log(`  🗑️  Removing: ${app.name} (id: ${app.id})`);
                return false;
            }
            
            return true;
        });

        const removedCount = originalCount - filteredApps.length;
        
        if (removedCount === 0) {
            console.log('✅ Word Chain app was not found in the registry (already removed?)');
            return;
        }

        // Update the desktop config
        const { error: updateError } = await supabase
            .from('wtaf_desktop_config')
            .update({
                app_registry: filteredApps,
                updated_at: new Date().toISOString()
            })
            .eq('desktop_version', 'webtoys-os-v3');

        if (updateError) {
            console.error('❌ Error updating desktop config:', updateError);
            return;
        }

        console.log(`\n✅ Successfully removed Word Chain from desktop`);
        console.log(`📱 ${filteredApps.length} apps remaining in registry`);
        
        // Also try to remove from wtaf_content table if it exists
        console.log('\n🧹 Cleaning up app data from database...');
        
        const appSlugs = ['toybox-wordchain', 'toybox-word-chain'];
        
        for (const appSlug of appSlugs) {
            const { error: deleteError } = await supabase
                .from('wtaf_content')
                .delete()
                .eq('user_slug', 'public')
                .eq('app_slug', appSlug);
            
            if (!deleteError) {
                console.log(`  ✅ Deleted ${appSlug} from wtaf_content`);
            }
        }
        
        console.log('\n🎉 Word Chain app has been removed from WebtoysOS!');
        console.log('🔄 The desktop will update automatically next time it\'s loaded');
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

removeWordChain();