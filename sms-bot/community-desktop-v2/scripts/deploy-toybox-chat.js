#!/usr/bin/env node

/**
 * Deploy ToyBox Chat app and register it with ToyBox OS
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });
if (!process.env.SUPABASE_URL) {
    dotenv.config({ path: path.join(__dirname, '../../.env') });
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function deployChat() {
    try {
        console.log('🚀 Deploying ToyBox Chat...');
        
        // Step 1: Read the chat HTML
        const chatPath = path.join(__dirname, '..', 'toybox-chat.html');
        const chatHtml = await fs.readFile(chatPath, 'utf-8');
        
        // Step 2: Check if chat already exists
        const { data: existing } = await supabase
            .from('wtaf_content')
            .select('id')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-chat')
            .single();
        
        if (existing) {
            // Update existing
            console.log('📝 Updating existing ToyBox Chat...');
            const { error } = await supabase
                .from('wtaf_content')
                .update({
                    html_content: chatHtml,
                    updated_at: new Date().toISOString()
                })
                .eq('user_slug', 'public')
                .eq('app_slug', 'toybox-chat');
            
            if (error) throw error;
        } else {
            // Create new
            console.log('✨ Creating new ToyBox Chat...');
            const { error } = await supabase
                .from('wtaf_content')
                .insert({
                    user_slug: 'public',
                    app_slug: 'toybox-chat',
                    html_content: chatHtml,
                    original_prompt: 'ToyBox Chat - Community chat room with real-time messaging',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            
            if (error) throw error;
        }
        
        console.log('✅ ToyBox Chat deployed to Supabase');
        console.log('📍 URL: https://webtoys.ai/public/toybox-chat');
        
        // Step 3: Register with ToyBox OS
        console.log('\n📱 Registering with ToyBox OS...');
        
        const { data: toyboxData } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os')
            .single();
        
        let toyboxHtml = toyboxData.html_content;
        
        // Backup first
        const backupPath = path.join(__dirname, '..', 'backups', `toybox_before_chat_${Date.now()}.html`);
        await fs.writeFile(backupPath, toyboxHtml);
        console.log(`💾 Backup saved: ${backupPath}`);
        
        // Add Chat to windowedApps if not already there
        if (!toyboxHtml.includes("'toybox-chat':")) {
            const chatRegistration = `
            'toybox-chat': {
                name: 'ToyBox Chat',
                url: '/public/toybox-chat',
                icon: '💬',
                width: 600,
                height: 500
            },`;
            
            // Add after windowedApps declaration
            toyboxHtml = toyboxHtml.replace(
                'window.windowedApps = {',
                `window.windowedApps = {
            ${chatRegistration}`
            );
            
            console.log('✅ Added Chat to app registry');
        }
        
        // Update the Chat desktop icon to use openWindowedApp
        if (toyboxHtml.includes('Chat')) {
            // Find and update the Chat icon
            toyboxHtml = toyboxHtml.replace(
                /<div class="desktop-icon"[^>]*>[\s\S]*?💬[\s\S]*?Chat[\s\S]*?<\/div>\s*<\/div>/,
                `<div class="desktop-icon" onclick="openWindowedApp('toybox-chat')">
                <div class="icon">💬</div>
                <div class="label">Chat</div>
            </div>`
            );
            
            console.log('✅ Updated Chat desktop icon');
        }
        
        // Update ToyBox OS
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({
                html_content: toyboxHtml,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os');
        
        if (updateError) throw updateError;
        
        console.log('✅ ToyBox OS updated with Chat app');
        
        console.log('\n🎉 SUCCESS! ToyBox Chat is ready');
        console.log('📋 Features:');
        console.log('  • Real-time community chat');
        console.log('  • Uses ToyBox OS authentication');
        console.log('  • Auto-refreshes every 5 seconds');
        console.log('  • Shows message history');
        console.log('  • Persists messages via ZAD');
        
        console.log('\n🧪 To test:');
        console.log('  1. Reload ToyBox OS');
        console.log('  2. Login with your account');
        console.log('  3. Click the Chat icon');
        console.log('  4. Start chatting!');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

// Run
deployChat();