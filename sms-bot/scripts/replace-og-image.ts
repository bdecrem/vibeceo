#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// ES module compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check for help first before loading environment
const args = process.argv.slice(2);
if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
  console.log(`
🖼️  WTAF OG Image Replacer

USAGE:
  npm run replace-og-image <user_slug> <app_slug> <image_path> [--force]
  npm run replace-og-image --list <user_slug>

EXAMPLES:
  # Replace OG image for bart's hello-world app
  npm run replace-og-image bart hello-world ./custom-image.png

  # Force replace existing image
  npm run replace-og-image bart hello-world ./new-image.jpg --force

  # List all apps for a user
  npm run replace-og-image --list bart

NOTES:
  • Image should be 1200x630 pixels (OpenGraph standard)
  • Supports PNG, JPG, JPEG formats
  • Max file size: 5MB
  • Use --force to replace existing images
  `);
  process.exit(0);
}

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface ReplaceOGImageOptions {
  userSlug: string;
  appSlug: string;
  imagePath: string;
  force?: boolean;
}

/**
 * Replace the OpenGraph image for a specific app
 */
async function replaceOGImage(options: ReplaceOGImageOptions): Promise<boolean> {
  const { userSlug, appSlug, imagePath, force = false } = options;
  
  console.log(`🔄 Replacing OG image for ${userSlug}/${appSlug}...`);
  
  try {
    // Check if the app exists
    const { data: appData, error: appError } = await supabase
      .from('wtaf_content')
      .select('user_slug, app_slug, original_prompt')
      .eq('user_slug', userSlug)
      .eq('app_slug', appSlug)
      .single();
      
    if (appError || !appData) {
      console.error(`❌ App not found: ${userSlug}/${appSlug}`);
      return false;
    }
    
    console.log(`✅ Found app: "${appData.original_prompt}"`);
    
    // Check if image file exists
    if (!fs.existsSync(imagePath)) {
      console.error(`❌ Image file not found: ${imagePath}`);
      return false;
    }
    
    // Get file info
    const fileStats = fs.statSync(imagePath);
    const fileExtension = path.extname(imagePath).toLowerCase();
    
    console.log(`📁 Image file: ${imagePath} (${(fileStats.size / 1024).toFixed(1)}KB)`);
    
    // Validate file type
    if (!['.png', '.jpg', '.jpeg'].includes(fileExtension)) {
      console.error(`❌ Invalid file type: ${fileExtension}. Use PNG, JPG, or JPEG.`);
      return false;
    }
    
    // Check file size (should be reasonable for OG images)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (fileStats.size > maxSize) {
      console.error(`❌ File too large: ${(fileStats.size / 1024 / 1024).toFixed(1)}MB. Max size is 5MB.`);
      return false;
    }
    
    // Read the image file
    const imageBuffer = fs.readFileSync(imagePath);
    const fileName = `${userSlug}-${appSlug}.png`; // Always use .png for consistency
    
    // Check if existing image exists in storage
    const { data: existingFile } = await supabase.storage
      .from('og-images')
      .list('', { search: fileName });
      
    const imageExists = existingFile && existingFile.length > 0;
    
    if (imageExists && !force) {
      console.log(`⚠️  OG image already exists for ${userSlug}/${appSlug}`);
      console.log(`Use --force flag to replace existing image`);
      return false;
    }
    
    // Upload/replace the image
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('og-images')
      .upload(fileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true // This will replace existing file
      });
      
    if (uploadError) {
      console.error(`❌ Upload failed:`, uploadError.message);
      return false;
    }
    
    console.log(`✅ Successfully uploaded: ${fileName}`);
    
    // Get the public URL to verify
    const { data: urlData } = supabase.storage
      .from('og-images')
      .getPublicUrl(fileName);
      
    console.log(`🌐 Public URL: ${urlData.publicUrl}`);
    console.log(`🎯 This image will now be used for:`);
    console.log(`   • Social media sharing`);
    console.log(`   • App previews on wtaf.me/${userSlug}/${appSlug}`);
    
    return true;
    
  } catch (error) {
    console.error(`❌ Error:`, error instanceof Error ? error.message : String(error));
    return false;
  }
}

/**
 * List all apps for a user
 */
async function listUserApps(userSlug: string): Promise<void> {
  try {
    const { data: apps, error } = await supabase
      .from('wtaf_content')
      .select('app_slug, original_prompt, created_at')
      .eq('user_slug', userSlug)
      .order('created_at', { ascending: false });
      
    if (error) {
      console.error(`❌ Error listing apps:`, error.message);
      return;
    }
    
    if (!apps || apps.length === 0) {
      console.log(`📭 No apps found for user: ${userSlug}`);
      return;
    }
    
    console.log(`📚 Apps for ${userSlug}:`);
    apps.forEach((app, index) => {
      console.log(`  ${index + 1}. ${app.app_slug}`);
      console.log(`     "${app.original_prompt}"`);
      console.log(`     Created: ${new Date(app.created_at).toLocaleDateString()}`);
      console.log();
    });
    
  } catch (error) {
    console.error(`❌ Error:`, error instanceof Error ? error.message : String(error));
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  
  // Handle list command
  if (args[0] === '--list' && args[1]) {
    await listUserApps(args[1]);
    return;
  }
  
  // Handle replace command
  if (args.length < 3) {
    console.error(`❌ Missing arguments. Use --help for usage info.`);
    process.exit(1);
  }
  
  const [userSlug, appSlug, imagePath] = args;
  const force = args.includes('--force');
  
  const success = await replaceOGImage({
    userSlug,
    appSlug,
    imagePath,
    force
  });
  
  process.exit(success ? 0 : 1);
}

main();