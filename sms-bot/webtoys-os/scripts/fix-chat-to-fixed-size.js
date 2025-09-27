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

async function makeChatFixed() {
    try {
        console.log('🔧 Making Toybox Chat window FIXED (not resizable)...');
        
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
        
        // Find and update Toybox Chat to be fixed size
        let updated = false;
        const updatedRegistry = appRegistry.map(app => {
            if (app.id === 'toybox-chat' || app.name === 'Toybox Chat') {
                console.log('📱 Found Toybox Chat, making it FIXED size...');
                console.log('   Was resizable:', app.resizable);
                app.resizable = false;  // Make it FIXED like Sudoku
                console.log('   Now resizable:', app.resizable);
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
            console.log('🎯 Toybox Chat is now FIXED at 600x450 (not resizable)');
        }
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

makeChatFixed().then(() => process.exit(0));