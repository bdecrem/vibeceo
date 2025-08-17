import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.join(__dirname, '.env.local');
dotenv.config({ path: envPath });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function checkApp() {
  const userSlug = 'honestwolf';
  const appSlug = 'twilight-recluse-roller-skating';
  
  console.log(`🔍 Checking app: ${userSlug}/${appSlug}`);
  console.log('═'.repeat(50));

  // Check wtaf_content table
  const { data: appData, error: appError } = await supabase
    .from('wtaf_content')
    .select('id, type, coach, created_at')
    .eq('user_slug', userSlug)
    .eq('app_slug', appSlug)
    .single();

  if (appError) {
    console.error('❌ Error fetching app:', appError);
  } else {
    console.log('📱 App info:');
    console.log(`  - ID: ${appData.id}`);
    console.log(`  - Type: ${appData.type || 'NULL'}`);
    console.log(`  - Coach: ${appData.coach}`);
    console.log(`  - Created: ${appData.created_at}`);
  }

  // Check if it exists in ZAD table
  const { data: zadData, error: zadError } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('app_id')
    .eq('app_id', appSlug)
    .limit(1);

  if (zadError) {
    console.error('❌ Error checking ZAD table:', zadError);
  } else if (zadData && zadData.length > 0) {
    console.log('✅ Found in ZAD table - this IS a ZAD app!');
    console.log(`  - Records found: ${zadData.length}`);
  } else {
    console.log('❌ NOT found in ZAD table - this is NOT a ZAD app');
  }

  // Fix type mismatches
  if (zadData && zadData.length > 0 && appData?.type !== 'ZAD') {
    console.log('\n⚠️  Type mismatch detected! Should be ZAD. Fixing...');
    const { error: updateError } = await supabase
      .from('wtaf_content')
      .update({ type: 'ZAD' })
      .eq('id', appData.id);

    if (updateError) {
      console.error('❌ Failed to update type:', updateError);
    } else {
      console.log('✅ Type updated to ZAD');
    }
  } else if ((!zadData || zadData.length === 0) && appData?.type === 'ZAD') {
    console.log('\n⚠️  Type mismatch detected! Should NOT be ZAD. Fixing...');
    const { error: updateError } = await supabase
      .from('wtaf_content')
      .update({ type: null })
      .eq('id', appData.id);

    if (updateError) {
      console.error('❌ Failed to update type:', updateError);
    } else {
      console.log('✅ Type cleared (set to null)');
    }
  }

  process.exit(0);
}

checkApp().catch(console.error);