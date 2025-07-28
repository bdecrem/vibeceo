import { config } from 'dotenv';
import { createClient } from '@supabase/supabase-js';

config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkZadApps() {
  console.log('🔍 Checking ZAD apps in database...\n');
  
  try {
    const { data, error } = await supabase
      .from('wtaf_content')
      .select('app_slug, type, html_content')
      .eq('user_slug', 'bart')
      .eq('app_slug', 'turquoise-spotted-competing')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    for (const app of data) {
      console.log(`\n📱 App: ${app.app_slug}`);
      console.log(`   Type: ${app.type || 'Not set'}`);
      console.log(`   HTML Length: ${app.html_content ? app.html_content.length : 0} chars`);
      
      if (app.html_content) {
        // Check if it's actual HTML or Next.js wrapper
        const isNextWrapper = app.html_content.includes('__next_f.push');
        const hasZadAPIs = app.html_content.includes('/api/zad/');
        const hasAppID = app.html_content.includes('APP_ID');
        
        console.log(`   Is Next.js wrapper: ${isNextWrapper}`);
        console.log(`   Has ZAD APIs: ${hasZadAPIs}`);
        console.log(`   Has APP_ID: ${hasAppID}`);
        
        // Show first 1000 chars to see more of the structure
        console.log(`   First 1000 chars:`);
        console.log('   ' + app.html_content.substring(0, 1000).replace(/\n/g, '\n   '));
        
        // Check if it has the problematic placeholder
        if (app.html_content.includes('[REST OF THE FILE REMAINS')) {
          console.log(`   ⚠️  WARNING: Contains placeholder text!`);
          const placeholderIndex = app.html_content.indexOf('[REST OF THE FILE REMAINS');
          console.log(`   Placeholder found at position: ${placeholderIndex}`);
        }
      }
    }

  } catch (err) {
    console.error('💥 Script error:', err);
  }
}

checkZadApps();