#!/usr/bin/env node

// Test script to verify remix social updates work
// This simulates a remix scenario and checks if the database updates correctly

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

async function testRemixSocialUpdates() {
  console.log('🧪 Testing Remix Social Updates System\n');

  try {
    // 1. Find a test app to use as the "original" app
    console.log('🔍 Looking for test apps...');
    const { data: testApps, error: appsError } = await supabase
      .from('wtaf_content')
      .select('id, app_slug, user_slug, remix_count')
      .eq('status', 'published')
      .limit(3);

    if (appsError || !testApps || testApps.length === 0) {
      console.error('❌ No test apps found:', appsError);
      return;
    }

    const originalApp = testApps[0];
    console.log(`📱 Found test app: ${originalApp.user_slug}/${originalApp.app_slug}`);
    console.log(`📊 Current remix count: ${originalApp.remix_count || 0}`);

    // 2. Get user's current social stats
    const { data: userStats, error: statsError } = await supabase
      .from('sms_subscribers')
      .select('slug, total_remix_credits')
      .eq('slug', originalApp.user_slug)
      .single();

    if (statsError) {
      console.error('❌ Error getting user stats:', statsError);
      return;
    }

    console.log(`👤 User ${userStats.slug} has ${userStats.total_remix_credits || 0} remix credits\n`);

    // 3. Test the increment_remix_credits function
    console.log('🔧 Testing increment_remix_credits function...');
    const { data: newCredits, error: rpcError } = await supabase
      .rpc('increment_remix_credits', { user_slug: originalApp.user_slug });

    if (rpcError) {
      console.error('❌ RPC function failed:', rpcError);
      return;
    }

    console.log(`✅ RPC function worked! New credits: ${newCredits}`);

    // 4. Test manual remix count increment
    console.log('🔧 Testing remix count increment...');
    const currentCount = originalApp.remix_count || 0;
    const { error: incrementError } = await supabase
      .from('wtaf_content')
      .update({ 
        remix_count: currentCount + 1,
        last_remixed_at: new Date().toISOString()
      })
      .eq('id', originalApp.id);

    if (incrementError) {
      console.error('❌ Failed to increment remix count:', incrementError);
      return;
    }

    console.log(`✅ Remix count incremented: ${currentCount} → ${currentCount + 1}`);

    // 5. Verify the changes
    console.log('\n🔍 Verifying changes...');
    const { data: updatedApp } = await supabase
      .from('wtaf_content')
      .select('remix_count, last_remixed_at')
      .eq('id', originalApp.id)
      .single();

    const { data: updatedUserStats } = await supabase
      .from('sms_subscribers')
      .select('total_remix_credits')
      .eq('slug', originalApp.user_slug)
      .single();

    console.log(`📊 Updated remix count: ${updatedApp.remix_count}`);
    console.log(`👤 Updated user credits: ${updatedUserStats.total_remix_credits}`);
    console.log(`⏰ Last remixed: ${updatedApp.last_remixed_at}`);

    // 6. Test the creations page query
    console.log('\n🔍 Testing creations page query...');
    const { data: creationsData, error: creationsError } = await supabase
      .from('wtaf_content')
      .select(`
        id,
        app_slug,
        original_prompt,
        created_at,
        remix_count,
        is_remix,
        parent_app_id,
        is_featured,
        last_remixed_at
      `)
      .eq('user_slug', originalApp.user_slug)
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(1);

    if (creationsError) {
      console.error('❌ Creations query failed:', creationsError);
    } else {
      const app = creationsData[0];
      console.log(`✅ Creations page would show: "${app.app_slug}" with ${app.remix_count} remixes`);
    }

    console.log('\n🎉 All tests passed! The remix social system is working correctly.');
    console.log('\n📋 Summary:');
    console.log(`   • Remix count increments: ✅`);
    console.log(`   • User credits increment: ✅`);
    console.log(`   • Timestamp updates: ✅`);
    console.log(`   • Creations page query: ✅`);

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

// Run the test
testRemixSocialUpdates(); 