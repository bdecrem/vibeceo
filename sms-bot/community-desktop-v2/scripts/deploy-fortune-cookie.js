#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

setTimeout(async () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
    const supabase = createClient(supabaseUrl, supabaseKey);

    async function deployFortuneCookie() {
        console.log('🥠 Deploying Fortune Cookie app to Supabase...');

        try {
            // Read the HTML file
            const htmlPath = path.join(__dirname, '../fortune-cookie-simple.html');
            const htmlContent = fs.readFileSync(htmlPath, 'utf8');
            console.log('✅ Read fortune-cookie-simple.html (', htmlContent.length, 'bytes)');

            // Check if app already exists
            const { data: existingApp, error: checkError } = await supabase
                .from('wtaf_content')
                .select('id, app_slug, user_slug')
                .eq('user_slug', 'public')
                .eq('app_slug', 'fortune-cookie')
                .single();

            if (existingApp && !checkError) {
                console.log('⚠️  Fortune Cookie app already exists, updating...');
                
                // Update existing app
                const { error: updateError } = await supabase
                    .from('wtaf_content')
                    .update({ 
                        html_content: htmlContent,
                        updated_at: new Date().toISOString(),
                        original_prompt: 'Simple Fortune Cookie app - click the cookie to reveal your fortune'
                    })
                    .eq('id', existingApp.id);

                if (updateError) {
                    console.error('❌ Update failed:', updateError);
                    return;
                }
                console.log('✅ Updated existing Fortune Cookie app');
            } else {
                console.log('🆕 Creating new Fortune Cookie app...');
                
                // Insert new app
                const { data, error: insertError } = await supabase
                    .from('wtaf_content')
                    .insert({
                        user_slug: 'public',
                        app_slug: 'fortune-cookie',
                        html_content: htmlContent,
                        original_prompt: 'Simple Fortune Cookie app - click the cookie to reveal your fortune',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    })
                    .select();

                if (insertError) {
                    console.error('❌ Insert failed:', insertError);
                    return;
                }
                console.log('✅ Created new Fortune Cookie app:', data[0].id);
            }

            console.log('🎉 Fortune Cookie app deployed successfully!');
            console.log('🔗 Available at: https://webtoys.ai/public/fortune-cookie');
            console.log('📋 App Features:');
            console.log('  - Single clickable fortune cookie');
            console.log('  - 50+ unique fortune messages');
            console.log('  - Simple crack animation');
            console.log('  - Clean, minimal interface');
            console.log('  - Click for endless fortunes');

        } catch (error) {
            console.error('❌ Error:', error);
        }
    }

    await deployFortuneCookie();
}, 100);