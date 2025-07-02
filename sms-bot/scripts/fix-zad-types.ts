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

async function fixZadTypes() {
  console.log('🔧 FIXING ZAD TYPES');
  console.log('═'.repeat(50));

  try {
    // Get all app_id values from wtaf_zero_admin_collaborative
    console.log('📡 Fetching ZAD app IDs...');
    const { data: zadApps, error: zadError } = await supabase
      .from('wtaf_zero_admin_collaborative')
      .select('app_id');

    if (zadError) {
      throw new Error(`Failed to fetch ZAD apps: ${zadError.message}`);
    }

    console.log(`✅ Found ${zadApps?.length || 0} ZAD app entries`);

    if (!zadApps || zadApps.length === 0) {
      console.log('⚠️ No ZAD apps found');
      return;
    }

    // Get unique app_ids
    const uniqueAppIds = [...new Set(zadApps.map(app => app.app_id))];
    console.log(`🔍 Unique ZAD app_ids: ${uniqueAppIds.length}`);

    // Update type to 'ZAD' for all these apps by matching app_slug
    let updated = 0;
    for (const appId of uniqueAppIds) {
      console.log(`🔄 Updating app with slug '${appId}' to type='ZAD'...`);
      
      const { error: updateError } = await supabase
        .from('wtaf_content')
        .update({ type: 'ZAD' })
        .eq('app_slug', appId);

      if (updateError) {
        console.error(`❌ Failed to update app ${appId}:`, updateError.message);
      } else {
        updated++;
        console.log(`✅ Updated app ${appId}`);
      }
    }

    console.log('\n' + '═'.repeat(50));
    console.log(`🎉 Successfully updated ${updated}/${uniqueAppIds.length} ZAD apps`);
    console.log('✅ ZAD types fixed!');

  } catch (error) {
    console.error('❌ Fix failed:', error.message);
    throw error;
  }
}

fixZadTypes().catch(console.error); 