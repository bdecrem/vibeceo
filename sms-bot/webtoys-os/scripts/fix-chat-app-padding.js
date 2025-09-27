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

async function fixChatAppPadding() {
    try {
        console.log('🔧 Fixing Toybox Chat app to remove padding...');
        
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
        
        console.log('📝 Original HTML has gradient background and padding...');
        
        // Fix the body background to be white and remove any padding
        htmlContent = htmlContent.replace(
            /body\s*{\s*[^}]*}/,
            `body {
            font-family: -apple-system, BlinkMacSystemFont, "Inter", "DM Sans", system-ui, sans-serif;
            background: white;
            margin: 0;
            padding: 0;
            height: 100vh;
            overflow: hidden;
        }`
        );
        
        // Fix the container to have no padding and fill the window
        htmlContent = htmlContent.replace(
            /.container\s*{\s*[^}]*}/,
            `.container {
            max-width: 100%;
            width: 100%;
            height: 100vh;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 0;
            box-shadow: none;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            margin: 0;
            padding: 0;
        }`
        );
        
        // Update the app in the database
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
            console.log('✅ Chat app updated successfully!');
            console.log('🎯 The chat now fills the window completely with no padding');
            console.log('📏 Window remains at 600x450 fixed size');
        }
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

fixChatAppPadding().then(() => process.exit(0));