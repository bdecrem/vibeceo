import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables FIRST
const envPath = path.join(__dirname, '../../.env.local');
dotenv.config({ path: envPath });

// Debug environment loading
console.log('🔧 Environment Debug:');
console.log(`  📍 Loading from: ${envPath}`);
console.log(`  🔗 SUPABASE_URL: ${process.env.SUPABASE_URL ? 'loaded' : 'MISSING'}`);
console.log(`  🔑 SUPABASE_SERVICE_KEY: ${process.env.SUPABASE_SERVICE_KEY ? 'loaded' : 'MISSING'}`);

// Verify required environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('❌ Required environment variables missing');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function createTestImage() {
  // Create a simple test PNG file (1x1 transparent pixel)
  const pngData = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
    0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
    0x89, 0x00, 0x00, 0x00, 0x0A, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
    0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00,
    0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, // IEND chunk
    0x42, 0x60, 0x82
  ]);
  
  return pngData;
}

async function findTestableApp() {
  try {
    console.log('🔍 Finding an existing app to test with...');
    
    const { data: apps, error } = await supabase
      .from('wtaf_content')
      .select('user_slug, app_slug, og_image_url')
      .eq('status', 'published')
      .limit(5);
    
    if (error) throw new Error(`Failed to query apps: ${error.message}`);
    
    if (!apps || apps.length === 0) {
      throw new Error('No published apps found in database');
    }
    
    console.log(`📋 Found ${apps.length} apps:`);
    apps.forEach((app, i) => {
      console.log(`  ${i+1}. ${app.user_slug}/${app.app_slug} (OG: ${app.og_image_url ? 'set' : 'none'})`);
    });
    
    // Use the first app
    const testApp = apps[0];
    console.log(`🎯 Using: ${testApp.user_slug}/${testApp.app_slug}`);
    
    return testApp;
    
  } catch (error) {
    console.error('❌ Error finding test app:', error.message);
    return null;
  }
}

async function runTest() {
  try {
    console.log('🧪 Starting comprehensive OG upload test...\n');
    
    // Step 1: Find a testable app
    const testApp = await findTestableApp();
    if (!testApp) {
      console.error('❌ Cannot run test without an existing app');
      return;
    }
    
    console.log('---');
    
    // Step 2: Create test image file
    console.log('🖼️ Creating test image...');
    const testImageData = await createTestImage();
    const testFilename = `${testApp.user_slug}-${testApp.app_slug}-test.png`;
    const uploadPath = path.join(__dirname, '../../../web/UPLOADS', testFilename);
    
    await fs.writeFile(uploadPath, testImageData);
    console.log(`✅ Created test image: ${uploadPath}`);
    
    console.log('---');
    
    // Step 3: Record the original OG URL
    const originalOgUrl = testApp.og_image_url;
    console.log(`📝 Original OG URL: ${originalOgUrl || 'none'}`);
    
    console.log('---');
    
    // Step 4: Import and run the upload script
    console.log('🚀 Running upload script...');
    const { replaceOGFromUpload } = await import('../scripts/replace-og-from-upload.js');
    
    const newOgUrl = await replaceOGFromUpload(testFilename);
    
    console.log('---');
    
    // Step 5: Verify the changes
    console.log('🔍 Verifying results...');
    
    const { data: updatedApp, error: verifyError } = await supabase
      .from('wtaf_content')
      .select('og_image_url, og_image_cached_at')
      .eq('user_slug', testApp.user_slug)
      .eq('app_slug', testApp.app_slug)
      .single();
    
    if (verifyError) {
      throw new Error(`Verification failed: ${verifyError.message}`);
    }
    
    console.log('📊 Test Results:');
    console.log(`  Original URL: ${originalOgUrl || 'none'}`);
    console.log(`  New URL: ${updatedApp.og_image_url}`);
    console.log(`  Cached at: ${updatedApp.og_image_cached_at}`);
    console.log(`  URL changed: ${originalOgUrl !== updatedApp.og_image_url ? 'YES' : 'NO'}`);
    console.log(`  Contains user-app: ${updatedApp.og_image_url?.includes(`${testApp.user_slug}-${testApp.app_slug}`) ? 'YES' : 'NO'}`);
    
    // Step 6: Test the image URL accessibility
    console.log('🌐 Testing image accessibility...');
    try {
      const response = await fetch(updatedApp.og_image_url!);
      console.log(`  HTTP Status: ${response.status}`);
      console.log(`  Content Type: ${response.headers.get('content-type')}`);
      console.log(`  Image accessible: ${response.ok ? 'YES' : 'NO'}`);
    } catch (error) {
      console.log(`  Image accessibility test failed: ${error.message}`);
    }
    
    console.log('---');
    console.log('✅ Test completed successfully!');
    
    // Optional: Restore original URL if requested
    const restoreOriginal = process.argv.includes('--restore');
    if (restoreOriginal && originalOgUrl) {
      console.log('🔄 Restoring original OG URL...');
      await supabase
        .from('wtaf_content')
        .update({ og_image_url: originalOgUrl })
        .eq('user_slug', testApp.user_slug)
        .eq('app_slug', testApp.app_slug);
      console.log('✅ Restored original URL');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

runTest();