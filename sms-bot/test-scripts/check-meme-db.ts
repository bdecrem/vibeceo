#!/usr/bin/env ts-node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { join } from 'path';

// Load environment variables
config({ path: join(__dirname, '../../.env.local') });

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_KEY!
);

async function checkMemeApp() {
    const appSlug = "linen-baboon-nurturing";
    const userSlug = "bart";

    console.log(`🔍 Checking ${userSlug}/${appSlug}...`);

    try {
        // Check wtaf_content table
        const { data, error } = await supabase
            .from('wtaf_content')
            .select('*')
            .eq('user_slug', userSlug)
            .eq('app_slug', appSlug);

        if (error) {
            console.error('❌ Database error:', error);
            return;
        }

        if (data && data.length > 0) {
            const app = data[0];
            console.log(`✅ Found app in database:`);
            console.log(`   📝 Type: ${app.type}`);
            console.log(`   🎨 Coach: ${app.coach}`);
            console.log(`   🖼️ OG Image URL: ${app.og_image_url}`);
            console.log(`   📅 Created: ${app.created_at}`);
            console.log(`   💬 Prompt: ${(app.original_prompt || 'No prompt').substring(0, 100)}...`);
            
            // Check if HTML contains meme content
            const htmlContent = app.html_content || '';
            if (htmlContent.includes('meme-container')) {
                console.log(`   🎭 HTML contains meme content: YES`);
            } else {
                console.log(`   🎭 HTML contains meme content: NO`);
            }
            
            // Check for meme image URLs in HTML
            const memeImages = htmlContent.match(/meme-\d+-[a-z0-9]+\.png/g);
            if (memeImages) {
                console.log(`   🖼️ Meme images in HTML: ${memeImages.join(', ')}`);
            } else {
                console.log(`   🖼️ No meme images found in HTML`);
            }
            
            // Check if the fix should work
            if (app.type === 'MEME' && app.og_image_url) {
                console.log(`   ✅ Should work with new fix: YES`);
            } else {
                console.log(`   ❌ Should work with new fix: NO (missing type or og_image_url)`);
            }
            
        } else {
            console.log("❌ App not found in database!");
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

checkMemeApp(); 