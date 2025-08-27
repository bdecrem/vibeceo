#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment through safe wrapper
import('./safe-update-wrapper.js');

const __dirname = path.dirname(fileURLToPath(import.meta.url));

setTimeout(async () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing required environment variables');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    async function fixTextBDwordsRegistry() {
        console.log('🔧 Fixing Text Editor and BDwords registry...');

        try {
            const { data, error } = await supabase
                .from('wtaf_content')
                .select('*')
                .eq('user_slug', 'public')
                .eq('app_slug', 'webtoys-os-v2')
                .single();

            if (error || !data) {
                console.error('❌ Failed to fetch webtoys-os-v2:', error);
                return;
            }

            let html = data.html_content;
            
            // Backup
            const backupPath = path.join(__dirname, '../backups', `webtoys-os-v2_fix-registry_${new Date().toISOString().replace(/[:.]/g, '-')}.html`);
            fs.writeFileSync(backupPath, html);
            console.log('💾 Created backup');

            // Add Text Editor to windowedApps
            if (!html.includes("'toybox-text-editor':")) {
                console.log('Adding toybox-text-editor to registry...');
                const insertPoint = "window.windowedApps = {";
                html = html.replace(insertPoint, `${insertPoint}
            'toybox-text-editor': {
                name: 'Text',
                url: '/public/toybox-text-editor',
                icon: '📝',
                width: 700,
                height: 500
            },`);
                console.log('✅ Added toybox-text-editor');
            } else {
                console.log('ℹ️ toybox-text-editor already in registry');
            }

            // Add BDwords to windowedApps
            if (!html.includes("'toybox-bdwords':")) {
                console.log('Adding toybox-bdwords to registry...');
                const insertPoint = "window.windowedApps = {";
                html = html.replace(insertPoint, `${insertPoint}
            'toybox-bdwords': {
                name: 'BDwords',
                url: '/public/toybox-bdwords',
                icon: '📄',
                width: 800,
                height: 600
            },`);
                console.log('✅ Added toybox-bdwords');
            } else {
                console.log('ℹ️ toybox-bdwords already in registry');
            }

            // Also fix Chat if needed (app-studio is wrong for Chat)
            const chatIconPattern = /<div class="desktop-icon" onclick="openWindowedApp\('app-studio'\)">\s*<div class="icon">💬<\/div>\s*<div class="label">Chat<\/div>/;
            if (html.match(chatIconPattern)) {
                console.log('Fixing Chat icon to use correct app ID...');
                html = html.replace(chatIconPattern, 
                    `<div class="desktop-icon" onclick="openWindowedApp('toybox-chat')">
            <div class="icon">💬</div>
            <div class="label">Chat</div>`);
                console.log('✅ Fixed Chat to use toybox-chat');
            }

            // Save
            const { error: updateError } = await supabase
                .from('wtaf_content')
                .update({ html_content: html })
                .eq('user_slug', 'public')
                .eq('app_slug', 'webtoys-os-v2');

            if (updateError) {
                console.error('❌ Failed to update:', updateError);
                return;
            }

            console.log('\n✅ Registry fixed!');
            console.log('\nApps should now work:');
            console.log('  📝 Text Editor - /public/toybox-text-editor');
            console.log('  📄 BDwords - /public/toybox-bdwords');
            console.log('  💬 Chat - /public/toybox-chat (if it was broken)');
            console.log('\nView at: https://webtoys.ai/public/webtoys-os-v2');

        } catch (error) {
            console.error('❌ Error:', error);
        }
    }

    fixTextBDwordsRegistry();
}, 100);