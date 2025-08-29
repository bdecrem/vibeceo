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

    async function addTextEditorToDesktop() {
        console.log('🖥️ Adding Text Editor to webtoys-os-v2 desktop...');

        try {
            // Fetch webtoys-os-v2
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
            console.log('✅ Fetched webtoys-os-v2');

            // Backup
            const backupPath = path.join(__dirname, '../backups', `webtoys-os-v2_before_text_${new Date().toISOString().replace(/[:.]/g, '-')}.html`);
            fs.writeFileSync(backupPath, html);
            console.log('💾 Created backup');

            // Step 1: Add to windowedApps
            if (!html.includes("'toybox-text-editor'")) {
                console.log('📝 Adding to windowedApps registry...');
                const windowedAppsPattern = /(window\.windowedApps = \{[^}]*)(}\s*;)/s;
                html = html.replace(windowedAppsPattern, (match, p1, p2) => {
                    return p1 + `,
            'toybox-text-editor': {
                name: 'Text',
                url: '/public/toybox-text-editor',
                icon: '📝',
                width: 700,
                height: 500
            }` + p2;
                });
                console.log('✅ Added to windowedApps');
            }

            // Step 2: Add desktop icon (after Sudoku if present, or after Chat)
            if (!html.includes('onclick="openWindowedApp(\'toybox-text-editor\')"')) {
                console.log('🎨 Adding desktop icon...');
                
                // Try to add after Sudoku
                let inserted = false;
                const sudokuPattern = /(<div class="desktop-icon"[^>]*onclick="openWindowedApp\('sudoku'\)"[^>]*>[\s\S]*?<\/div>\s*<\/div>)/;
                if (html.match(sudokuPattern)) {
                    html = html.replace(sudokuPattern, (match) => {
                        inserted = true;
                        return match + `
        <div class="desktop-icon" onclick="openWindowedApp('toybox-text-editor')">
            <div class="icon">📝</div>
            <div class="label">Text</div>
        </div>`;
                    });
                }
                
                // If not inserted, try after Chat
                if (!inserted) {
                    const chatPattern = /(<div class="desktop-icon"[^>]*onclick="openWindowedApp\('chat'\)"[^>]*>[\s\S]*?<\/div>\s*<\/div>)/;
                    html = html.replace(chatPattern, (match) => {
                        inserted = true;
                        return match + `
        <div class="desktop-icon" onclick="openWindowedApp('toybox-text-editor')">
            <div class="icon">📝</div>
            <div class="label">Text</div>
        </div>`;
                    });
                }
                
                console.log(inserted ? '✅ Added desktop icon' : '⚠️ Could not add desktop icon');
            }

            // Save updated desktop
            console.log('💾 Saving to database...');
            const { error: updateError } = await supabase
                .from('wtaf_content')
                .update({ html_content: html })
                .eq('user_slug', 'public')
                .eq('app_slug', 'webtoys-os-v2');

            if (updateError) {
                console.error('❌ Failed to update:', updateError);
                return;
            }

            console.log('✅ Text Editor added to desktop!');
            console.log('');
            console.log('📝 The Text Editor is now available:');
            console.log('   - Desktop icon: 📝 Text');
            console.log('   - Window size: 700x500');
            console.log('   - Direct URL: https://webtoys.ai/public/toybox-text-editor');
            console.log('');
            console.log('🖥️ View desktop at: https://webtoys.ai/public/webtoys-os-v2');

        } catch (error) {
            console.error('❌ Error:', error);
        }
    }

    addTextEditorToDesktop();
}, 100);