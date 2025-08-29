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

    async function fixTextyParentDiv() {
        console.log('🔧 Fixing TEXTY parent div that has display: none...');

        try {
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
            console.log('✅ Fetched current HTML');

            // Create backup
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(__dirname, '../backups', `webtoys-os-v2_parent-fix_${timestamp}.html`);
            fs.writeFileSync(backupPath, html);
            console.log('💾 Created backup:', path.basename(backupPath));

            // Find TEXTY and its context
            const textyMatch = html.match(/([\s\S]{200})<!-- TEXTY Text Editor -->([\s\S]{500})/);
            if (textyMatch) {
                console.log('🔍 TEXTY context found:');
                console.log('Before TEXTY:', textyMatch[1]);
                console.log('TEXTY section:', textyMatch[2]);
            }

            // The issue is likely that TEXTY is inside a div that got closed improperly
            // Let's move TEXTY outside of any problematic parent div structure
            
            // Find the TEXTY icon block
            const textyIconPattern = /<!-- TEXTY Text Editor -->\s*<div class="desktop-icon"[^>]*onclick="openWindowedApp\('texty'\)"[^>]*>[\s\S]*?<div class="label">TEXTY<\/div>\s*<\/div>/;
            const textyIconMatch = html.match(textyIconPattern);
            
            if (textyIconMatch) {
                console.log('✅ Found TEXTY icon block');
                const textyIconHTML = textyIconMatch[0];
                
                // Remove TEXTY from current location
                html = html.replace(textyIconPattern, '');
                console.log('✅ Removed TEXTY from current location');
                
                // Insert TEXTY right after the desktop div opening, alongside other icons
                const desktopDivPattern = /<div id="desktop">\s*/;
                const desktopMatch = html.match(desktopDivPattern);
                
                if (desktopMatch) {
                    const insertPoint = desktopMatch.index + desktopMatch[0].length;
                    
                    // Clean TEXTY HTML and ensure proper formatting
                    const cleanTextyHTML = `
    <!-- TEXTY Text Editor -->
    <div class="desktop-icon" 
         style="left: 40px; top: 320px;"
         onclick="openWindowedApp('texty')"
         title="TEXTY Text Editor">
        <div class="icon">📄</div>
        <div class="label">TEXTY</div>
    </div>
`;
                    
                    html = html.slice(0, insertPoint) + cleanTextyHTML + html.slice(insertPoint);
                    console.log('✅ Inserted TEXTY right after desktop div opening');
                } else {
                    console.error('❌ Could not find desktop div to insert TEXTY');
                    return;
                }
            } else {
                console.error('❌ Could not find TEXTY icon block');
                return;
            }

            // Update database
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

            console.log('✅ Fixed TEXTY parent div issue!');
            console.log('🔗 TEXTY should now be visible at: https://webtoys.ai/public/webtoys-os-v2');
            
            // Save fixed version
            const fixedPath = path.join(__dirname, '../current-webtoys-os-v2-parent-fixed.html');
            fs.writeFileSync(fixedPath, html);
            console.log('💾 Saved fixed version to:', path.basename(fixedPath));

        } catch (error) {
            console.error('❌ Error:', error);
        }
    }

    await fixTextyParentDiv();
}, 100);