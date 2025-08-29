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

async function makeAppsResizable() {
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
    
    // Apps to make resizable (text editors, document apps)
    const resizableApps = ['words', 't3xt', 'notepad'];
    
    console.log('\n🔧 Making apps resizable...\n');
    
    let updated = false;
    config.app_registry.forEach(app => {
        if (resizableApps.includes(app.id)) {
            app.resizable = true;
            app.minWidth = 400;
            app.minHeight = 300;
            // Keep existing width/height as defaults
            if (!app.width) app.width = 800;
            if (!app.height) app.height = 600;
            
            console.log(`✅ ${app.icon} ${app.name} - Now resizable`);
            console.log(`   Default: ${app.width}×${app.height}, Min: ${app.minWidth}×${app.minHeight}`);
            updated = true;
        }
    });
    
    if (!updated) {
        console.log('⚠️  No matching apps found to update');
        return;
    }
    
    // Update database
    const { error: updateError } = await supabase
        .from('wtaf_desktop_config')
        .update({
            app_registry: config.app_registry
        })
        .eq('desktop_version', 'webtoys-os-v3');
    
    if (updateError) {
        console.error('Error updating config:', updateError);
    } else {
        console.log('\n✨ Apps successfully updated!');
        console.log('\n📝 Resizable apps have:');
        console.log('   • Resize handles on all edges and corners');
        console.log('   • Minimum size constraints');
        console.log('   • Visual resize grip in bottom-right corner');
        console.log('\n🔄 Refresh the desktop to see the changes:');
        console.log('   https://webtoys.ai/public/toybox-os-v3-test');
    }
}

makeAppsResizable().catch(console.error);