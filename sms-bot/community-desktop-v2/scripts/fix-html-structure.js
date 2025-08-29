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

    async function fixHTMLStructure() {
        console.log('🔧 Fixing HTML structure around TEXTY...');

        try {
            // Fetch current webtoys-os-v2
            const { data: current, error } = await supabase
                .from('wtaf_content')
                .select('html_content, updated_at')
                .eq('user_slug', 'public')
                .eq('app_slug', 'webtoys-os-v2')
                .single();

            if (error || !current) {
                console.error('❌ Failed to fetch webtoys-os-v2:', error);
                return;
            }

            let html = current.html_content;
            console.log('✅ Fetched webtoys-os-v2');

            // Create backup
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(__dirname, '../backups', `webtoys-os-v2_html-fix_${timestamp}.html`);
            fs.writeFileSync(backupPath, html);
            console.log('💾 Created backup:', path.basename(backupPath));

            // Fix the broken structure around TEXTY
            console.log('🔧 Fixing broken HTML structure...');
            
            // Look for the broken section
            const brokenSection = `    <div class="icon">🎨</div>
    
    <!-- TEXTY Text Editor -->
    <div class="desktop-icon" 
         style="left: 420px; top: 120px;"
         onclick="openWindowedApp('texty')"
         title="TEXTY Text Editor">
        <div class="icon">📄</div>
        <div class="label">TEXTY</div>
    </div>
        <div class="label">MacPAINT</div>
    </div>`;

            if (html.includes(brokenSection)) {
                // Fix it properly
                const fixedSection = `        <div class="icon">🎨</div>
        <div class="label">MacPAINT</div>
    </div>
    
    <!-- TEXTY Text Editor -->
    <div class="desktop-icon" 
         style="left: 420px; top: 120px;"
         onclick="openWindowedApp('texty')"
         title="TEXTY Text Editor">
        <div class="icon">📄</div>
        <div class="label">TEXTY</div>
    </div>`;

                html = html.replace(brokenSection, fixedSection);
                console.log('✅ Fixed broken HTML structure around TEXTY');
            } else {
                console.log('⚠️  HTML structure pattern not found - may already be fixed');
            }

            // Update database
            console.log('💾 Updating database...');
            const { error: updateError } = await supabase
                .from('wtaf_content')
                .update({ 
                    html_content: html,
                    updated_at: new Date().toISOString()
                })
                .eq('user_slug', 'public')
                .eq('app_slug', 'webtoys-os-v2');

            if (updateError) {
                console.error('❌ Update failed:', updateError);
                return;
            }

            console.log('✅ Successfully fixed HTML structure!');
            console.log('🔗 Live at: https://webtoys.ai/public/webtoys-os-v2');

            // Save fixed version locally
            const fixedPath = path.join(__dirname, '../current-webtoys-os-v2-structure-fixed.html');
            fs.writeFileSync(fixedPath, html);
            console.log('💾 Saved fixed version to:', path.basename(fixedPath));

        } catch (error) {
            console.error('❌ Error:', error);
        }
    }

    await fixHTMLStructure();
}, 100);