import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function debugTrendingQuery() {
  console.log('🔍 DEBUGGING TRENDING API QUERY\n');
  
  try {
    // 1. Check if any apps exist at all
    console.log('📊 TOTAL APPS IN DATABASE:');
    const { data: totalApps, error: totalError } = await supabase
      .from('wtaf_content')
      .select('id, app_slug, user_slug, status, remix_count, Forget')
      .limit(10);
    
    if (totalError) {
      console.error('❌ Error fetching total apps:', totalError);
      return;
    }
    
    console.log(`Found ${totalApps?.length || 0} total apps:`);
    totalApps?.forEach((app, i) => {
      console.log(`  ${i+1}. ${app.app_slug} (${app.user_slug}) - status: ${app.status}, remixes: ${app.remix_count || 0}, forgotten: ${app.Forget || false}`);
    });
    
    // 2. Check published apps specifically
    console.log('\n📋 PUBLISHED APPS:');
    const { data: publishedApps, error: publishedError } = await supabase
      .from('wtaf_content')
      .select('id, app_slug, user_slug, status, remix_count, Forget')
      .eq('status', 'published')
      .limit(10);
    
    if (publishedError) {
      console.error('❌ Error fetching published apps:', publishedError);
      return;
    }
    
    console.log(`Found ${publishedApps?.length || 0} published apps:`);
    publishedApps?.forEach((app, i) => {
      console.log(`  ${i+1}. ${app.app_slug} (${app.user_slug}) - remixes: ${app.remix_count || 0}, forgotten: ${app.Forget || false}`);
    });
    
    // 3. Check NOT forgotten apps
    console.log('\n🚫 PUBLISHED + NOT FORGOTTEN APPS:');
    const { data: visibleApps, error: visibleError } = await supabase
      .from('wtaf_content')
      .select('id, app_slug, user_slug, status, remix_count, Forget')
      .eq('status', 'published')
      .not('Forget', 'eq', true)
      .limit(10);
    
    if (visibleError) {
      console.error('❌ Error fetching visible apps:', visibleError);
      return;
    }
    
    console.log(`Found ${visibleApps?.length || 0} visible apps:`);
    visibleApps?.forEach((app, i) => {
      console.log(`  ${i+1}. ${app.app_slug} (${app.user_slug}) - remixes: ${app.remix_count || 0}`);
    });
    
    // 4. Test the exact trending query
    console.log('\n🔥 EXACT TRENDING QUERY:');
    const { data: trendingApps, error: trendingError } = await supabase
      .from('wtaf_content')
      .select(`
        id,
        app_slug,
        user_slug,
        original_prompt,
        created_at,
        remix_count,
        is_remix,
        parent_app_id,
        is_featured,
        last_remixed_at,
        Fave,
        Forget
      `)
      .eq('status', 'published')
      .not('Forget', 'eq', true)
      .order('remix_count', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(20);
    
    if (trendingError) {
      console.error('❌ Error with trending query:', trendingError);
      return;
    }
    
    console.log(`Trending query returned ${trendingApps?.length || 0} apps:`);
    trendingApps?.forEach((app, i) => {
      console.log(`  ${i+1}. ${app.app_slug} (${app.user_slug}) - remixes: ${app.remix_count || 0}`);
    });
    
  } catch (error) {
    console.error('💥 Unexpected error:', error);
  }
}

debugTrendingQuery(); 