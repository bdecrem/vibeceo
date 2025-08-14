import { createClient } from '@supabase/supabase-js';
import fetch from 'node-fetch';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPaths = [
  path.join(__dirname, '../.env.local'),
  path.join(__dirname, '../../.env.local'),
];

for (const envPath of envPaths) {
  try {
    dotenv.config({ path: envPath });
    console.log(`📍 Loaded env from: ${envPath}`);
    break;
  } catch (error) {
    // Continue to next path
  }
}

// Get service key (support both naming conventions)
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (!process.env.SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

// Initialize Supabase
const supabase = createClient(
  process.env.SUPABASE_URL!,
  SUPABASE_SERVICE_KEY!
);

// Get the web app URL
const WEB_APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://theaf.us';

async function testOGOverride(userSlug: string, appSlug: string) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`🧪 Testing OG Override for: ${userSlug}/${appSlug}`);
  console.log(`${'='.repeat(60)}\n`);

  // Step 1: Check database values
  console.log('📊 Step 1: Checking database values...');
  const { data: dbData, error: dbError } = await supabase
    .from('wtaf_content')
    .select('type, og_image_url, og_image_override, og_second_chance')
    .eq('user_slug', userSlug)
    .eq('app_slug', appSlug)
    .single();

  if (dbError) {
    console.error('❌ Database error:', dbError.message);
    return false;
  }

  console.log('   Type:', dbData.type);
  console.log('   og_image_override:', dbData.og_image_override);
  console.log('   og_image_url:', dbData.og_image_url || 'NULL');
  console.log('   og_second_chance:', dbData.og_second_chance || 'NULL');

  if (!dbData.og_image_override) {
    console.warn('⚠️  Override flag is FALSE - custom image won\'t be used!');
  }

  // Step 2: Test the API endpoint
  console.log('\n📡 Step 2: Testing API endpoint...');
  const apiUrl = `${WEB_APP_URL}/api/generate-og-cached?user=${userSlug}&app=${appSlug}`;
  console.log('   API URL:', apiUrl);

  try {
    const apiResponse = await fetch(apiUrl);
    const apiData = await apiResponse.json() as any;
    
    console.log('   API Response:');
    console.log('   - success:', apiData.success);
    console.log('   - image_url:', apiData.image_url);
    console.log('   - custom_override:', apiData.custom_override || false);
    console.log('   - type_based:', apiData.type_based || false);
    console.log('   - is_meme:', apiData.is_meme || false);

    // Verify the API is returning the correct image
    if (dbData.og_image_override && dbData.og_image_url) {
      if (apiData.image_url === dbData.og_image_url) {
        console.log('✅ API correctly returns custom override image!');
      } else {
        console.error('❌ API not returning override image!');
        console.error('   Expected:', dbData.og_image_url);
        console.error('   Got:', apiData.image_url);
      }
    }
  } catch (error: any) {
    console.error('❌ API error:', error.message);
  }

  // Step 3: Check the actual page meta tags
  console.log('\n🌐 Step 3: Checking actual page meta tags...');
  const pageUrl = `${WEB_APP_URL}/wtaf/${userSlug}/${appSlug}`;
  console.log('   Page URL:', pageUrl);

  try {
    const pageResponse = await fetch(pageUrl);
    const html = await pageResponse.text();
    const $ = cheerio.load(html);
    
    // Find OG image meta tag
    const ogImageTag = $('meta[property="og:image"]');
    const ogImageUrl = ogImageTag.attr('content');
    
    console.log('   OG Image in HTML:', ogImageUrl || 'NOT FOUND');
    
    if (!ogImageUrl) {
      console.error('❌ No og:image meta tag found in HTML!');
      
      // Check if there's an API call in the HTML
      if (html.includes('/api/generate-og')) {
        console.log('   ℹ️  Page contains API call for OG generation');
      }
    } else {
      // Check if it matches what we expect
      if (dbData.og_image_override && dbData.og_image_url) {
        if (ogImageUrl === dbData.og_image_url) {
          console.log('✅ Page meta tag shows custom override image!');
        } else if (ogImageUrl.includes('/api/generate-og')) {
          console.warn('⚠️  Page is using dynamic OG generation API');
          console.log('   This means OG image is generated on-demand');
        } else {
          console.error('❌ Page meta tag shows wrong image!');
          console.error('   Expected:', dbData.og_image_url);
          console.error('   Got:', ogImageUrl);
        }
      }
    }

    // Check for other OG tags
    const ogTitle = $('meta[property="og:title"]').attr('content');
    const ogType = $('meta[property="og:type"]').attr('content');
    console.log('   OG Title:', ogTitle || 'NOT FOUND');
    console.log('   OG Type:', ogType || 'NOT FOUND');

  } catch (error) {
    console.error('❌ Page fetch error:', error.message);
  }

  // Step 4: Test cache-busting
  console.log('\n🔄 Step 4: Testing with cache-buster...');
  const cacheBustUrl = `${pageUrl}?cb=${Date.now()}`;
  console.log('   URL with cache buster:', cacheBustUrl);
  
  try {
    const cbResponse = await fetch(cacheBustUrl);
    const cbHtml = await cbResponse.text();
    const $cb = cheerio.load(cbHtml);
    const cbOgImage = $cb('meta[property="og:image"]').attr('content');
    console.log('   OG Image (cache-busted):', cbOgImage || 'NOT FOUND');
  } catch (error) {
    console.error('❌ Cache-bust test error:', error.message);
  }

  console.log('\n' + '='.repeat(60));
  console.log('📋 SUMMARY:');
  console.log('='.repeat(60));
  
  // Final diagnosis
  if (dbData.og_image_override && !dbData.og_image_url) {
    console.log('🚨 ISSUE: Override flag is TRUE but og_image_url is empty!');
    console.log('   FIX: Run the upload script again or manually set og_image_url');
  } else if (!dbData.og_image_override && dbData.og_image_url) {
    console.log('🚨 ISSUE: Has custom image but override flag is FALSE!');
    console.log('   FIX: Set og_image_override = true in database');
  } else if (dbData.og_image_override && dbData.og_image_url) {
    console.log('✅ Database configuration looks correct');
    console.log('   If image not showing, likely a caching issue:');
    console.log('   - Clear browser cache');
    console.log('   - Use Facebook Sharing Debugger to refresh');
    console.log('   - Wait for CDN cache to expire');
  }

  return true;
}

// Main execution
const args = process.argv.slice(2);
if (args.length < 2) {
  console.log('Usage: npm run test:og-override <user-slug> <app-slug>');
  console.log('Example: npm run test:og-override bart azure-phoenix-jumping');
  process.exit(1);
}

const [userSlug, appSlug] = args;
testOGOverride(userSlug, appSlug).catch(console.error);