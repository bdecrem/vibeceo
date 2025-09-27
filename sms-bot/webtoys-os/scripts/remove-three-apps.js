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

        // Filter out the three apps
        const originalCount = config.app_registry.length;
        const filteredApps = config.app_registry.filter(app => {
            const idLower = app.id.toLowerCase();
            const nameLower = app.name.toLowerCase();
            
            // Log what we're checking
            if (idLower.includes('sudoku-pro') || nameLower.includes('sudoku pro')) {
                console.log(`Removing: ${app.name} (${app.id})`);
                return false;
            }
            if (idLower.includes('magic-8-ball') || nameLower.includes('magic 8 ball')) {
                console.log(`Removing: ${app.name} (${app.id})`);
                return false;
            }
            if (idLower.includes('background-changer') || nameLower.includes('background changer')) {
                console.log(`Removing: ${app.name} (${app.id})`);
                return false;
            }
            
            return true;
        });

        const removedCount = originalCount - filteredApps.length;
        
        if (removedCount === 0) {
            console.log('✅ Apps not found in registry');
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
    } catch (error) {
        console.error('Error:', error);
    }
}

removeApps();