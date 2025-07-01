#!/usr/bin/env node

// Investigate wtaf_content table to see all records and why filtering is limiting results

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

async function investigateWtafContent() {
  console.log('🔍 Investigating wtaf_content table\n');

  try {
    // 1. Get total count
    console.log('📊 Total record count...');
    const { count: totalCount, error: countError } = await supabase
      .from('wtaf_content')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ Error getting total count:', countError);
    } else {
      console.log(`📱 Total records in wtaf_content: ${totalCount}`);
    }

    // 2. Get count by status
    console.log('\n📊 Records by status...');
    const { data: statusData, error: statusError } = await supabase
      .from('wtaf_content')
      .select('status')
      .not('status', 'is', null);

    if (statusError) {
      console.error('❌ Error getting status data:', statusError);
    } else {
      const statusCounts = {};
      statusData.forEach(row => {
        const status = row.status || 'NULL';
        statusCounts[status] = (statusCounts[status] || 0) + 1;
      });
      
      console.log('Status breakdown:');
      Object.entries(statusCounts).forEach(([status, count]) => {
        console.log(`   • ${status}: ${count} records`);
      });
    }

    // 3. Get count by user_slug
    console.log('\n👤 Records by user_slug (top 10)...');
    const { data: userSlugData, error: userSlugError } = await supabase
      .from('wtaf_content')
      .select('user_slug')
      .not('user_slug', 'is', null);

    if (userSlugError) {
      console.error('❌ Error getting user_slug data:', userSlugError);
    } else {
      const userCounts = {};
      userSlugData.forEach(row => {
        const user = row.user_slug || 'NULL';
        userCounts[user] = (userCounts[user] || 0) + 1;
      });
      
      console.log('Top user_slug breakdown:');
      const sortedUsers = Object.entries(userCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 10);
      
      sortedUsers.forEach(([user, count]) => {
        console.log(`   • ${user}: ${count} records`);
      });
    }

    // 4. Check specific combination: bart + published
    console.log('\n🎯 Bart + published records...');
    const { count: bartPublishedCount, error: bartPublishedError } = await supabase
      .from('wtaf_content')
      .select('*', { count: 'exact', head: true })
      .eq('user_slug', 'bart')
      .eq('status', 'published');

    if (bartPublishedError) {
      console.error('❌ Error getting bart+published count:', bartPublishedError);
    } else {
      console.log(`📱 bart + published: ${bartPublishedCount} records`);
    }

    // 5. Check all bart records regardless of status
    console.log('\n🎯 All bart records (any status)...');
    const { count: allBartCount, error: allBartError } = await supabase
      .from('wtaf_content')
      .select('*', { count: 'exact', head: true })
      .eq('user_slug', 'bart');

    if (allBartError) {
      console.error('❌ Error getting all bart count:', allBartError);
    } else {
      console.log(`📱 bart (any status): ${allBartCount} records`);
    }

    // 6. Sample some non-published records to see what status they have
    console.log('\n📝 Sample of non-published records...');
    const { data: nonPublishedSample, error: nonPublishedError } = await supabase
      .from('wtaf_content')
      .select('user_slug, app_slug, status, created_at')
      .neq('status', 'published')
      .limit(10);

    if (nonPublishedError) {
      console.error('❌ Error getting non-published sample:', nonPublishedError);
    } else {
      console.log('Sample non-published records:');
      nonPublishedSample.forEach(record => {
        console.log(`   • ${record.user_slug}/${record.app_slug} - status: "${record.status}"`);
      });
    }

    console.log('\n🔍 Investigation complete!');

  } catch (error) {
    console.error('💥 Investigation failed:', error);
  }
}

// Run the investigation
investigateWtafContent(); 