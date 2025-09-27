#!/usr/bin/env node

/**
 * Update WebtoysOS desktop title for better social sharing
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function updateDesktopTitle() {
    console.log('📝 Updating WebtoysOS desktop title to "BUILD PLAY SHARE"...\n');
    
    const userSlug = 'public';
    const appSlug = 'toybox-os-v3-test';
    const newTitle = 'BUILD PLAY SHARE';
    const newDescription = 'BUILD PLAY SHARE - WebtoysOS Community Desktop';
    
    // Step 1: Get current HTML content
    const { data: currentData, error: fetchError } = await supabase
        .from('wtaf_content')
        .select('html_content')
        .eq('user_slug', userSlug)
        .eq('app_slug', appSlug)
        .single();
    
    if (fetchError || !currentData) {
        console.error('❌ Failed to fetch current content:', fetchError);
        process.exit(1);
    }
    
    let htmlContent = currentData.html_content;
    console.log('✅ Fetched current HTML content');
    
    // Step 2: Update the HTML title tag
    htmlContent = htmlContent.replace(
        /<title>.*?<\/title>/,
        `<title>${newTitle}</title>`
    );
    
    // Step 3: Update or add OG meta tags for better social sharing
    // Remove any existing OG title tags
    htmlContent = htmlContent.replace(/<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/gi, '');
    htmlContent = htmlContent.replace(/<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/gi, '');
    htmlContent = htmlContent.replace(/<meta\s+property="og:type"\s+content="[^"]*"\s*\/?>/gi, '');
    htmlContent = htmlContent.replace(/<meta\s+name="description"\s+content="[^"]*"\s*\/?>/gi, '');
    
    // Add new meta tags right after the title tag
    const metaTags = `
    <meta name="description" content="${newDescription}">
    <meta property="og:title" content="${newTitle}">
    <meta property="og:description" content="${newDescription}">
    <meta property="og:type" content="website">`;
    
    htmlContent = htmlContent.replace(
        /<\/title>/,
        `</title>${metaTags}`
    );
    
    console.log('✅ Updated HTML title and meta tags');
    
    // Step 4: Update the database
    const { data: updateData, error: updateError } = await supabase
        .from('wtaf_content')
        .update({
            html_content: htmlContent,
            original_prompt: newDescription,
            updated_at: new Date().toISOString(),
            // Force cache refresh
            og_image_cached_at: new Date().toISOString()
        })
        .eq('user_slug', userSlug)
        .eq('app_slug', appSlug)
        .select();
    
    if (updateError) {
        console.error('❌ Failed to update database:', updateError);
        process.exit(1);
    }
    
    console.log('✅ Database updated successfully');
    
    // Step 5: Clear any Next.js cache by hitting the page
    console.log('\n🔄 Triggering cache refresh...');
    
    try {
        // Hit the main page to trigger revalidation
        const response = await fetch(`https://webtoys.ai/${userSlug}/${appSlug}`, {
            headers: {
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            }
        });
        
        if (response.ok) {
            console.log('✅ Page cache refreshed');
        }
        
        // Also hit the OG API to ensure it picks up changes
        const ogResponse = await fetch(`https://webtoys.ai/api/generate-og-cached?user=${userSlug}&app=${appSlug}`, {
            headers: {
                'Cache-Control': 'no-cache'
            }
        });
        
        const ogData = await ogResponse.json();
        console.log('✅ OG API response:', ogData.image_url ? 'Image URL confirmed' : 'Check failed');
        
    } catch (error) {
        console.log('⚠️  Could not refresh cache (this is normal in development)');
    }
    
    console.log('\n✨ Title update complete!');
    console.log(`📍 Desktop URL: https://webtoys.ai/${userSlug}/${appSlug}`);
    console.log(`📱 New title: "${newTitle}"`);
    console.log(`📝 Description: "${newDescription}"`);
    console.log('\n💡 Notes:');
    console.log('   - The new title will appear when sharing on iMessage, Twitter, etc.');
    console.log('   - Social platforms may cache the old title for a while');
    console.log('   - The OG image should work correctly with the new routing');
    console.log('   - No iframe issues since the desktop loads directly');
}

// Run the script
updateDesktopTitle().catch(console.error);