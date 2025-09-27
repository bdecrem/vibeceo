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

async function removeT3xtApp() {
    try {
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

        // Filter out T3xt app
        const originalCount = config.app_registry.length;
        const filteredApps = config.app_registry.filter(app => 
            !app.id.toLowerCase().includes('t3xt') && 
            !app.name.toLowerCase().includes('t3xt')
        );

        const removedCount = originalCount - filteredApps.length;
        
        if (removedCount === 0) {
            console.log('✅ T3xt app not found in registry');
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

        console.log(`✅ Successfully removed ${removedCount} T3xt app(s) from desktop`);
        console.log(`📱 ${filteredApps.length} apps remaining in registry`);
    } catch (error) {
        console.error('Error:', error);
    }
}

removeT3xtApp();