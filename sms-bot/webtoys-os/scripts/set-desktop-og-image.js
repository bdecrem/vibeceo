#!/usr/bin/env node

/**
 * Set OG image for WebtoysOS desktop
 * This script uploads an OG image and updates the database
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../.env.local') });
// Also try the sms-bot directory
if (!process.env.SUPABASE_URL) {
    dotenv.config({ path: path.join(__dirname, '../../.env.local') });
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function setDesktopOGImage() {
    console.log('🖼️  Setting OG image for WebtoysOS desktop...\n');
    
    const imagePath = path.join(__dirname, '../../../web/UPLOADS/og-games.png');
    const desktopSlug = 'toybox-os-v3-test';
    const userSlug = 'public';
    
    // Step 1: Read the image file
    if (!fs.existsSync(imagePath)) {
        console.error(`❌ Image file not found: ${imagePath}`);
        process.exit(1);
    }
    
    const imageBuffer = fs.readFileSync(imagePath);
    console.log(`✅ Read image file (${(imageBuffer.length / 1024 / 1024).toFixed(2)} MB)`);
    
    // Step 2: Upload to Supabase Storage
    const fileName = `${userSlug}-${desktopSlug}-og.png`;
    console.log(`📤 Uploading to Supabase Storage as: ${fileName}`);
    
    // First, try to delete existing file (if any)
    await supabase.storage
        .from('og-images')
        .remove([fileName]);
    
    // Upload the new file
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('og-images')
        .upload(fileName, imageBuffer, {
            contentType: 'image/png',
            upsert: true
        });
    
    if (uploadError) {
        console.error('❌ Failed to upload image:', uploadError);
        process.exit(1);
    }
    
    console.log('✅ Image uploaded to Supabase Storage');
    
    // Step 3: Get the public URL
    const { data: { publicUrl } } = supabase.storage
        .from('og-images')
        .getPublicUrl(fileName);
    
    console.log(`🌐 Public URL: ${publicUrl}`);
    
    // Step 4: Update the database
    console.log('\n📝 Updating database...');
    
    const { data: updateData, error: updateError } = await supabase
        .from('wtaf_content')
        .update({
            og_image_url: publicUrl,
            og_image_override: true,  // Set flag to use the custom OG image
            og_image_cached_at: new Date().toISOString()
        })
        .eq('user_slug', userSlug)
        .eq('app_slug', desktopSlug)
        .select();
    
    if (updateError) {
        console.error('❌ Failed to update database:', updateError);
        process.exit(1);
    }
    
    if (!updateData || updateData.length === 0) {
        console.error('❌ No records updated - check if app exists');
        process.exit(1);
    }
    
    console.log('✅ Database updated successfully');
    
    // Step 5: Verify the update
    const { data: verifyData } = await supabase
        .from('wtaf_content')
        .select('og_image_url, og_image_override')
        .eq('user_slug', userSlug)
        .eq('app_slug', desktopSlug)
        .single();
    
    console.log('\n✨ OG Image successfully set!');
    console.log(`📍 Desktop URL: https://webtoys.ai/${userSlug}/${desktopSlug}`);
    console.log(`🖼️  OG Image URL: ${publicUrl}`);
    console.log('\n💡 The OG image should now appear when sharing the desktop URL on social media.');
    console.log('   Note: Social platforms may cache old images - it can take time to update.');
    
    return publicUrl;
}

// Run the script
setDesktopOGImage().catch(console.error);