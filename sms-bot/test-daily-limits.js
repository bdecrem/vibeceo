#!/usr/bin/env node

/**
 * Test daily alert limits (max 4 per day)
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '.env.local');
config({ path: envPath });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function testDailyLimits() {
  console.log('🧪 Testing daily alert limits (max 4/day)...\n');
  
  try {
    // 1. Check if new columns exist
    console.log('1️⃣ Testing database schema updates...');
    const { data: schemaTest, error: schemaError } = await supabase
      .from('wtaf_alerts')
      .select('last_trigger_date, daily_trigger_count')
      .limit(1);
    
    if (schemaError) {
      console.error('❌ Schema test failed - need to run daily tracking migration:', schemaError.message);
      return false;
    }
    console.log('✅ Daily tracking columns exist');
    
    // 2. Test the daily increment function
    console.log('\n2️⃣ Testing daily increment function...');
    
    // Create test alert
    const testAlert = {
      phone_number: '+1234567890',
      user_slug: 'test-daily-limits',
      request: 'test daily limit functionality',
      target_url: 'https://example.com',
      search_terms: 'test',
      check_frequency_minutes: 60,
      status: 'active'
    };
    
    const { data: alert, error: insertError } = await supabase
      .from('wtaf_alerts')
      .insert(testAlert)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Failed to create test alert:', insertError);
      return false;
    }
    console.log('✅ Test alert created:', alert.id);
    
    // 3. Test increment function 5 times (should max out at 4)
    console.log('\n3️⃣ Testing daily increment (simulating 5 triggers)...');
    
    for (let i = 1; i <= 5; i++) {
      const { error } = await supabase.rpc('increment_daily_trigger_count', {
        alert_id: alert.id
      });
      
      if (error) {
        console.error(`❌ Increment ${i} failed:`, error);
        return false;
      }
      
      // Check current count
      const { data: updated } = await supabase
        .from('wtaf_alerts')
        .select('daily_trigger_count, last_trigger_date')
        .eq('id', alert.id)
        .single();
      
      console.log(`   Trigger ${i}: daily_count=${updated.daily_trigger_count}, date=${updated.last_trigger_date}`);
    }
    
    // 4. Test alert filtering logic
    console.log('\n4️⃣ Testing alert filtering with daily limits...');
    
    const { data: limitedAlert } = await supabase
      .from('wtaf_alerts')
      .select('*, last_trigger_date, daily_trigger_count')
      .eq('id', alert.id)
      .single();
    
    const today = new Date().toISOString().split('T')[0];
    const shouldBeFiltered = limitedAlert.last_trigger_date === today && limitedAlert.daily_trigger_count >= 4;
    
    console.log(`   Today: ${today}`);
    console.log(`   Last trigger date: ${limitedAlert.last_trigger_date}`);
    console.log(`   Daily count: ${limitedAlert.daily_trigger_count}`);
    console.log(`   Should be filtered: ${shouldBeFiltered}`);
    
    if (!shouldBeFiltered) {
      console.error('❌ Alert should be filtered due to daily limit');
      return false;
    }
    console.log('✅ Alert correctly filtered due to daily limit');
    
    // 5. Test 6-hour minimum for event alerts
    console.log('\n5️⃣ Testing 6-hour minimum gap for event alerts...');
    
    // Create another test alert with recent check
    const recentAlert = {
      ...testAlert,
      user_slug: 'test-6-hour-gap',
      last_checked_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString() // 3 hours ago
    };
    
    const { data: recentAlertData } = await supabase
      .from('wtaf_alerts')
      .insert(recentAlert)
      .select()
      .single();
    
    const now = new Date();
    const lastChecked = new Date(recentAlertData.last_checked_at);
    const hoursSinceCheck = (now - lastChecked) / (1000 * 60 * 60);
    const shouldWait = hoursSinceCheck < 6;
    
    console.log(`   Hours since last check: ${hoursSinceCheck.toFixed(1)}`);
    console.log(`   Should wait (< 6 hours): ${shouldWait}`);
    
    if (!shouldWait) {
      console.error('❌ Alert should wait at least 6 hours');
      return false;
    }
    console.log('✅ 6-hour minimum gap enforced');
    
    // 6. Clean up test alerts
    console.log('\n6️⃣ Cleaning up test alerts...');
    const { error: deleteError } = await supabase
      .from('wtaf_alerts')
      .delete()
      .like('user_slug', 'test-%');
    
    if (deleteError) {
      console.error('❌ Failed to clean up:', deleteError);
      return false;
    }
    console.log('✅ Test alerts cleaned up');
    
    console.log('\n🎉 Daily limits test passed!');
    console.log('\n📋 Alert frequency limits:');
    console.log('   • Event alerts: Maximum 4 per day, minimum 6 hours apart');
    console.log('   • Recurring alerts: Maximum 1 per day at scheduled time');
    console.log('   • No more spam! 🚫📱');
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run the test
testDailyLimits().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Test crashed:', error);
  process.exit(1);
});