import { getTodaysInspiration, formatDailyMessage } from './handlers.js';
import { getActiveSubscribers, getSubscriber, updateLastInspirationDate } from '../subscribers.js';
import type { TwilioClient } from './webhooks.js';

// Function to check if it's time to send (weekend: 12pm/10am PT, weekday: 9am/7am PT)
function isTimeToSend(isEarly: boolean = false): boolean {
  const now = new Date();
  const pt = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  
  // Check weekend mode
  const weekendOverride = process.env.WEEKEND_MODE_SMS_OVERRIDE;
  let isWeekendMode = false;
  
  if (weekendOverride === 'ON') {
    isWeekendMode = true;
  } else if (weekendOverride === 'OFF') {
    isWeekendMode = false;
  } else {
    const pacificTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      weekday: 'short'
    }).format(new Date());
    isWeekendMode = ['Sat', 'Sun'].includes(pacificTime);
  }
  
  // Set target hours based on weekend mode
  let targetHour;
  if (isWeekendMode) {
    targetHour = isEarly ? 10 : 12; // Weekend: 10am PT (early), 12pm PT (regular)
  } else {
    targetHour = isEarly ? 7 : 9;   // Weekday: 7am PT (early), 9am PT (regular)
  }
  
  return pt.getHours() === targetHour && pt.getMinutes() === 0;
}

// Function to get next send time (weekend: 12pm/10am PT, weekday: 9am/7am PT)
function getNextSendTime(isEarly: boolean = false): Date {
  const now = new Date();
  const pt = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  
  // Check weekend mode for next send calculation
  const weekendOverride = process.env.WEEKEND_MODE_SMS_OVERRIDE;
  let isWeekendMode = false;
  
  if (weekendOverride === 'ON') {
    isWeekendMode = true;
  } else if (weekendOverride === 'OFF') {
    isWeekendMode = false;
  } else {
    const pacificTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      weekday: 'short'
    }).format(new Date());
    isWeekendMode = ['Sat', 'Sun'].includes(pacificTime);
  }
  
  // Set target hours based on weekend mode
  let targetHour;
  if (isWeekendMode) {
    targetHour = isEarly ? 10 : 12; // Weekend: 10am PT (early), 12pm PT (regular)
  } else {
    targetHour = isEarly ? 7 : 9;   // Weekday: 7am PT (early), 9am PT (regular)
  }
  
  // If it's already past target hour PT today, schedule for tomorrow
  if (pt.getHours() >= targetHour) {
    pt.setDate(pt.getDate() + 1);
  }
  
  pt.setHours(targetHour, 0, 0, 0);
  return pt;
}

// Keep track of the last send dates to avoid duplicate sends
let lastEarlySendDate: string = '';
let lastRegularSendDate: string = '';

// Minimum time between messages in milliseconds (3 hours)
const MIN_TIME_BETWEEN_MESSAGES: number = 3 * 60 * 60 * 1000; // 3 hours in milliseconds

