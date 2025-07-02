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

function injectOGMetaTags(html: string, userSlug: string, appSlug: string, ogImageUrl: string): string {
  const pageUrl = `https://wtaf.me/${userSlug}/${appSlug}`;
  
  const ogTags = `    <title>WTAF – Delusional App Generator</title>
    <meta property="og:title" content="WTAF by AF" />
    <meta property="og:description" content="Vibecoded chaos, shipped via SMS." />
    <meta property="og:image" content="${ogImageUrl}" />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:url" content="${pageUrl}" />
    <meta name="twitter:card" content="summary_large_image" />`;

  // Look for existing OG tags and remove them first
  let cleanedHtml = html
    .replace(/<title>WTAF[^<]*<\/title>/g, '')
    .replace(/<meta property="og:[^"]*"[^>]*\/>/g, '')
    .replace(/<meta name="twitter:[^"]*"[^>]*\/>/g, '');

  // Inject after <head> tag
  if (cleanedHtml.includes('<head>')) {
    cleanedHtml = cleanedHtml.replace('<head>', `<head>\n${ogTags}`);
  } else {
    // If no <head> tag, add it
    cleanedHtml = `<!DOCTYPE html>\n<html lang="en">\n<head>\n${ogTags}\n</head>\n<body>\n${cleanedHtml}\n</body>\n</html>`;
  }

  return cleanedHtml;
}

async function fixOGMetaTags(userSlug: string, appSlug: string, dryRun: boolean = false) {
  console.log('🔧 Fixing OG Meta Tags');
  console.log(`📱 App: ${userSlug}/${appSlug}`);
  console.log(`🧪 Dry run: ${dryRun ? 'YES' : 'NO'}`);
  console.log('='.repeat(60));
  
  try {
    // 1. Get current data from database
    console.log('1️⃣ FETCHING DATA FROM DATABASE...');
    const { data: appData, error: fetchError } = await supabase
      .from('wtaf_content')
      .select('user_slug, app_slug, og_image_url, html_content, og_image_cached_at')
      .eq('user_slug', userSlug)
      .eq('app_slug', appSlug)
      .single();
    
    if (fetchError) {
      console.error(`❌ Database Error: ${fetchError.message}`);
      return false;
    }
    
    console.log(`✅ App found in database`);
    console.log(`📅 Current OG URL: ${appData.og_image_url || 'NULL'}`);
    console.log(`⏰ Cached at: ${appData.og_image_cached_at || 'NULL'}`);
    
    if (!appData.og_image_url) {
      console.error('❌ No og_image_url in database. Run the upload script first.');
      return false;
    }
    
    // 2. Check current HTML for OG tags
    console.log('\n2️⃣ ANALYZING CURRENT HTML...');
    const currentHtml = appData.html_content;
    const hasOGTags = currentHtml.includes('property="og:image"');
    
    console.log(`🏷️ Has OG tags: ${hasOGTags ? 'YES' : 'NO'}`);
    
    if (hasOGTags) {
      // Check if OG image URL matches database
      const ogImageMatch = currentHtml.match(/<meta property="og:image" content="([^"]*)" \/>/);
      const currentOgUrl = ogImageMatch ? ogImageMatch[1] : 'NOT FOUND';
      
      console.log(`🎯 Current meta OG URL: ${currentOgUrl}`);
      console.log(`📊 Database OG URL: ${appData.og_image_url}`);
      
      if (currentOgUrl === appData.og_image_url) {
        console.log('✅ OG meta tags already correct! No action needed.');
        return true;
      } else {
        console.log('⚠️ OG meta tags exist but URL is outdated. Will update.');
      }
    }
    
    // 3. Generate new HTML with correct meta tags
    console.log('\n3️⃣ GENERATING UPDATED HTML...');
    const updatedHtml = injectOGMetaTags(currentHtml, userSlug, appSlug, appData.og_image_url);
    
    // Verify the injection worked
    const newOgMatch = updatedHtml.match(/<meta property="og:image" content="([^"]*)" \/>/);
    const newOgUrl = newOgMatch ? newOgMatch[1] : 'INJECTION FAILED';
    
    console.log(`✅ Injected OG image URL: ${newOgUrl}`);
    console.log(`🎯 Match with database: ${newOgUrl === appData.og_image_url ? 'YES' : 'NO'}`);
    
    if (dryRun) {
      console.log('\n🧪 DRY RUN - Would update HTML but not saving to database');
      console.log('✅ Meta tag injection successful (dry run)');
      return true;
    }
    
    // 4. Update database with new HTML
    console.log('\n4️⃣ UPDATING DATABASE...');
    const { error: updateError } = await supabase
      .from('wtaf_content')
      .update({ 
        html_content: updatedHtml,
        updated_at: new Date().toISOString()
      })
      .eq('user_slug', userSlug)
      .eq('app_slug', appSlug);
    
    if (updateError) {
      console.error(`❌ Update Error: ${updateError.message}`);
      return false;
    }
    
    console.log('✅ HTML updated in database');
    
    // 5. Verify the update
    console.log('\n5️⃣ VERIFICATION...');
    const { data: verifyData, error: verifyError } = await supabase
      .from('wtaf_content')
      .select('html_content')
      .eq('user_slug', userSlug)
      .eq('app_slug', appSlug)
      .single();
    
    if (verifyError) {
      console.error(`❌ Verification Error: ${verifyError.message}`);
      return false;
    }
    
    const finalOgMatch = verifyData.html_content.match(/<meta property="og:image" content="([^"]*)" \/>/);
    const finalOgUrl = finalOgMatch ? finalOgMatch[1] : 'NOT FOUND';
    
    console.log(`🎉 Final verification: ${finalOgUrl}`);
    console.log(`✅ Success: ${finalOgUrl === appData.og_image_url ? 'YES' : 'NO'}`);
    
    console.log('\n' + '='.repeat(60));
    console.log('🎯 OG META TAGS FIXED!');
    console.log(`🌐 Social media will now see: ${appData.og_image_url}`);
    console.log(`📱 Test by sharing: https://wtaf.me/${userSlug}/${appSlug}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    return false;
  }
}

// CLI usage
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.length < 2) {
    console.log(`
🔧 OG Meta Tags Fixer

USAGE:
  npm run build && node dist/scripts/fix-og-meta-tags.js <user> <app> [--dry-run]

EXAMPLES:
  # Fix meta tags for bart/bronze-dolphin-flying
  npm run build && node dist/scripts/fix-og-meta-tags.js bart bronze-dolphin-flying

  # Test what would be changed (dry run)
  npm run build && node dist/scripts/fix-og-meta-tags.js bart bronze-dolphin-flying --dry-run

WHAT IT DOES:
  1. Reads current HTML and og_image_url from database
  2. Injects proper OG meta tags using the database og_image_url
  3. Updates the HTML in the database
  4. Verifies the changes worked

REQUIREMENTS:
  • App must exist in wtaf_content table
  • App must have og_image_url set (run upload script first if needed)
    `);
    process.exit(0);
  }
  
  const userSlug = args[0];
  const appSlug = args[1];
  const dryRun = args.includes('--dry-run');
  
  const success = await fixOGMetaTags(userSlug, appSlug, dryRun);
  process.exit(success ? 0 : 1);
}

main(); 