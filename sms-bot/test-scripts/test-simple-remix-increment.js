#!/usr/bin/env node

// Simple test to increment remix count directly
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testSimpleIncrement() {
  console.log('🧪 Testing Simple Remix Count Increment\n');

  try {
    // 1. Find a test app
    const { data: testApps, error: appsError } = await supabase
      .from('wtaf_content')
      .select('id, app_slug, user_slug, remix_count')
      .eq('status', 'published')
      .limit(1);

    if (appsError || !testApps || testApps.length === 0) {
      console.error('❌ No test apps found:', appsError);
      return;
    }

    const app = testApps[0];
    const currentCount = app.remix_count || 0;
    
    console.log(`📱 Test app: ${app.user_slug}/${app.app_slug}`);
    console.log(`📊 Current remix count: ${currentCount}`);

    // 2. Simple increment (exactly what you expected!)
    const { error: updateError } = await supabase
      .from('wtaf_content')
      .update({ 
        remix_count: currentCount + 1,  // Just add 1!
        last_remixed_at: new Date().toISOString()
      })
      .eq('id', app.id);

    if (updateError) {
      console.error('❌ Update failed:', updateError);
      return;
    }

    console.log(`✅ Incremented: ${currentCount} → ${currentCount + 1}`);

    // 3. Verify the change
    const { data: updatedApp, error: verifyError } = await supabase
      .from('wtaf_content')
      .select('remix_count, last_remixed_at')
      .eq('id', app.id)
      .single();

    if (verifyError) {
      console.error('❌ Verify failed:', verifyError);
      return;
    }

    console.log(`📊 New count: ${updatedApp.remix_count}`);
    console.log(`⏰ Last remixed: ${updatedApp.last_remixed_at}`);

    // 4. Test the creations page query 
    console.log('\n🔍 Testing creations page display...');
    const { data: creationsData, error: creationsError } = await supabase
      .from('wtaf_content')
      .select('app_slug, remix_count')
      .eq('user_slug', app.user_slug)
      .eq('status', 'published')
      .gt('remix_count', 0)
      .limit(5);

    if (creationsError) {
      console.error('❌ Creations query failed:', creationsError);
    } else {
      console.log('🔥 Apps that would show remix badges:');
      creationsData?.forEach(app => {
        console.log(`   ${app.app_slug}: 🔥 ${app.remix_count} remix${app.remix_count !== 1 ? 'es' : ''}`);
      });
    }

    console.log('\n🎉 Simple increment test passed!');
    console.log('📋 This should work without any SQL functions.');

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

testSimpleIncrement(); 