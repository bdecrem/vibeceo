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

async function checkApp() {
  console.log('🔍 Checking turquoise-rabbit-exploring...');
  
  // First, let's see what columns the ZAD table actually has
  console.log('\n📋 Checking ZAD table structure...');
  const { data: sampleData, error: sampleError } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('*')
    .limit(3);
  
  if (sampleError) {
    console.error('❌ Error getting sample data:', sampleError.message);
  } else {
    console.log('📊 Sample ZAD records:');
    sampleData?.forEach((record, i) => {
      console.log(`  ${i+1}. app_id: "${record.app_id}", keys: ${Object.keys(record).join(', ')}`);
    });
  }
  
  // Check if it exists in wtaf_content
  const { data: contentData, error: contentError } = await supabase
    .from('wtaf_content')
    .select('*')
    .eq('app_slug', 'turquoise-rabbit-exploring');

  if (contentError) {
    console.error('❌ Error checking wtaf_content:', contentError.message);
    return;
  }

  console.log(`📊 Found ${contentData?.length || 0} records in wtaf_content:`);
  contentData?.forEach((record, i) => {
    console.log(`  ${i+1}. user_slug: ${record.user_slug}, app_slug: ${record.app_slug}, type: ${record.type || 'NULL'}`);
  });

  // Check if it exists in ZAD table - search more thoroughly
  console.log('\n🔍 Searching ZAD table thoroughly...');
  
  // Search by exact app_id
  const { data: zadExact, error: zadExactError } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('*')
    .eq('app_id', 'turquoise-rabbit-exploring');

  console.log(`📊 Exact match search: ${zadExact?.length || 0} records`);

  // Search with LIKE for partial matches
  const { data: zadLike, error: zadLikeError } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('*')
    .ilike('app_id', '%turquoise-rabbit-exploring%');

  console.log(`📊 LIKE search: ${zadLike?.length || 0} records`);

  // Search for any record containing "rabbit" and "exploring"
  const { data: zadPartial, error: zadPartialError } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('*')
    .or('app_id.ilike.%rabbit%,app_id.ilike.%exploring%');

  console.log(`📊 Partial search (rabbit OR exploring): ${zadPartial?.length || 0} records`);
  if (zadPartial && zadPartial.length > 0) {
    console.log('🔍 Partial matches found:');
    zadPartial.slice(0, 5).forEach((record, i) => {
      console.log(`  ${i+1}. app_id: "${record.app_id}"`);
    });
  }

  // Check if we found it in any search
  const found = (zadExact && zadExact.length > 0) || (zadLike && zadLike.length > 0);
  if (found) {
    console.log('✅ This app IS in the ZAD table, so it should be type ZAD');
  } else {
    console.log('❌ Still not finding this app in ZAD table - checking data more...');
  }

  // Check for similar apps
  console.log('\n🔍 Looking for similar rabbit apps...');
  const { data: similarApps, error: similarError } = await supabase
    .from('wtaf_content')
    .select('user_slug, app_slug, type')
    .ilike('app_slug', '%rabbit%');

  if (similarError) {
    console.error('❌ Error checking similar apps:', similarError.message);
  } else {
    console.log(`📊 Found ${similarApps?.length || 0} apps with 'rabbit' in name:`);
    similarApps?.forEach(app => {
      console.log(`  ${app.user_slug}/${app.app_slug} - type: ${app.type || 'NULL'}`);
    });
  }
}

checkApp().catch(console.error); 