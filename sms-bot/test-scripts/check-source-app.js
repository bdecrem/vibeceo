const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '../web/.env.local' });

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkSourceApp() {
  console.log('🔍 Looking for source app demo-paint-od96qt40...');
  
  // First find the app UUID
  const { data: appData, error: appError } = await supabase
    .from('wtaf_content')
    .select('id, app_slug, user_slug')
    .eq('app_slug', 'demo-paint-od96qt40')
    .single();
    
  if (appError || !appData) {
    console.log('❌ Source app not found:', appError?.message);
    return;
  }
  
  console.log('✅ Found source app:', appData);
  
  // Now check what data exists in the ZAD table for this app
  const { data: zadData, error: zadError } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('*')
    .eq('app_id', appData.id)
    .order('created_at', { ascending: false })
    .limit(10);
    
  if (zadError) {
    console.log('❌ Error loading ZAD data:', zadError.message);
    return;
  }
  
  console.log('📊 ZAD data for source app:');
  console.log('Total records:', zadData.length);
  if (zadData.length > 0) {
    console.log('Action types found:', [...new Set(zadData.map(r => r.action_type))]);
    console.log('Sample records:');
    zadData.forEach((record, i) => {
      console.log(`  ${i+1}. Type: ${record.action_type}, Data:`, record.content_data);
    });
  } else {
    console.log('No ZAD data found - source app might be empty or not a ZAD app');
  }
  
  return appData.id;
}

checkSourceApp().catch(console.error); 