import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables - try multiple locations
// When compiled, this script runs from dist/scripts/, so we need to go up properly
const envPaths = [
  path.join(__dirname, '../../.env.local'),     // From dist/scripts to sms-bot/.env.local
  path.join(__dirname, '../../../.env.local'),  // From dist/scripts to root/.env.local
  path.join(__dirname, '../.env.local'),        // Fallback for running from scripts/
];

let envLoaded = false;
for (const envPath of envPaths) {
  try {
    if (await fs.access(envPath).then(() => true).catch(() => false)) {
      dotenv.config({ path: envPath });
      console.log(`📍 Loading from: ${envPath}`);
      envLoaded = true;
      break;
    }
  } catch (error) {
    // Continue to next path
  }
}

if (!envLoaded) {
  console.log(`📍 Trying default .env.local loading...`);
  dotenv.config();
}

// Verify environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

console.log('🔧 Environment Check:');
console.log(`  🔗 SUPABASE_URL: ${SUPABASE_URL ? 'loaded' : 'MISSING'}`);
console.log(`  🔑 SUPABASE_SERVICE_KEY: ${SUPABASE_SERVICE_KEY ? 'loaded' : 'MISSING'}`);

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Required environment variables missing:');
  console.error('   SUPABASE_URL and SUPABASE_SERVICE_KEY required');
  console.error('   Please ensure .env.local file exists with these variables');
  process.exit(1);
}

// Initialize Supabase
const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_KEY
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
    
    // Test 2: Check wtaf_content table structure including override field
    const { data: tableData, error: tableError } = await supabase
      .from('wtaf_content')
      .select('user_slug, app_slug, og_image_url, og_image_override, og_image_cached_at')
      .limit(1);
    
    if (tableError) throw new Error(`Failed to query wtaf_content: ${tableError.message}`);
    console.log(`  📊 wtaf_content table: ACCESSIBLE (og_image_override field present)`);
    
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
    
    // Parse filename to extract app slug (since slugs are unique, no username required)
    const nameWithoutExt = path.parse(uploadFilename).name;
    
    // Remove common suffixes like 'test', 'custom', 'v2' 
    const parts = nameWithoutExt.split('-');
    let appSlug = nameWithoutExt;
    
    if (parts.length > 1 && ['test', 'custom', 'v2', 'new', 'updated'].includes(parts[parts.length - 1])) {
      appSlug = parts.slice(0, -1).join('-');
    }
    
    console.log(`📱 App slug: ${appSlug}`);
    
    // Look up the app in database to find the user (since slugs are unique)
    const { data: existingApp, error: checkError } = await supabase
      .from('wtaf_content')
      .select('user_slug, app_slug, og_image_url')
      .eq('app_slug', appSlug)
      .single();
    
    if (checkError) {
      throw new Error(`App not found in database: ${appSlug}`);
    }
    
    const userSlug = existingApp.user_slug;
    console.log(`👤 Found user: ${userSlug}`);
    console.log(`📱 Found app: ${appSlug}`);
    
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
    
    // Update the wtaf_content table with override flag
    console.log(`📝 Updating database with:`);
    console.log(`   og_image_url: ${ogImageUrl}`);
    console.log(`   og_image_override: true`);
    console.log(`   For: ${userSlug}/${appSlug}`);
    
    const { data: updateData, error: updateError } = await supabase
      .from('wtaf_content')
      .update({ 
        og_image_url: ogImageUrl,
        og_image_override: true,  // Set the override flag to true
        og_image_cached_at: new Date().toISOString()
      })
      .eq('user_slug', userSlug)
      .eq('app_slug', appSlug)
      .select();  // Add select to ensure the update completes
    
    if (updateError) {
      throw new Error(`Failed to update database: ${updateError.message}`);
    }
    
    if (!updateData || updateData.length === 0) {
      throw new Error('Update appeared to succeed but no rows were affected');
    }
    
    console.log(`✅ Updated OG image for ${userSlug}/${appSlug}`);
    console.log(`🌟 Override flag set to TRUE - this custom image will stick!`);
    console.log(`🌐 New OG URL: ${ogImageUrl}`);
    
    // Verify the update worked
    const { data: verifyData, error: verifyError } = await supabase
      .from('wtaf_content')
      .select('og_image_url, og_image_override, og_image_cached_at')
      .eq('user_slug', userSlug)
      .eq('app_slug', appSlug)
      .single();
    
    if (verifyError) {
      console.warn(`⚠️ Could not verify update: ${verifyError.message}`);
    } else {
      console.log(`✅ Verification: Database updated successfully`);
      console.log(`   URL: ${verifyData.og_image_url}`);
      console.log(`   Override: ${verifyData.og_image_override}`);
      console.log(`   Cached at: ${verifyData.og_image_cached_at}`);
    }
    
    // Move the upload file to processed folder instead of deleting
    const processedDir = path.join(__dirname, '../../../web/UPLOADS/processed');
    
    // Create processed directory if it doesn't exist
    try {
      await fs.access(processedDir);
    } catch {
      await fs.mkdir(processedDir, { recursive: true });
      console.log(`📁 Created processed directory: ${processedDir}`);
    }
    
    const processedPath = path.join(processedDir, uploadFilename);
    await fs.rename(uploadPath, processedPath);
    console.log(`📦 Moved to processed folder: ${uploadFilename}`);
    
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
  console.log('💡 Expected format: app-slug.extension (e.g., solid-silver-haired-weaving.png)');
  console.log('💡 Username will be automatically looked up from the database');
  testSupabaseConnection().then(connectionOk => {
    if (connectionOk) {
      console.log('---');
      replaceOGFromUpload(filename);
    }
  });
} else {
  // Process all files in uploads folder
  console.log('💡 Expected format: app-slug.extension (e.g., solid-silver-haired-weaving.png)');
  console.log('💡 Username will be automatically looked up from the database');
  processUploads();
}

export { replaceOGFromUpload, processUploads }; 