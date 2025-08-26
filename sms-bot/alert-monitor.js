#!/usr/bin/env node

/**
 * WEBTOYS ALERTS MONITOR
 * 
 * Background service that continuously monitors user alerts
 * Runs alongside the SMS bot and checks alerts based on their frequency
 */

import { createClient } from '@supabase/supabase-js';
import twilio from 'twilio';
import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Load environment variables from .env.local
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const envPath = join(__dirname, '.env.local');
config({ path: envPath });

console.log('🔧 Loading environment from:', envPath);

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const TWILIO_ACCOUNT_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_AUTH_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE_NUMBER = process.env.TWILIO_PHONE_NUMBER;
const APIFY_API_KEY = process.env.APIFY_API_KEY;

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// Simple web scraping using fetch (for now - can add Apify later)
async function scrapeWebsite(url, searchTerms) {
  try {
    console.log(`🔍 Scraping ${url} for terms: ${searchTerms}`);
    
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const html = await response.text();
    const text = html.toLowerCase();
    
    // Simple keyword matching
    const terms = searchTerms.toLowerCase().split(',').map(t => t.trim());
    const foundTerms = terms.filter(term => text.includes(term));
    
    console.log(`✅ Scraped ${url}, found ${foundTerms.length}/${terms.length} terms`);
    
    return {
      success: true,
      foundTerms,
      matchCount: foundTerms.length,
      totalTerms: terms.length
    };
    
  } catch (error) {
    console.error(`❌ Scraping failed for ${url}:`, error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

// Check if alert condition is met
function alertConditionMet(scrapeResult, alertRequest) {
  if (!scrapeResult.success) return false;
  
  const request = alertRequest.toLowerCase();
  
  // For sales/deals, look for sale indicators
  if (request.includes('sale') || request.includes('deal') || request.includes('discount')) {
    const saleTerms = ['sale', 'deal', 'discount', 'off', '%', 'special'];
    const foundSaleTerms = scrapeResult.foundTerms.filter(term => 
      saleTerms.some(sale => term.includes(sale))
    );
    return foundSaleTerms.length > 0;
  }
  
  // For general alerts, match if most terms are found
  return scrapeResult.matchCount >= Math.ceil(scrapeResult.totalTerms * 0.6);
}

// Send alert SMS
async function sendAlertSMS(phoneNumber, alertRequest, details = '') {
  try {
    const message = `🚨 ALERT TRIGGERED!

"${alertRequest}"

${details}

Reply STOP to unsubscribe from alerts.`;

    await twilioClient.messages.create({
      body: message,
      from: TWILIO_PHONE_NUMBER,
      to: phoneNumber
    });
    
    console.log(`📱 Alert SMS sent to ${phoneNumber}`);
    return true;
    
  } catch (error) {
    console.error(`❌ Failed to send alert SMS to ${phoneNumber}:`, error);
    return false;
  }
}

// Check if current time matches recurring alert schedule
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

// Get alerts that are due for checking
async function getAlertsDueForCheck() {
  try {
    const now = new Date();
    
    const { data, error } = await supabase
      .from('wtaf_alerts')
      .select('*, last_trigger_date, daily_trigger_count')
      .eq('status', 'active')
      .order('created_at', { ascending: true });
    
    if (error) {
      console.error('Error fetching alerts:', error);
      return [];
    }
    
    // Filter alerts that are actually due
    const dueAlerts = data.filter(alert => {
      // Check daily alert limit (max 4 per day)
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
      const lastTriggerDate = alert.last_trigger_date;
      const dailyCount = alert.daily_trigger_count || 0;
      
      // If last trigger was today and we've hit the limit
      if (lastTriggerDate === today && dailyCount >= 4) {
        console.log(`⏸️ Alert ${alert.id} hit daily limit (${dailyCount}/4)`);
        return false;
      }
      
      // For recurring alerts, check if current time matches schedule
      if (alert.alert_type === 'recurring') {
        // Check if we already sent today (recurring alerts are once per day max)
        if (lastTriggerDate === today && dailyCount > 0) {
          return false; // One recurring alert per day max
        }
        
        return isRecurringAlertDue(alert);
      }
      
      // For event alerts, enforce minimum 6-hour gap between checks
      if (!alert.last_checked_at) return true; // Never checked
      
      const lastChecked = new Date(alert.last_checked_at);
      const hoursSinceCheck = (now - lastChecked) / (1000 * 60 * 60);
      const minHours = Math.max(6, alert.check_frequency_minutes / 60); // At least 6 hours
      
      return hoursSinceCheck >= minHours;
    });
    
    console.log(`📋 Found ${dueAlerts.length} alerts due for checking`);
    return dueAlerts;
    
  } catch (error) {
    console.error('Error getting due alerts:', error);
    return [];
  }
}

// Update alert after checking
async function updateAlertAfterCheck(alertId, triggered = false) {
  try {
    const updateData = {
      last_checked_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    if (triggered) {
      // For event alerts, mark as triggered. For recurring alerts, keep active
      const { data: alertData } = await supabase
        .from('wtaf_alerts')
        .select('alert_type')
        .eq('id', alertId)
        .single();
      
      if (alertData?.alert_type !== 'recurring') {
        updateData.status = 'triggered';
      }
      
      // Increment daily trigger count (handles both daily and total counts)
      const { error: incrementError } = await supabase.rpc('increment_daily_trigger_count', {
        alert_id: alertId
      });
      
      if (incrementError) {
        console.warn('Failed to increment trigger count:', incrementError);
        // Fallback: manual update
        updateData.trigger_count = 'COALESCE(trigger_count, 0) + 1';
      }
    }
    
    const { error } = await supabase
      .from('wtaf_alerts')
      .update(updateData)
      .eq('id', alertId);
    
    if (error) {
      console.error(`Error updating alert ${alertId}:`, error);
    }
    
  } catch (error) {
    console.error(`Error updating alert ${alertId}:`, error);
  }
}

// Check a single alert
async function checkSingleAlert(alert) {
  console.log(`🔍 Checking alert ${alert.id}: "${alert.request}" (${alert.alert_type || 'event'})`);
  
  try {
    // For recurring alerts, always send (no condition checking)
    if (alert.alert_type === 'recurring') {
      console.log(`⏰ Recurring alert triggered: "${alert.request}"`);
      
      // For recurring alerts, scrape current conditions to include in message
      let details = '';
      if (alert.target_url && alert.search_terms) {
        const scrapeResult = await scrapeWebsite(alert.target_url, alert.search_terms);
        if (scrapeResult.success && scrapeResult.foundTerms.length > 0) {
          details = `Current conditions: ${scrapeResult.foundTerms.join(', ')}`;
        }
      }
      
      const smsSent = await sendAlertSMS(
        alert.phone_number, 
        alert.request, 
        details || 'Your scheduled alert'
      );
      
      if (smsSent) {
        await updateAlertAfterCheck(alert.id, true);
        console.log(`✅ Recurring alert ${alert.id} sent`);
      }
      return;
    }
    
    // For event alerts, check conditions
    const urlToCheck = alert.target_url || `https://www.google.com/search?q=${encodeURIComponent(alert.search_terms)}`;
    
    const scrapeResult = await scrapeWebsite(urlToCheck, alert.search_terms);
    
    if (alertConditionMet(scrapeResult, alert.request)) {
      console.log(`🚨 Alert condition MET for: "${alert.request}"`);
      
      const smsSent = await sendAlertSMS(
        alert.phone_number, 
        alert.request, 
        `Found: ${scrapeResult.foundTerms.join(', ')}`
      );
      
      if (smsSent) {
        await updateAlertAfterCheck(alert.id, true);
        console.log(`✅ Alert ${alert.id} triggered and notified`);
      }
    } else {
      console.log(`⏸️ Alert condition not met for: "${alert.request}"`);
      await updateAlertAfterCheck(alert.id, false);
    }
    
  } catch (error) {
    console.error(`❌ Error checking alert ${alert.id}:`, error);
    await updateAlertAfterCheck(alert.id, false);
  }
}

// Main monitoring function
async function checkAllAlerts() {
  console.log(`⏰ ${new Date().toISOString()} - Checking for due alerts...`);
  
  try {
    const dueAlerts = await getAlertsDueForCheck();
    
    if (dueAlerts.length === 0) {
      console.log('✅ No alerts due for checking');
      return;
    }
    
    // Process alerts one by one to avoid overwhelming servers
    for (const alert of dueAlerts) {
      await checkSingleAlert(alert);
      
      // Wait 2 seconds between checks to be polite
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log(`✅ Finished checking ${dueAlerts.length} alerts`);
    
  } catch (error) {
    console.error('❌ Error in checkAllAlerts:', error);
  }
}

// Start the monitor
async function startMonitor() {
  console.log('🚀 Starting WEBTOYS Alerts Monitor...');
  
  // Validate environment variables
  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }
  
  if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
    console.error('❌ Missing Twilio credentials');
    process.exit(1);
  }
  
  console.log('✅ Environment variables validated');
  
  // Run initial check
  await checkAllAlerts();
  
  // Set up periodic checking every minute
  setInterval(async () => {
    try {
      await checkAllAlerts();
    } catch (error) {
      console.error('❌ Unexpected error in monitor loop:', error);
    }
  }, 60000); // Check every minute
  
  console.log('✅ Alert monitor is running - checking every minute');
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down alerts monitor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down alerts monitor...');
  process.exit(0);
});

// Start the monitor if this file is run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  startMonitor().catch(error => {
    console.error('❌ Failed to start monitor:', error);
    process.exit(1);
  });
}