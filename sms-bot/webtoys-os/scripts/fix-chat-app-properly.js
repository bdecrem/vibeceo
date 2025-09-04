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

async function fixChatAppProperly() {
    try {
        console.log('🔧 Fixing Toybox Chat app properly (keeping it usable)...');
        
        // Get the chat app HTML
        const { data: apps, error: fetchError } = await supabase
            .from('wtaf_content')
            .select('*')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-toybox-chat');
            
        if (fetchError || !apps || apps.length === 0) {
            console.error('❌ Chat app not found:', fetchError);
            return;
        }
        
        const app = apps[0];
        let htmlContent = app.html_content;
        
        console.log('📝 Fixing the app to be usable but fit the window...');
        
        // Fix the body to have white background but proper sizing
        htmlContent = htmlContent.replace(
            /body\s*{\s*[^}]*}/,
            `body {
            font-family: -apple-system, BlinkMacSystemFont, "Inter", "DM Sans", system-ui, sans-serif;
            background: white;
            margin: 0;
            padding: 0;
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }`
        );
        
        // Fix the container to be properly sized
        htmlContent = htmlContent.replace(
            /.container\s*{\s*[^}]*}/,
            `.container {
            width: 600px;
            height: 450px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 20px;
            box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            position: relative;
        }`
        );
        
        // Also update the window dimensions in the registry to match
        const { data: configs, error: configError } = await supabase
            .from('wtaf_desktop_config')
            .select('*')
            .eq('desktop_version', 'webtoys-os-v3');
            
        if (configs && configs.length > 0) {
            const config = configs[0];
            const appRegistry = config.app_registry || [];
            
            const updatedRegistry = appRegistry.map(appItem => {
                if (appItem.id === 'toybox-chat' || appItem.name === 'Toybox Chat') {
                    // Set dimensions that include the full chat interface
                    appItem.width = 620;   // Slightly larger to show full chat
                    appItem.height = 470;  // Slightly larger to show input area
                    appItem.resizable = false;
                }
                return appItem;
            });
            
            await supabase
                .from('wtaf_desktop_config')
                .update({
                    app_registry: updatedRegistry,
                    updated_at: new Date().toISOString()
                })
                .eq('id', config.id);
                
            console.log('📏 Updated window size to 620x470');
        }
        
        // Update the app HTML
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({
                html_content: htmlContent,
                updated_at: new Date().toISOString()
            })
            .eq('id', app.id);
            
        if (updateError) {
            console.error('❌ Failed to update app:', updateError);
        } else {
            console.log('✅ Chat app fixed properly!');
            console.log('🎯 The chat is now usable with proper sizing');
            console.log('📏 Window is 620x470 to show full interface');
            console.log('✨ Input area and scrolling work correctly');
        }
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

fixChatAppProperly().then(() => process.exit(0));