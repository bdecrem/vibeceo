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

    async function addDebugLogging() {
        console.log('🔧 Adding debug logging to track TEXTY...');

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

            // Create backup
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupPath = path.join(__dirname, '../backups', `webtoys-os-v2_debug_${timestamp}.html`);
            fs.writeFileSync(backupPath, html);
            console.log('💾 Created backup:', path.basename(backupPath));

            // Add debug logging right after DOMContentLoaded
            const debugCode = `
        // DEBUG: Track TEXTY specifically
        console.log('🔍 TEXTY DEBUG: Page loaded, checking for TEXTY...');
        setTimeout(function() {
            const textyIcons = document.querySelectorAll('[onclick*="texty"]');
            console.log('🔍 TEXTY DEBUG: Found', textyIcons.length, 'TEXTY elements');
            
            textyIcons.forEach(function(icon, i) {
                console.log('🔍 TEXTY DEBUG Element', i + ':', {
                    display: icon.style.display || 'default',
                    left: icon.style.left || 'default',
                    top: icon.style.top || 'default',
                    visible: icon.offsetParent !== null,
                    innerHTML: icon.innerHTML.slice(0, 100)
                });
                
                // Force make it visible for testing
                icon.style.backgroundColor = 'red';
                icon.style.border = '3px solid yellow';
                icon.style.zIndex = '9999';
            });
        }, 2000);`;

            // Insert debug code after DOMContentLoaded event listener
            const insertPoint = html.indexOf('document.addEventListener(\'DOMContentLoaded\', function() {');
            if (insertPoint !== -1) {
                const insertAfter = html.indexOf('});', insertPoint) + 3;
                html = html.slice(0, insertAfter) + debugCode + html.slice(insertAfter);
                console.log('✅ Added debug logging code');
            } else {
                // Fallback: add at end of script
                const scriptEndPoint = html.lastIndexOf('</script>');
                html = html.slice(0, scriptEndPoint) + debugCode + html.slice(scriptEndPoint);
                console.log('✅ Added debug logging code (fallback)');
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

            console.log('✅ Added debug logging to webtoys-os-v2');
            console.log('🔗 Check console at: https://webtoys.ai/public/webtoys-os-v2');
            console.log('📋 Look for "TEXTY DEBUG" messages in browser console');

        } catch (error) {
            console.error('❌ Error:', error);
        }
    }

    await addDebugLogging();
}, 100);