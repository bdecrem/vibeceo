#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function cleanupDesktop() {
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
    
    // Apps to remove
    const appsToRemove = [
        'about',      // About app
        'issue-tracker', // First Issue Tracker (keeping issue-tracker-v3)
        'text',       // TExt app
        'bdpaint'     // Bdpaint app
    ];
    
    console.log('\n🧹 Cleaning up desktop...\n');
    
    // Remove each app
    appsToRemove.forEach(appId => {
        const index = config.app_registry.findIndex(app => app.id === appId);
        if (index !== -1) {
            const removedApp = config.app_registry[index];
            config.app_registry.splice(index, 1);
            console.log(`✅ Removed: ${removedApp.icon} ${removedApp.name}`);
            
            // Also remove icon position
            if (config.icon_positions && config.icon_positions[appId]) {
                delete config.icon_positions[appId];
            }
        } else {
            console.log(`⚠️  ${appId} not found on desktop`);
        }
    });
    
    // Update database
    const { error: updateError } = await supabase
        .from('wtaf_desktop_config')
        .update({
            app_registry: config.app_registry,
            icon_positions: config.icon_positions
        })
        .eq('desktop_version', 'webtoys-os-v3');
    
    if (updateError) {
        console.error('Error updating config:', updateError);
    } else {
        console.log('\n✨ Desktop cleaned up successfully!');
        console.log('\n📱 Remaining apps on desktop:');
        config.app_registry.forEach(app => {
            console.log(`   ${app.icon} ${app.name}`);
        });
        console.log('\n🌐 View desktop: https://webtoys.ai/public/toybox-os-v3-test');
    }
}

cleanupDesktop().catch(console.error);