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

    async function deployTextEditor() {
        console.log('📝 Deploying Text Editor to database...');

        try {
            // Read the HTML file
            const htmlPath = path.join(__dirname, '../apps/text-editor.html');
            const html = fs.readFileSync(htmlPath, 'utf8');
            console.log('📄 Read text-editor.html (' + html.length + ' bytes)');

            // Check if it already exists
            const { data: existing } = await supabase
                .from('wtaf_content')
                .select('app_slug')
                .eq('user_slug', 'public')
                .eq('app_slug', 'toybox-text-editor')
                .single();

            if (existing) {
                // Update existing
                console.log('🔄 Updating existing Text Editor...');
                const { error } = await supabase
                    .from('wtaf_content')
                    .update({
                        html_content: html,
                        original_prompt: 'Simple text editor for WebtoysOS'
                    })
                    .eq('user_slug', 'public')
                    .eq('app_slug', 'toybox-text-editor');

                if (error) {
                    console.error('❌ Update failed:', error);
                    return;
                }
                console.log('✅ Text Editor updated!');
            } else {
                // Insert new
                console.log('✨ Creating new Text Editor app...');
                const { error } = await supabase
                    .from('wtaf_content')
                    .insert({
                        user_slug: 'public',
                        app_slug: 'toybox-text-editor',
                        html_content: html,
                        original_prompt: 'Simple text editor for WebtoysOS'
                    });

                if (error) {
                    console.error('❌ Insert failed:', error);
                    return;
                }
                console.log('✅ Text Editor created!');
            }

            console.log('');
            console.log('📍 Text Editor is now available at:');
            console.log('   https://webtoys.ai/public/toybox-text-editor');
            console.log('');
            console.log('Next step: Adding to webtoys-os-v2 desktop...');

        } catch (error) {
            console.error('❌ Error:', error);
        }
    }

    deployTextEditor();
}, 100);