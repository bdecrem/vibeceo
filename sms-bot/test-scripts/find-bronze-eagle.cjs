const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function findBronzeEagle() {
  console.log('🔍 Finding bronze-eagle-running UUID...');
  
  // Get user bart
  const { data: userData } = await supabase
    .from('sms_subscribers')
    .select('id, slug')
    .eq('slug', 'bart')
    .single();
  
  if (!userData) {
    console.log('❌ User bart not found');
    return;
  }
  
  console.log(`✅ Found user: ${userData.slug} (${userData.id})`);
  
  // Look for bronze-eagle-running
  const { data: appData } = await supabase
    .from('wtaf_content')
    .select('id, app_slug, created_at')
    .eq('app_slug', 'bronze-eagle-running')
    .eq('user_id', userData.id)
    .single();
  
  if (appData) {
    console.log(`✅ Found bronze-eagle-running:`);
    console.log(`   UUID: ${appData.id}`);
    console.log(`   Created: ${appData.created_at}`);
    
    // Check if it has any submissions
    const { data: submissions } = await supabase
      .from('wtaf_submissions')
      .select('id, submission_data')
      .eq('app_id', appData.id)
      .limit(3);
    
    console.log(`📊 Found ${submissions?.length || 0} submissions for this app`);
    if (submissions && submissions.length > 0) {
      console.log('   Sample submission data:', JSON.stringify(submissions[0].submission_data, null, 2));
    }
    
    return appData.id;
  } else {
    console.log('❌ bronze-eagle-running not found');
    
    // Show other apps for this user
    const { data: otherApps } = await supabase
      .from('wtaf_content')
      .select('app_slug, id')
      .eq('user_id', userData.id)
      .order('created_at', { ascending: false })
      .limit(5);
    
    console.log('\n📱 Recent apps for bart:');
    otherApps?.forEach(app => {
      console.log(`   ${app.app_slug} (${app.id})`);
    });
  }
}

findBronzeEagle().catch(console.error); 