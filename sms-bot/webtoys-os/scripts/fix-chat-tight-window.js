#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/.env.local' });

const supabaseUrl = process.env.SUPABASE_URL || 'https://tqniseocczttrfwtpbdr.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseKey) {
    console.error('❌ SUPABASE_SERVICE_KEY not found in environment');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixChatWindow() {
    try {
        console.log('🔧 Fixing Toybox Chat to have tighter window...');
        
        // Get current desktop config
        const { data: configs, error: fetchError } = await supabase
            .from('wtaf_desktop_config')
            .select('*')
            .eq('desktop_version', 'webtoys-os-v3');
            
        if (fetchError || !configs || configs.length === 0) {
            console.error('❌ No desktop config found:', fetchError);
            return;
        }
        
        const config = configs[0];
        const appRegistry = config.app_registry || [];
        
        // Find and update Toybox Chat with exact tight dimensions
        let updated = false;
        const updatedRegistry = appRegistry.map(app => {
            if (app.id === 'toybox-chat' || app.name === 'Toybox Chat') {
                console.log('📱 Found Toybox Chat, setting tight dimensions...');
                console.log('   Old:', `${app.width}x${app.height}`);
                // Set exact dimensions that match the chat UI without padding
                app.width = 600;  // Tighter width
                app.height = 450; // Tighter height
                console.log('   New:', `${app.width}x${app.height}`);
                updated = true;
            }
            return app;
        });
        
        if (!updated) {
            console.log('⚠️ Toybox Chat not found in registry');
            return;
        }
        
        // Update the config
        const { error: updateError } = await supabase
            .from('wtaf_desktop_config')
            .update({
                app_registry: updatedRegistry,
                updated_at: new Date().toISOString()
            })
            .eq('id', config.id);
            
        if (updateError) {
            console.error('❌ Failed to update config:', updateError);
        } else {
            console.log('✅ Desktop config updated successfully!');
            console.log('🎯 Toybox Chat will now open with tight 600x450 window');
            console.log('📝 Window has white background to prevent any bleed-through');
        }
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

fixChatWindow().then(() => process.exit(0));