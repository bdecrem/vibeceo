#!/usr/bin/env node

/**
 * Check alert schedule for specific phone number
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

// Check if current time matches recurring alert schedule (copied from alert-monitor.js)
function isRecurringAlertDue(alert) {
  const now = new Date();
  
  // Convert to user's timezone (default Pacific)
  const timezone = alert.timezone || 'America/Los_Angeles';
  
  // Get current time in user's timezone
  const timeFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    hour12: false,
    hour: '2-digit',
    minute: '2-digit'
  });
  
  // Get current day in user's timezone
  const dayFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    weekday: 'long'
  });
  
  const currentTime = timeFormatter.format(now);
  const currentDay = dayFormatter.format(now);
  
  // Check if current time matches schedule_time (within 1 minute window)
  if (alert.schedule_time) {
    const [scheduleHour, scheduleMinute] = alert.schedule_time.split(':');
    const [currentHour, currentMin] = currentTime.split(':');
    
    const scheduleMinutes = parseInt(scheduleHour) * 60 + parseInt(scheduleMinute);
    const currentMinutes = parseInt(currentHour) * 60 + parseInt(currentMin);
    
    // Within 1-minute window
    if (Math.abs(currentMinutes - scheduleMinutes) > 1) {
      return false;
    }
  }
  
  // Check if current day matches schedule_days
  if (alert.schedule_days) {
    const schedule = alert.schedule_days.toLowerCase();
    const dayName = currentDay.toLowerCase();
    
    if (schedule === 'daily') return true;
    if (schedule === 'weekdays' && !['saturday', 'sunday'].includes(dayName)) return true;
    if (schedule.includes(dayName)) return true;
    
    return false;
  }
  
  return true; // Default to daily if no schedule_days specified
}

async function checkAlertSchedule() {
  const phoneNumber = '+16508989508';
  console.log(`🔍 Checking alert schedule for ${phoneNumber}...\n`);
  
  try {
    // Get current time info
    const now = new Date();
    const pstTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      hour12: false,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    
    console.log('🕐 CURRENT TIME INFO:');
    console.log(`UTC: ${now.toISOString()}`);
    console.log(`Pacific: ${pstTime.format(now)}`);
    console.log();
    
    // Get all alerts for this phone number
    const { data: alerts, error } = await supabase
      .from('wtaf_alerts')
      .select('*')
      .eq('phone_number', phoneNumber)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('❌ Error fetching alerts:', error);
      return;
    }
    
    if (!alerts || alerts.length === 0) {
      console.log('📭 No alerts found for this phone number');
      return;
    }
    
    console.log(`📋 FOUND ${alerts.length} ALERT(S):\n`);
    
    alerts.forEach((alert, index) => {
      console.log(`${index + 1}. ALERT ID: ${alert.id}`);
      console.log(`   Request: "${alert.request}"`);
      console.log(`   Type: ${alert.alert_type || 'event'}`);
      console.log(`   Status: ${alert.status}`);
      console.log(`   Created: ${alert.created_at}`);
      console.log(`   Last checked: ${alert.last_checked_at || 'Never'}`);
      console.log(`   Last trigger date: ${alert.last_trigger_date || 'Never'}`);
      console.log(`   Daily trigger count: ${alert.daily_trigger_count || 0}`);
      console.log(`   Total trigger count: ${alert.trigger_count || 0}`);
      
      if (alert.alert_type === 'recurring') {
        console.log(`   Schedule time: ${alert.schedule_time || 'Not set'}`);
        console.log(`   Schedule days: ${alert.schedule_days || 'Not set'}`);
        console.log(`   Timezone: ${alert.timezone || 'America/Los_Angeles'}`);
        
        // Check if this recurring alert is due now
        const isDue = isRecurringAlertDue(alert);
        console.log(`   ⏰ Due right now: ${isDue ? '✅ YES' : '❌ NO'}`);
        
        // Calculate next scheduled time
        if (alert.schedule_time && alert.schedule_days) {
          const timezone = alert.timezone || 'America/Los_Angeles';
          const scheduleTime = alert.schedule_time; // e.g., "07:30:00"
          const scheduleDays = alert.schedule_days; // e.g., "daily"
          
          console.log(`   📅 Next scheduled: ${scheduleDays} at ${scheduleTime} (${timezone})`);
          
          // Show when it will next trigger
          const [scheduleHour, scheduleMinute] = scheduleTime.split(':');
          const nextTrigger = new Date();
          nextTrigger.setHours(parseInt(scheduleHour), parseInt(scheduleMinute), 0, 0);
          
          // If time has passed today, schedule for tomorrow (for daily alerts)
          const currentTime = new Date();
          if (nextTrigger <= currentTime && scheduleDays === 'daily') {
            nextTrigger.setDate(nextTrigger.getDate() + 1);
          }
          
          console.log(`   ⏰ Next trigger: ${nextTrigger.toLocaleString('en-US', { timeZone: timezone })}`);
        }
      } else {
        // Event alert
        console.log(`   Target URL: ${alert.target_url || 'Google search'}`);
        console.log(`   Search terms: ${alert.search_terms}`);
        console.log(`   Check frequency: ${alert.check_frequency_minutes} minutes`);
        
        // Check when next due
        if (alert.last_checked_at) {
          const lastChecked = new Date(alert.last_checked_at);
          const nextCheck = new Date(lastChecked.getTime() + (alert.check_frequency_minutes * 60 * 1000));
          const minutesUntilNext = Math.max(0, Math.round((nextCheck - now) / 60000));
          
          console.log(`   ⏰ Next check: ${nextCheck.toLocaleString()} (in ${minutesUntilNext} minutes)`);
        } else {
          console.log(`   ⏰ Next check: Immediately (never checked before)`);
        }
        
        // Check daily limit status
        const today = new Date().toISOString().split('T')[0];
        const dailyCount = alert.daily_trigger_count || 0;
        const lastTriggerDate = alert.last_trigger_date;
        
        if (lastTriggerDate === today && dailyCount >= 4) {
          console.log(`   🚫 Daily limit reached: ${dailyCount}/4 alerts sent today`);
        } else {
          console.log(`   ✅ Daily limit OK: ${dailyCount}/4 alerts sent today`);
        }
      }
      
      console.log();
    });
    
    // Check which alerts are currently due
    console.log('🎯 ALERTS DUE RIGHT NOW:');
    
    const today = new Date().toISOString().split('T')[0];
    const dueAlerts = alerts.filter(alert => {
      if (alert.status !== 'active') return false;
      
      // Check daily limit
      const dailyCount = alert.daily_trigger_count || 0;
      const lastTriggerDate = alert.last_trigger_date;
      
      if (lastTriggerDate === today && dailyCount >= 4) {
        console.log(`   - ${alert.request.substring(0, 50)}... (BLOCKED: daily limit reached)`);
        return false;
      }
      
      if (alert.alert_type === 'recurring') {
        // Check if already sent today
        if (lastTriggerDate === today && dailyCount > 0) {
          console.log(`   - ${alert.request.substring(0, 50)}... (BLOCKED: already sent today)`);
          return false;
        }
        
        const isDue = isRecurringAlertDue(alert);
        if (isDue) {
          console.log(`   - ${alert.request.substring(0, 50)}... (✅ DUE NOW)`);
        }
        return isDue;
      } else {
        // Event alert - check time since last check
        if (!alert.last_checked_at) {
          console.log(`   - ${alert.request.substring(0, 50)}... (✅ DUE NOW - never checked)`);
          return true;
        }
        
        const lastChecked = new Date(alert.last_checked_at);
        const hoursSinceCheck = (now - lastChecked) / (1000 * 60 * 60);
        const minHours = Math.max(6, alert.check_frequency_minutes / 60);
        
        if (hoursSinceCheck >= minHours) {
          console.log(`   - ${alert.request.substring(0, 50)}... (✅ DUE NOW - ${hoursSinceCheck.toFixed(1)}h since last check)`);
          return true;
        } else {
          const timeLeft = minHours - hoursSinceCheck;
          console.log(`   - ${alert.request.substring(0, 50)}... (⏳ ${timeLeft.toFixed(1)}h until next check)`);
          return false;
        }
      }
    });
    
    if (dueAlerts.length === 0) {
      console.log('   📭 No alerts due right now');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// Run the check
checkAlertSchedule().then(() => {
  process.exit(0);
}).catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});