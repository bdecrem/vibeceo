import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, '../../.env.local');
dotenv.config({ path: envPath });

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

async function debugOGIssue(userSlug: string, appSlug: string) {
  console.log('🔍 Debugging OG Image Issue');
  console.log(`📱 App: ${userSlug}/${appSlug}`);
  console.log('='.repeat(60));
  
  try {
    // 1. Check what's in the database
    console.log('1️⃣ DATABASE CHECK:');
    const { data: dbData, error: dbError } = await supabase
      .from('wtaf_content')
      .select('user_slug, app_slug, og_image_url, og_image_cached_at, html_content')
      .eq('user_slug', userSlug)
      .eq('app_slug', appSlug)
      .single();
    
    if (dbError) {
      console.error(`❌ Database Error: ${dbError.message}`);
      return;
    }
    
    console.log(`✅ App found in database`);
    console.log(`📅 OG URL: ${dbData.og_image_url || 'NULL'}`);
    console.log(`⏰ Cached at: ${dbData.og_image_cached_at || 'NULL'}`);
    
    // 2. Check what meta tags are in the HTML
    console.log('\n2️⃣ HTML META TAGS CHECK:');
    const html = dbData.html_content;
    
    // Extract OG image meta tag
    const ogImageMatch = html.match(/<meta property="og:image" content="([^"]*)" \/>/);
    const actualOgUrl = ogImageMatch ? ogImageMatch[1] : 'NOT FOUND';
    
    console.log(`🏷️ Meta tag OG URL: ${actualOgUrl}`);
    
    // 3. Compare database vs HTML
    console.log('\n3️⃣ COMPARISON:');
    const dbOgUrl = dbData.og_image_url;
    const match = dbOgUrl === actualOgUrl;
    
    console.log(`🎯 Database: ${dbOgUrl || 'NULL'}`);
    console.log(`🏷️ HTML Meta: ${actualOgUrl}`);
    console.log(`✅ Match: ${match ? 'YES' : 'NO'}`);
    
    if (!match) {
      console.log('\n⚠️ PROBLEM IDENTIFIED:');
      console.log('The database og_image_url was updated, but the HTML meta tags still have the old URL!');
      console.log('');
      console.log('SOLUTIONS:');
      console.log('1. The HTML page needs to be regenerated to include the new OG image URL');
      console.log('2. OR the page should use dynamic meta tags from the database');
      console.log('3. OR use the /api/generate-og-cached endpoint which reads from database');
    }
    
    // 4. Test if the database OG image URL works
    if (dbOgUrl) {
      console.log('\n4️⃣ IMAGE ACCESSIBILITY TEST:');
      try {
        const response = await fetch(dbOgUrl);
        console.log(`🌐 Database OG image HTTP status: ${response.status}`);
        console.log(`📏 Content-Type: ${response.headers.get('content-type')}`);
        console.log(`✅ Accessible: ${response.ok ? 'YES' : 'NO'}`);
      } catch (error) {
        console.log(`❌ Database OG image test failed: ${error.message}`);
      }
    }
    
    // 5. Check what the live page would use
    console.log('\n5️⃣ LIVE PAGE CHECK:');
    const pageUrl = `https://wtaf.me/${userSlug}/${appSlug}`;
    console.log(`🌐 Page URL: ${pageUrl}`);
    console.log(`🤖 What social media sees: HTML meta tag = ${actualOgUrl}`);
    
    if (actualOgUrl.includes('api/generate-og-cached')) {
      console.log(`🔄 Page uses dynamic API endpoint - should show updated image`);
    } else {
      console.log(`📝 Page uses static meta tag - shows cached HTML version`);
    }
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 DIAGNOSIS COMPLETE');
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

// CLI usage
const userSlug = process.argv[2] || 'bart';
const appSlug = process.argv[3] || 'bronze-dolphin-flying';

debugOGIssue(userSlug, appSlug); 