export async function startDailyScheduler(twilioClient: TwilioClient) {
  console.log('Starting daily message scheduler...');
  
  // Check every minute
  setInterval(async () => {
    try {
      const now = new Date();
      const todayPT = now.toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' });
      
      // Process early subscribers (weekday: 7am PT, weekend: 10am PT)
      if (isTimeToSend(true) && lastEarlySendDate !== todayPT) {
        const weekendOverride = process.env.WEEKEND_MODE_SMS_OVERRIDE;
        let isWeekendMode = false;
        
        if (weekendOverride === 'ON') {
          isWeekendMode = true;
        } else if (weekendOverride === 'OFF') {
          isWeekendMode = false;
        } else {
          const pacificTime = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Los_Angeles',
            weekday: 'short'
          }).format(new Date());
          isWeekendMode = ['Sat', 'Sun'].includes(pacificTime);
        }
        
        const earlyTime = isWeekendMode ? '10am PT' : '7am PT';
        console.log(`Starting early daily broadcast (${earlyTime})...`);
        
        // Get today's message
        const todaysData = getTodaysInspiration();
        const messageText = formatDailyMessage(todaysData.inspiration);
        
        // Get all active subscribers
        const allSubscribers = await getActiveSubscribers();
        
            // Filter for admin users (early message delivery)
    const adminSubscribers = allSubscribers.filter(sub => sub.is_admin === true);
        console.log(`Found ${adminSubscribers.length} admin subscribers`);
        
        // Send to each admin subscriber
        let earlySuccessCount = 0;
        let earlyFailureCount = 0;
        let earlySkippedCount = 0;
        
        for (const subscriber of adminSubscribers) {
          try {
            // Check when this subscriber last received a daily inspiration
            const fullSubscriber = await getSubscriber(subscriber.phone_number);
            const lastInspirationDate = fullSubscriber?.last_inspiration_date ? new Date(fullSubscriber.last_inspiration_date) : null;
            const now = new Date();
            
            // Skip if they received a daily inspiration less than 3 hours ago
            if (lastInspirationDate && (now.getTime() - lastInspirationDate.getTime() < MIN_TIME_BETWEEN_MESSAGES)) {
              console.log(`Skipping early message to ${subscriber.phone_number} - received previous inspiration too recently`);
              earlySkippedCount++;
              continue;
            }
            
            await twilioClient.messages.create({
              body: messageText,
              to: subscriber.phone_number,
              from: process.env.TWILIO_PHONE_NUMBER
            });
            
            // Update the last inspiration date
            await updateLastInspirationDate(subscriber.phone_number);
            
            earlySuccessCount++;
            console.log(`Successfully sent early message to ${subscriber.phone_number}`);
            
            // Add delay between messages to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            earlyFailureCount++;
            console.error(`Failed to send early message to ${subscriber.phone_number}:`, error);
          }
        }
        
        console.log(`Early broadcast complete. Success: ${earlySuccessCount}, Failures: ${earlyFailureCount}, Skipped: ${earlySkippedCount}`);
        
        // Mark as sent for today
        lastEarlySendDate = todayPT;
        
        // Log next early send time
        const nextEarlySend = getNextSendTime(true);
        console.log(`Next early broadcast scheduled for: ${nextEarlySend.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`);
      }
      
      // Process regular subscribers (weekday: 9am PT, weekend: 12pm PT)
      // Only send to those who haven't received an early message
      if (isTimeToSend() && lastRegularSendDate !== todayPT) {
        const weekendOverride = process.env.WEEKEND_MODE_SMS_OVERRIDE;
        let isWeekendMode = false;
        
        if (weekendOverride === 'ON') {
          isWeekendMode = true;
        } else if (weekendOverride === 'OFF') {
          isWeekendMode = false;
        } else {
          const pacificTime = new Intl.DateTimeFormat('en-US', {
            timeZone: 'America/Los_Angeles',
            weekday: 'short'
          }).format(new Date());
          isWeekendMode = ['Sat', 'Sun'].includes(pacificTime);
        }
        
        const regularTime = isWeekendMode ? '12pm PT' : '9am PT';
        console.log(`Starting regular daily broadcast (${regularTime})...`);
        
        // Get today's message
        const todaysData = getTodaysInspiration();
        const messageText = formatDailyMessage(todaysData.inspiration);
        
        // Get active subscribers
        const allSubscribers = await getActiveSubscribers();
        
        // Filter out admin users who should have already received the early message
        // This prevents double-sending to admin subscribers
        const regularSubscribers = allSubscribers.filter(sub => !sub.is_admin);
        console.log(`Found ${regularSubscribers.length} regular subscribers`);
        
        // Send to each regular subscriber
        let successCount = 0;
        let failureCount = 0;
        let skippedCount = 0;
        
        for (const subscriber of regularSubscribers) {
          try {
            // Check when this subscriber last received a daily inspiration
            const fullSubscriber = await getSubscriber(subscriber.phone_number);
            const lastInspirationDate = fullSubscriber?.last_inspiration_date ? new Date(fullSubscriber.last_inspiration_date) : null;
            const now = new Date();
            
            // Skip if they received a daily inspiration less than 3 hours ago
            if (lastInspirationDate && (now.getTime() - lastInspirationDate.getTime() < MIN_TIME_BETWEEN_MESSAGES)) {
              console.log(`Skipping message to ${subscriber.phone_number} - received previous inspiration too recently`);
              skippedCount++;
              continue;
            }
            
            await twilioClient.messages.create({
              body: messageText,
              to: subscriber.phone_number,
              from: process.env.TWILIO_PHONE_NUMBER
            });
            
            // Update the last inspiration date
            await updateLastInspirationDate(subscriber.phone_number);
            
            successCount++;
            console.log(`Successfully sent to ${subscriber.phone_number}`);
            
            // Add delay between messages to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            failureCount++;
            console.error(`Failed to send to ${subscriber.phone_number}:`, error);
          }
        }
        
        console.log(`Regular broadcast complete. Success: ${successCount}, Failures: ${failureCount}, Skipped: ${skippedCount}`);
        
        // Mark as sent for today
        lastRegularSendDate = todayPT;
        
        // Log next send time
        const nextSend = getNextSendTime();
        console.log(`Next regular broadcast scheduled for: ${nextSend.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`);
      }
    } catch (error) {
      console.error('Error in scheduler:', error);
    }
  }, 60000); // Check every minute
  
  // Log initial next send times
  const weekendOverride = process.env.WEEKEND_MODE_SMS_OVERRIDE;
  let isWeekendMode = false;
  
  if (weekendOverride === 'ON') {
    isWeekendMode = true;
  } else if (weekendOverride === 'OFF') {
    isWeekendMode = false;
  } else {
    const pacificTime = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Los_Angeles',
      weekday: 'short'
    }).format(new Date());
    isWeekendMode = ['Sat', 'Sun'].includes(pacificTime);
  }
  
  const earlyTime = isWeekendMode ? '10am PT' : '7am PT';
  const regularTime = isWeekendMode ? '12pm PT' : '9am PT';
  
  const nextEarlySend = getNextSendTime(true);
  console.log(`First early broadcast (${earlyTime}) scheduled for: ${nextEarlySend.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`);
  
  const nextRegularSend = getNextSendTime();
  console.log(`First regular broadcast (${regularTime}) scheduled for: ${nextRegularSend.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`);
} 