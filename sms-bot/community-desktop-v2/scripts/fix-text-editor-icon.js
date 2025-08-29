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

    async function fixTextEditorIcon() {
        console.log('🔧 Adding Text Editor icon to desktop...');

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
            const backupPath = path.join(__dirname, '../backups', `webtoys-os-v2_text-icon-fix_${new Date().toISOString().replace(/[:.]/g, '-')}.html`);
            fs.writeFileSync(backupPath, html);
            console.log('💾 Created backup');

            // Check if icon already exists
            if (html.includes('onclick="openWindowedApp(\'toybox-text-editor\')"')) {
                console.log('✅ Text Editor icon already exists');
                return;
            }

            // Find the desktop div and add the icon
            // Look for the desktop area with existing icons
            const desktopPattern = /(<!-- Desktop Icons -->[\s\S]*?)(<\/div>\s*<!-- Window Container -->)/;
            const match = html.match(desktopPattern);
            
            if (match) {
                // Add the Text icon before the closing div
                const newIcon = `
        <div class="desktop-icon" onclick="openWindowedApp('toybox-text-editor')">
            <div class="icon">📝</div>
            <div class="label">Text</div>
        </div>
        `;
                
                html = html.replace(desktopPattern, (fullMatch, p1, p2) => {
                    return p1 + newIcon + p2;
                });
                console.log('✅ Added Text Editor icon');
            } else {
                // Alternative: Find a specific icon and add after it
                const appStudioPattern = /(<div class="desktop-icon"[^>]*onclick="openWindowedApp\('app-studio'\)"[^>]*>.*?<\/div>\s*<\/div>)/s;
                if (html.match(appStudioPattern)) {
                    html = html.replace(appStudioPattern, (match) => {
                        return match + `
        <div class="desktop-icon" onclick="openWindowedApp('toybox-text-editor')">
            <div class="icon">📝</div>
            <div class="label">Text</div>
        </div>`;
                    });
                    console.log('✅ Added Text Editor icon after App Studio');
                } else {
                    console.error('❌ Could not find place to add icon');
                    return;
                }
            }

            // Also ensure it's in windowedApps if not already
            if (!html.includes("'toybox-text-editor':")) {
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
                console.log('✅ Added to windowedApps registry');
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

            console.log('✅ Text Editor icon fixed!');
            console.log('');
            console.log('The Text Editor icon should now be visible on the desktop.');
            console.log('View at: https://webtoys.ai/public/webtoys-os-v2');

        } catch (error) {
            console.error('❌ Error:', error);
        }
    }

    fixTextEditorIcon();
}, 100);