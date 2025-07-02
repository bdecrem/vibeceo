import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, '../../.env.local');
dotenv.config({ path: envPath });

// Verify environment variables
console.log('🔧 Environment Check:');
console.log(`  📍 Loading from: ${envPath}`);
console.log(`  🔗 SUPABASE_URL: ${process.env.SUPABASE_URL ? 'loaded' : 'MISSING'}`);
console.log(`  🔑 SUPABASE_SERVICE_KEY: ${process.env.SUPABASE_SERVICE_KEY ? 'loaded' : 'MISSING'}`);

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ Required environment variables missing:');
  console.error('   SUPABASE_URL and SUPABASE_SERVICE_KEY required');
  process.exit(1);
}

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function testSupabaseConnection() {
  try {
    console.log('🧪 Testing Supabase connection...');
    
    // Test 1: Check if og-images bucket exists
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
    if (bucketsError) throw new Error(`Failed to list buckets: ${bucketsError.message}`);
    
    const ogBucketExists = buckets?.some(bucket => bucket.name === 'og-images');
    console.log(`  📦 og-images bucket: ${ogBucketExists ? 'EXISTS' : 'MISSING'}`);
    
    if (!ogBucketExists) {
      console.log('  🛠️ Creating og-images bucket...');
      const { error: createError } = await supabase.storage.createBucket('og-images', {
        public: true,
        allowedMimeTypes: ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
      });
      if (createError) throw new Error(`Failed to create bucket: ${createError.message}`);
      console.log('  ✅ Created og-images bucket');
    }
    
    // Test 2: Check wtaf_content table structure
    const { data: tableData, error: tableError } = await supabase
      .from('wtaf_content')
      .select('user_slug, app_slug, og_image_url, og_image_cached_at')
      .limit(1);
    
    if (tableError) throw new Error(`Failed to query wtaf_content: ${tableError.message}`);
    console.log(`  📊 wtaf_content table: ACCESSIBLE`);
    
    // Test 3: Count total records
    const { count, error: countError } = await supabase
      .from('wtaf_content')
      .select('*', { count: 'exact', head: true });
    
    if (countError) throw new Error(`Failed to count records: ${countError.message}`);
    console.log(`  📈 Total records in wtaf_content: ${count}`);
    
    console.log('✅ Supabase connection test passed!');
    return true;
    
  } catch (error) {
    console.error('❌ Supabase connection test failed:', error.message);
    return false;
  }
}

