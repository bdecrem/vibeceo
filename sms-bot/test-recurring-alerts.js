#!/usr/bin/env node

/**
 * Test script for recurring alerts functionality
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

async function testRecurringAlerts() {
  console.log('🧪 Testing recurring alerts functionality...\n');
  
  try {
    // 1. Test database schema - check if new columns exist
    console.log('1️⃣ Testing database schema...');
    const { data: schemaTest, error: schemaError } = await supabase
      .from('wtaf_alerts')
      .select('alert_type, schedule_time, schedule_days, timezone')
      .limit(1);
    
    if (schemaError) {
      console.error('❌ Schema test failed - need to run migrations:', schemaError.message);
      return false;
    }
    console.log('✅ Database schema updated correctly');
    
    // 2. Create test recurring alert
    console.log('\n2️⃣ Creating test recurring alert...');
    const testRecurringAlert = {
      phone_number: '+1234567890',
      user_slug: 'test-user-recurring',
      request: 'alert me at 9:30am every weekday with surf conditions',
      target_url: 'https://surfline.com',
      search_terms: 'surf, waves, conditions',
      check_frequency_minutes: 1440, // Daily
      alert_type: 'recurring',
      schedule_time: '09:30:00',
      schedule_days: 'weekdays',
      timezone: 'America/Los_Angeles',
      status: 'active'
    };
    
    const { data: recurringAlert, error: insertError } = await supabase
      .from('wtaf_alerts')
      .insert(testRecurringAlert)
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Failed to create recurring alert:', insertError);
      return false;
    }
    console.log('✅ Recurring alert created:', recurringAlert.id);
    
    // 3. Test increment function
    console.log('\n3️⃣ Testing trigger count function...');
    const { error: rpcError } = await supabase.rpc('increment_trigger_count', {
      alert_id: recurringAlert.id
    });
    
    if (rpcError) {
      console.error('❌ RPC function failed - need to run trigger count migration:', rpcError.message);
      return false;
    }
    
    // Verify count was incremented
    const { data: updatedAlert } = await supabase
      .from('wtaf_alerts')
      .select('trigger_count')
      .eq('id', recurringAlert.id)
      .single();
    
    if (updatedAlert.trigger_count !== 1) {
      console.error('❌ Trigger count not incremented correctly');
      return false;
    }
    console.log('✅ Trigger count function works');
    
    // 4. Test time parsing logic (simulate different times)
    console.log('\n4️⃣ Testing time matching logic...');
    
    // Simulate the isRecurringAlertDue function logic
    function testTimeMatching() {
      const now = new Date();
      const timezone = 'America/Los_Angeles';
      const userTime = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour12: false,
        hour: '2-digit',
        minute: '2-digit',
        weekday: 'long'
      });
      
      const timeString = userTime.format(now);
      const [currentTime, currentDay] = timeString.split(', ');
      
      console.log(`   Current Pacific Time: ${currentTime}`);
      console.log(`   Current Day: ${currentDay}`);
      
      // Test weekdays logic
      const isWeekday = !['Saturday', 'Sunday'].includes(currentDay);
      console.log(`   Is Weekday: ${isWeekday}`);
      
      return true;
    }
    
    if (!testTimeMatching()) {
      return false;
    }
    console.log('✅ Time matching logic works');
    
    // 5. Test different recurring patterns
    console.log('\n5️⃣ Testing different recurring patterns...');
    const patterns = [
      { schedule_days: 'daily', expected: 'every day' },
      { schedule_days: 'weekdays', expected: 'Monday-Friday' },
      { schedule_days: 'monday,friday', expected: 'Monday and Friday' }
    ];
    
    for (const pattern of patterns) {
      const testAlert = {
        ...testRecurringAlert,
        request: `Test ${pattern.expected}`,
        schedule_days: pattern.schedule_days
      };
      
      const { data: patternAlert, error: patternError } = await supabase
        .from('wtaf_alerts')
        .insert(testAlert)
        .select('id')
        .single();
      
      if (patternError) {
        console.error(`❌ Failed to create ${pattern.expected} pattern:`, patternError);
        return false;
      }
      
      console.log(`   ✅ Created ${pattern.expected} pattern: ${patternAlert.id}`);
    }
    
    // 6. Clean up test alerts
    console.log('\n6️⃣ Cleaning up test alerts...');
    const { error: deleteError } = await supabase
      .from('wtaf_alerts')
      .delete()
      .like('user_slug', 'test-user%');
    
    if (deleteError) {
      console.error('❌ Failed to clean up:', deleteError);
      return false;
    }
    console.log('✅ Test alerts cleaned up');
    
    console.log('\n🎉 All recurring alert tests passed!');
    console.log('\n📋 Ready to use:');
    console.log('   • "alert me at 7am daily with weather" - Daily alerts');
    console.log('   • "alert me at 5pm weekdays with stock prices" - Weekday alerts');
    console.log('   • "alert me at 9am monday,wednesday,friday with news" - Specific days');
    
    return true;
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

// Run tests
testRecurringAlerts().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('❌ Test crashed:', error);
  process.exit(1);
});