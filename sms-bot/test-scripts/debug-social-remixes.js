const { createClient } = require('@supabase/supabase-js');

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function debugRemixData() {
  console.log('🔍 DEBUGGING REMIX DATA FOR USER: bart\n');
  
  try {
    // 1. Check all apps for user 'bart'
    console.log('📱 ALL APPS FOR USER "bart":');
    const { data: allApps, error: appsError } = await supabase
      .from('wtaf_content')
      .select('id, app_slug, user_slug, original_prompt, created_at, remix_count, is_remix, parent_app_id, status')
      .eq('user_slug', 'bart')
      .order('created_at', { ascending: false });
    
    if (appsError) {
      console.error('Error fetching apps:', appsError);
      return;
    }
    
    console.log(`Found ${allApps.length} total apps for bart:`);
    allApps.forEach((app, i) => {
      console.log(`${i + 1}. ${app.app_slug} (${app.status})`);
      console.log(`   - Created: ${new Date(app.created_at).toLocaleString()}`);
      console.log(`   - Is Remix: ${app.is_remix}`);
      console.log(`   - Parent App: ${app.parent_app_id || 'none'}`);
      console.log(`   - Remix Count: ${app.remix_count}`);
      console.log(`   - Prompt: "${app.original_prompt.substring(0, 80)}..."`);
      console.log('');
    });
    
    // 2. Check specifically for remixes
    console.log('\n🔄 APPS FLAGGED AS REMIXES:');
    const remixes = allApps.filter(app => app.is_remix === true);
    console.log(`Found ${remixes.length} apps flagged as remixes:`);
    remixes.forEach((remix, i) => {
      console.log(`${i + 1}. ${remix.app_slug}`);
      console.log(`   - Parent: ${remix.parent_app_id}`);
      console.log(`   - Created: ${new Date(remix.created_at).toLocaleString()}`);
    });
    
    // 3. Check recent apps (last 24 hours)
    console.log('\n🕐 RECENT APPS (LAST 24 HOURS):');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const recentApps = allApps.filter(app => new Date(app.created_at) > yesterday);
    console.log(`Found ${recentApps.length} apps created in last 24 hours:`);
    recentApps.forEach((app, i) => {
      console.log(`${i + 1}. ${app.app_slug} (${app.status})`);
      console.log(`   - Is Remix: ${app.is_remix}`);
      console.log(`   - Created: ${new Date(app.created_at).toLocaleString()}`);
      console.log(`   - Prompt: "${app.original_prompt.substring(0, 60)}..."`);
      console.log('');
    });
    
    // 4. Check user social stats
    console.log('\n📊 USER SOCIAL STATS:');
    const { data: userStats, error: statsError } = await supabase
      .from('user_social_stats')
      .select('*')
      .eq('user_slug', 'bart')
      .single();
    
    if (statsError) {
      console.log('No user_social_stats found, checking sms_subscribers...');
      const { data: subscriberStats, error: subError } = await supabase
        .from('sms_subscribers')
        .select('user_slug, follower_count, following_count, total_remix_credits, apps_created_count, published_apps, total_remixes_received')
        .eq('user_slug', 'bart')
        .single();
      
      if (subError) {
        console.log('No stats found in sms_subscribers either');
      } else {
        console.log('Stats from sms_subscribers:', subscriberStats);
      }
    } else {
      console.log('User social stats:', userStats);
    }
    
    // 5. Check social connections table
    console.log('\n🔗 SOCIAL CONNECTIONS:');
    const { data: connections, error: connError } = await supabase
      .from('wtaf_social_connections')
      .select('*')
      .or(`follower_user_slug.eq.bart,followed_user_slug.eq.bart`);
    
    if (connError) {
      console.log('Error checking social connections:', connError.message);
    } else {
      console.log(`Found ${connections.length} social connections:`);
      connections.forEach(conn => {
        console.log(`- ${conn.follower_user_slug} -> ${conn.followed_user_slug} (${conn.connection_type})`);
      });
    }
    
    // 6. Check remix lineage
    console.log('\n🌳 REMIX LINEAGE:');
    const { data: lineage, error: lineageError } = await supabase
      .from('wtaf_remix_lineage')
      .select('*')
      .or(`original_app_id.in.(${allApps.map(a => a.id).join(',')}),remix_app_id.in.(${allApps.map(a => a.id).join(',')})`);
    
    if (lineageError) {
      console.log('Error checking remix lineage:', lineageError.message);
    } else {
      console.log(`Found ${lineage.length} lineage entries:`);
      lineage.forEach(line => {
        console.log(`- ${line.original_app_id} -> ${line.remix_app_id} (depth: ${line.remix_depth})`);
      });
    }
    
  } catch (error) {
    console.error('Error in debug script:', error);
  }
}

debugRemixData(); 