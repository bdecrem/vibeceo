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

    async function fixTextySyntax() {
        console.log('🔧 Fixing TEXTY windowedApps syntax error...');

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
            const backupPath = path.join(__dirname, '../backups', `webtoys-os-v2_syntax-fix_${timestamp}.html`);
            fs.writeFileSync(backupPath, html);
            console.log('💾 Created backup:', path.basename(backupPath));

            // Fix the missing comma after macpaint
            console.log('🔧 Fixing missing comma...');
            const beforeFix = html.includes('            }\n            \'texty\':');
            
            if (beforeFix) {
                html = html.replace(
                    '            }\n            \'texty\':',
                    '            },\n            \'texty\':'
                );
                console.log('✅ Fixed missing comma after macpaint');
            } else {
                console.log('⚠️  Syntax error not found - may already be fixed');
            }

            // Also fix any HTML structure issues
            console.log('🔧 Fixing HTML structure...');
            
            // Fix the broken MacPAINT icon structure
            const brokenIconPattern = /<div class="icon">🎨<\/div>\s*<\/div>\s*<\/div>\s*<\/body>/;
            if (html.match(brokenIconPattern)) {
                html = html.replace(
                    brokenIconPattern,
                    '<div class="icon">🎨</div>\n        <div class="label">MacPAINT</div>\n    </div>\n    </div>\n</body>'
                );
                console.log('✅ Fixed broken MacPAINT icon structure');
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

            console.log('✅ Successfully fixed TEXTY syntax!');
            console.log('🔗 Live at: https://webtoys.ai/public/webtoys-os-v2');

            // Save fixed version locally
            const fixedPath = path.join(__dirname, '../current-webtoys-os-v2-fixed.html');
            fs.writeFileSync(fixedPath, html);
            console.log('💾 Saved fixed version to:', path.basename(fixedPath));

        } catch (error) {
            console.error('❌ Error:', error);
        }
    }

    await fixTextySyntax();
}, 100);