async function replaceOGFromUpload(uploadFilename: string) {
  try {
    console.log(`🔄 Processing upload: ${uploadFilename}`);
    
    // Parse filename to extract user and app info
    // Expected format: user-app-something.extension
    // Or: user_app_something.extension
    const nameWithoutExt = path.parse(uploadFilename).name;
    
    // Split only on the first separator to handle app slugs with multiple dashes
    let userSlug, appSlug;
    
    if (nameWithoutExt.includes('-')) {
      const firstDashIndex = nameWithoutExt.indexOf('-');
      userSlug = nameWithoutExt.substring(0, firstDashIndex);
      const remaining = nameWithoutExt.substring(firstDashIndex + 1);
      
      // For app slug, remove any suffix after the last dash that might be a version/test identifier
      // e.g., "coral-jaguar-swimming-test" -> "coral-jaguar-swimming"
      const parts = remaining.split('-');
      if (parts[parts.length - 1] === 'test' || parts[parts.length - 1] === 'custom' || parts[parts.length - 1] === 'v2') {
        appSlug = parts.slice(0, -1).join('-');
      } else {
        appSlug = remaining;
      }
    } else if (nameWithoutExt.includes('_')) {
      const firstUnderscoreIndex = nameWithoutExt.indexOf('_');
      userSlug = nameWithoutExt.substring(0, firstUnderscoreIndex);
      const remaining = nameWithoutExt.substring(firstUnderscoreIndex + 1);
      
      // Same logic for underscores
      const parts = remaining.split('_');
      if (parts[parts.length - 1] === 'test' || parts[parts.length - 1] === 'custom' || parts[parts.length - 1] === 'v2') {
        appSlug = parts.slice(0, -1).join('_');
      } else {
        appSlug = remaining;
      }
    } else {
      throw new Error(`Invalid filename format. Expected: user-app-* or user_app_*`);
    }
    
    console.log(`👤 User: ${userSlug}`);
    console.log(`📱 App: ${appSlug}`);
    
    // Check if the app exists in database
    const { data: existingApp, error: checkError } = await supabase
      .from('wtaf_content')
      .select('user_slug, app_slug, og_image_url')
      .eq('user_slug', userSlug)
      .eq('app_slug', appSlug)
      .single();
    
    if (checkError) {
      throw new Error(`App not found in database: ${userSlug}/${appSlug}`);
    }
    
    console.log(`📋 Found existing app in database`);
    console.log(`   Current OG URL: ${existingApp.og_image_url || 'none'}`);
    
    // Read the uploaded file
    const uploadPath = path.join(__dirname, '../../../web/UPLOADS', uploadFilename);
    const imageBuffer = await fs.readFile(uploadPath);
    console.log(`📁 Read file: ${uploadPath} (${imageBuffer.length} bytes)`);
    
    // Upload to Supabase Storage
    const storageFileName = `${userSlug}-${appSlug}.png`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('og-images')
      .upload(storageFileName, imageBuffer, {
        contentType: 'image/png',
        upsert: true
      });
    
    if (uploadError) {
      throw new Error(`Failed to upload to Supabase Storage: ${uploadError.message}`);
    }
    
    console.log(`☁️ Uploaded to Supabase Storage: ${storageFileName}`);
    
    // Get the public URL
    const { data: urlData } = supabase.storage
      .from('og-images')
      .getPublicUrl(storageFileName);
    
    const ogImageUrl = urlData.publicUrl;
    console.log(`🔗 Public URL: ${ogImageUrl}`);
    
    // Update the wtaf_content table
    const { data: updateData, error: updateError } = await supabase
      .from('wtaf_content')
      .update({ 
        og_image_url: ogImageUrl,
        og_image_cached_at: new Date().toISOString()
      })
      .eq('user_slug', userSlug)
      .eq('app_slug', appSlug);
    
    if (updateError) {
      throw new Error(`Failed to update database: ${updateError.message}`);
    }
    
    console.log(`✅ Updated OG image for ${userSlug}/${appSlug}`);
    console.log(`🌐 New OG URL: ${ogImageUrl}`);
    
    // Verify the update worked
    const { data: verifyData, error: verifyError } = await supabase
      .from('wtaf_content')
      .select('og_image_url, og_image_cached_at')
      .eq('user_slug', userSlug)
      .eq('app_slug', appSlug)
      .single();
    
    if (verifyError) {
      console.warn(`⚠️ Could not verify update: ${verifyError.message}`);
    } else {
      console.log(`✅ Verification: Database updated successfully`);
      console.log(`   URL: ${verifyData.og_image_url}`);
      console.log(`   Cached at: ${verifyData.og_image_cached_at}`);
    }
    
    // Optional: Delete the upload file after processing
    await fs.unlink(uploadPath);
    console.log(`🗑️ Removed upload file: ${uploadFilename}`);
    
    return ogImageUrl;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

// Main function to scan uploads folder and process files
async function processUploads() {
  try {
    // First test Supabase connection
    const connectionOk = await testSupabaseConnection();
    if (!connectionOk) {
      console.error('❌ Supabase connection failed. Aborting.');
      return;
    }
    
    console.log('---');
    
    const uploadsDir = path.join(__dirname, '../../../web/UPLOADS');
    const files = await fs.readdir(uploadsDir);
    
    console.log(`📂 Found ${files.length} files in UPLOADS folder`);
    
    // Filter for image files
    const imageFiles = files.filter(file => 
      /\.(png|jpg|jpeg|gif|webp)$/i.test(file)
    );
    
    if (imageFiles.length === 0) {
      console.log('📷 No image files found to process');
      return;
    }
    
    console.log(`🖼️ Processing ${imageFiles.length} image files:`);
    imageFiles.forEach(file => console.log(`  - ${file}`));
    
    // Process each image file
    for (const filename of imageFiles) {
      try {
        console.log('---');
        await replaceOGFromUpload(filename);
      } catch (error) {
        console.error(`❌ Failed to process ${filename}:`, error.message);
      }
    }
    
    console.log('---');
    console.log('🎉 Finished processing uploads');
    
  } catch (error) {
    console.error('❌ Error scanning uploads:', error.message);
  }
}

// CLI usage
if (process.argv.length > 2) {
  // Process specific file
  const filename = process.argv[2];
  console.log('🎯 Processing specific file...');
  testSupabaseConnection().then(connectionOk => {
    if (connectionOk) {
      console.log('---');
      replaceOGFromUpload(filename);
    }
  });
} else {
  // Process all files in uploads folder
  processUploads();
}

export { replaceOGFromUpload, processUploads }; 