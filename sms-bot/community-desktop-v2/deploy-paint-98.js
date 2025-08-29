#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function deployPaint98() {
    console.log('🎨 Deploying Paint 98 app to Supabase...');

    try {
        const supabaseUrl = process.env.SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
        
        if (!supabaseUrl || !supabaseKey) {
            console.error('❌ Missing Supabase credentials');
            return;
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        // Read the HTML file
        const htmlPath = path.join(__dirname, 'paint-98.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');

        console.log('📄 Read HTML file:', htmlContent.length, 'bytes');

        // Check if app already exists
        const { data: existingApp } = await supabase
            .from('wtaf_content')
            .select('id')
            .eq('user_slug', 'public')
            .eq('app_slug', 'paint-98')
            .single();

        if (existingApp) {
            console.log('📝 Updating existing Paint 98 app...');
            const { error } = await supabase
                .from('wtaf_content')
                .update({
                    html_content: htmlContent,
                    updated_at: new Date().toISOString(),
                    original_prompt: 'Paint 98 - Retro-style Paint app with brush, spray, stamps, eraser tools, gradient colors, expanded color palette, and art gallery'
                })
                .eq('user_slug', 'public')
                .eq('app_slug', 'paint-98');

            if (error) {
                console.error('❌ Update failed:', error);
                return;
            }
            console.log('✅ Updated existing app');
        } else {
            console.log('🆕 Creating new Paint 98 app...');
            const { error } = await supabase
                .from('wtaf_content')
                .insert({
                    user_slug: 'public',
                    app_slug: 'paint-98',
                    html_content: htmlContent,
                    original_prompt: 'Paint 98 - Retro-style Paint app with brush, spray, stamps, eraser tools, gradient colors, expanded color palette, and art gallery',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });

            if (error) {
                console.error('❌ Insert failed:', error);
                return;
            }
            console.log('✅ Created new app');
        }

        console.log('🎉 Paint 98 deployed successfully!');
        console.log('🔗 App URL: https://webtoys.ai/public/paint-98');
        console.log('');
        console.log('🎨 Features included:');
        console.log('  - Paint Brush tool with adjustable size');
        console.log('  - Spray Paint for texture effects');
        console.log('  - Fun Stamps (stars, rainbows, animals)');
        console.log('  - Eraser tool');
        console.log('  - 10 bright colors in retro Paint 98 style');
        console.log('  - 🌈 Rainbow Gradient painting mode');
        console.log('  - 🎨 Expanded color palette with 48+ colors');
        console.log('  - 🖍️ Custom hex color input');
        console.log('  - Art Gallery to save and view creations');
        console.log('  - Authentication integration with ToyBox OS');

    } catch (error) {
        console.error('❌ Deployment error:', error);
    }
}

deployPaint98();