// Test script to verify featured WTAF pages can be fetched
require('dotenv').config({ path: '.env.local' });

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('🔍 Testing Supabase connection for featured WTAF pages...');
console.log('Supabase URL:', supabaseUrl ? '✅ Set' : '❌ Missing');
console.log('Supabase Key:', supabaseKey ? '✅ Set' : '❌ Missing');

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase environment variables');
  console.log('Add these to your .env.local file:');
  console.log('NEXT_PUBLIC_SUPABASE_URL=your_supabase_url');
  console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testFeaturedPages() {
  try {
    console.log('\n📊 Fetching featured WTAF pages...');
    
    const { data, error } = await supabase
      .from('wtaf_content')
      .select('id, user_slug, app_slug, prompt, feature, created_at')
      .eq('feature', true)
      .order('created_at', { ascending: false })
      .limit(5);

    if (error) {
      console.error('❌ Supabase error:', error);
      return;
    }

    console.log(`✅ Found ${data?.length || 0} featured pages`);
    
    if (data && data.length > 0) {
      console.log('\n🎯 Featured pages:');
      data.forEach((page, index) => {
        console.log(`${index + 1}. ${page.user_slug}/${page.app_slug}`);
        console.log(`   Prompt: "${page.prompt.substring(0, 60)}..."`);
        console.log(`   Created: ${page.created_at}`);
        console.log('');
      });
    } else {
      console.log('⚠️  No featured pages found. Make sure to set feature=true for some pages in Supabase.');
    }

  } catch (err) {
    console.error('❌ Error testing featured pages:', err);
  }
}

testFeaturedPages();
