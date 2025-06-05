import { getTodaysInspiration, formatDailyMessage } from './handlers.js';
import { getActiveSubscribers, getSubscriber, updateLastInspirationDate } from '../subscribers.js';
import type { TwilioClient } from './webhooks.js';

// Function to check if it's time to send (9am PT for regular, 7am PT for early)
function isTimeToSend(isEarly: boolean = false): boolean {
  const now = new Date();
  const pt = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  return (isEarly ? pt.getHours() === 7 : pt.getHours() === 9) && pt.getMinutes() === 0;
}

// Function to get next send time (9am PT for regular, 7am PT for early)
function getNextSendTime(isEarly: boolean = false): Date {
  const now = new Date();
  const pt = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  
  const targetHour = isEarly ? 7 : 9;
  
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
      
      // Process early subscribers (7am PT)
      if (isTimeToSend(true) && lastEarlySendDate !== todayPT) {
        console.log('Starting early daily broadcast (7am PT)...');
        
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
      
      // Process regular subscribers (9am PT)
      // Only send to those who haven't received an early message
      if (isTimeToSend() && lastRegularSendDate !== todayPT) {
        console.log('Starting regular daily broadcast (9am PT)...');
        
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
  const nextEarlySend = getNextSendTime(true);
  console.log(`First early broadcast (7am PT) scheduled for: ${nextEarlySend.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`);
  
  const nextRegularSend = getNextSendTime();
  console.log(`First regular broadcast (9am PT) scheduled for: ${nextRegularSend.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`);
} 