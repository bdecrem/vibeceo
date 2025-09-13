#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '../.env.local') });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Apps to remove (normalized IDs)
const appsToRemove = [
    'pixel-art',
    'text-editor',
    'p4int',
    '../apps/hello-world',
    'hello-world',
    'bart',
    '../apps/calculator',
    'calculator',
    'text-editor-305',
    'countdown-timer'
];

async function removeAppsFromDesktop() {
    console.log('🔍 Fetching current desktop configuration...');

    // Fetch current config
    const { data: config, error: fetchError } = await supabase
        .from('wtaf_desktop_config')
        .select('app_registry, icon_positions')
        .eq('desktop_version', 'webtoys-os-v3')
        .single();

    if (fetchError) {
        console.error('❌ Error fetching config:', fetchError);
        return;
    }

    if (!config) {
        console.error('❌ No desktop configuration found');
        return;
    }

    // Backup current state
    console.log('📦 Current app registry has', config.app_registry.length, 'apps');
    console.log('🗑️  Removing the following apps:', appsToRemove);

    // Filter out the apps to remove
    const originalCount = config.app_registry.length;
    const updatedAppRegistry = config.app_registry.filter(app =>
        !appsToRemove.includes(app.id)
    );

    // Also remove icon positions for these apps
    const updatedIconPositions = { ...config.icon_positions };
    for (const appId of appsToRemove) {
        // Handle the app ID normalization for icon positions
        const iconId = appId.replace('../apps/', '').replace('toybox-', '');
        delete updatedIconPositions[iconId];

        // Also try the full ID
        delete updatedIconPositions[appId];
    }

    const removedCount = originalCount - updatedAppRegistry.length;
    console.log(`✅ Removed ${removedCount} apps from registry`);

    // Update the database
    console.log('💾 Updating database...');
    const { error: updateError } = await supabase
        .from('wtaf_desktop_config')
        .update({
            app_registry: updatedAppRegistry,
            icon_positions: updatedIconPositions
        })
        .eq('desktop_version', 'webtoys-os-v3');

    if (updateError) {
        console.error('❌ Error updating config:', updateError);
        return;
    }

    console.log('✅ Successfully removed apps from WebtoysOS desktop!');
    console.log('📊 New app count:', updatedAppRegistry.length);

    // List remaining apps
    console.log('\n📱 Remaining apps on desktop:');
    updatedAppRegistry.forEach(app => {
        console.log(`  - ${app.name} (${app.id})`);
    });
}

// Run the script
removeAppsFromDesktop().catch(console.error);