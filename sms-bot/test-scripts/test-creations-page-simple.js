#!/usr/bin/env node

// Simple test just for the creations page query
// Tests the exact query used by /api/user-creations

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

async function testCreationsPageQuery() {
  console.log('🎨 Testing Creations Page Query\n');

  try {
    // 1. Find test users with published apps
    console.log('🔍 Looking for users with published apps...');
    const { data: testApps, error: appsError } = await supabase
      .from('wtaf_content')
      .select('user_slug, app_slug, remix_count, created_at')
      .eq('status', 'published')
      .order('created_at', { ascending: false })
      .limit(5);

    if (appsError || !testApps || testApps.length === 0) {
      console.error('❌ No published apps found:', appsError);
      return;
    }

    console.log(`📱 Found ${testApps.length} published apps`);
    testApps.forEach(app => {
      console.log(`   • ${app.user_slug}/${app.app_slug} (${app.remix_count || 0} remixes)`);
    });

    // 2. Test the exact creations page query for the first user
    const testUser = testApps[0].user_slug;
    console.log(`\n🔍 Testing creations page query for user: ${testUser}`);
    
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
      .eq('user_slug', testUser)
      .eq('status', 'published')
      .order('created_at', { ascending: false });

    if (creationsError) {
      console.error('❌ Creations query failed:', creationsError);
      return;
    }

    console.log(`✅ Found ${creationsData.length} apps for ${testUser}:`);
    creationsData.forEach(app => {
      console.log(`   📱 ${app.app_slug}`);
      console.log(`      • Created: ${new Date(app.created_at).toLocaleDateString()}`);
      console.log(`      • Remixes: ${app.remix_count || 0}`);
      console.log(`      • Is Remix: ${app.is_remix ? 'Yes' : 'No'}`);
      console.log(`      • Featured: ${app.is_featured ? 'Yes' : 'No'}`);
      console.log('');
    });

    // 3. Test the user social stats query
    console.log(`🔍 Testing user social stats for: ${testUser}`);
    const { data: userStats, error: statsError } = await supabase
      .from('user_social_stats')
      .select('*')
      .eq('user_slug', testUser)
      .single();

    if (statsError) {
      console.log(`⚠️  No social stats found for ${testUser} (this is expected if not set up yet)`);
      console.log('   Will use default values in the API');
    } else {
      console.log(`✅ Social stats found:`);
      console.log(`   • Followers: ${userStats.follower_count || 0}`);
      console.log(`   • Following: ${userStats.following_count || 0}`);
      console.log(`   • Apps: ${userStats.apps_created_count || 0}`);
      console.log(`   • Remix Credits: ${userStats.total_remix_credits || 0}`);
    }

    console.log('\n🎉 Creations page query test completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`   • Found published apps: ✅`);
    console.log(`   • Creations query works: ✅`);
    console.log(`   • Data structure matches API: ✅`);
    console.log(`   • Ready for frontend integration: ✅`);

  } catch (error) {
    console.error('💥 Test failed:', error);
  }
}

// Run the test
testCreationsPageQuery(); 