#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function removeApps() {
    try {
        console.log('🔍 Fetching desktop configuration...');
        
        // Get current desktop config
        const { data: config, error: fetchError } = await supabase
            .from('wtaf_desktop_config')
            .select('*')
            .eq('desktop_version', 'webtoys-os-v3')
            .single();

        if (fetchError) {
            console.error('Error fetching config:', fetchError);
            return;
        }

        if (!config || !config.app_registry) {
            console.log('No config or app registry found');
            return;
        }

        console.log(`📱 Current app registry has ${config.app_registry.length} apps`);
        
        // Filter out the three apps: texts, wordchain, wordtoys
        const originalCount = config.app_registry.length;
        const filteredApps = config.app_registry.filter(app => {
            const idLower = app.id.toLowerCase();
            const nameLower = app.name.toLowerCase();
            const urlLower = (app.url || '').toLowerCase();
            
            // Check for texts/text app
            if (idLower.includes('texts') || idLower === 'text' || 
                nameLower.includes('texts') || 
                urlLower.includes('toybox-texts')) {
                console.log(`🗑️  Removing: ${app.name} (id: ${app.id})`);
                return false;
            }
            
            // Check for wordchain app
            if (idLower.includes('wordchain') || 
                nameLower.includes('wordchain') || nameLower.includes('word chain') ||
                urlLower.includes('toybox-wordchain')) {
                console.log(`🗑️  Removing: ${app.name} (id: ${app.id})`);
                return false;
            }
            
            // Check for wordtoys app
            if (idLower.includes('wordtoys') || idLower.includes('word-toys') ||
                nameLower.includes('wordtoys') || nameLower.includes('word toys') ||
                urlLower.includes('toybox-wordtoys')) {
                console.log(`🗑️  Removing: ${app.name} (id: ${app.id})`);
                return false;
            }
            
            return true;
        });

        const removedCount = originalCount - filteredApps.length;
        
        if (removedCount === 0) {
            console.log('✅ None of the specified apps (Texts, Wordchain, Wordtoys) were found in registry');
            return;
        }

        // Update config with filtered apps
        const { error: updateError } = await supabase
            .from('wtaf_desktop_config')
            .update({
                app_registry: filteredApps,
                updated_at: new Date().toISOString()
            })
            .eq('desktop_version', 'webtoys-os-v3');

        if (updateError) {
            console.error('Error updating config:', updateError);
            return;
        }

        console.log(`✅ Successfully removed ${removedCount} app(s) from desktop`);
        console.log(`📱 ${filteredApps.length} apps remaining in registry`);
        
        // Also remove the apps from wtaf_content table if they exist
        console.log('\n🧹 Cleaning up app data from database...');
        
        const appsToDelete = [
            'toybox-texts',
            'toybox-wordchain', 
            'toybox-wordtoys'
        ];
        
        for (const appSlug of appsToDelete) {
            const { error: deleteError } = await supabase
                .from('wtaf_content')
                .delete()
                .eq('user_slug', 'public')
                .eq('app_slug', appSlug);
            
            if (deleteError) {
                console.log(`⚠️  Could not delete ${appSlug}: ${deleteError.message}`);
            } else {
                console.log(`✅ Deleted ${appSlug} from wtaf_content`);
            }
        }
        
        console.log('\n🎉 Cleanup complete!');
        
    } catch (error) {
        console.error('Error:', error);
    }
}

removeApps();