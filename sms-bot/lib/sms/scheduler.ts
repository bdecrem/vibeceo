import { getTodaysInspiration, formatDailyMessage } from './handlers.js';
import { getActiveSubscribers } from '../subscribers.js';
import type { TwilioClient } from './webhooks.js';

// Function to check if it's time to send (9am PT)
function isTimeToSend(): boolean {
  const now = new Date();
  const pt = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  return pt.getHours() === 9 && pt.getMinutes() === 0;
}

// Function to get next 9am PT
function getNextSendTime(): Date {
  const now = new Date();
  const pt = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
  
  // If it's already past 9am PT today, schedule for tomorrow
  if (pt.getHours() >= 9) {
    pt.setDate(pt.getDate() + 1);
  }
  
  pt.setHours(9, 0, 0, 0);
  return pt;
}

let lastSendDate: string | null = null;

export async function startDailyScheduler(twilioClient: TwilioClient) {
  console.log('Starting daily message scheduler...');
  
  // Check every minute
  setInterval(async () => {
    try {
      const now = new Date();
      const todayPT = now.toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' });
      
      // Only send if:
      // 1. It's 9am PT
      // 2. We haven't sent today yet
      if (isTimeToSend() && lastSendDate !== todayPT) {
        console.log('Starting daily broadcast...');
        
        // Get today's message
        const todaysData = getTodaysInspiration();
        const messageText = formatDailyMessage(todaysData.inspiration);
        
        // Get active subscribers
        const subscribers = await getActiveSubscribers();
        console.log(`Found ${subscribers.length} active subscribers`);
        
        // Send to each subscriber
        let successCount = 0;
        let failureCount = 0;
        
        for (const subscriber of subscribers) {
          try {
            await twilioClient.messages.create({
              body: messageText,
              to: subscriber.phone_number,
              from: process.env.TWILIO_PHONE_NUMBER
            });
            successCount++;
            console.log(`Successfully sent to ${subscriber.phone_number}`);
            
            // Add delay between messages to avoid rate limits
            await new Promise(resolve => setTimeout(resolve, 100));
          } catch (error) {
            failureCount++;
            console.error(`Failed to send to ${subscriber.phone_number}:`, error);
          }
        }
        
        console.log(`Broadcast complete. Success: ${successCount}, Failures: ${failureCount}`);
        
        // Mark as sent for today
        lastSendDate = todayPT;
        
        // Log next send time
        const nextSend = getNextSendTime();
        console.log(`Next broadcast scheduled for: ${nextSend.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`);
      }
    } catch (error) {
      console.error('Error in scheduler:', error);
    }
  }, 60000); // Check every minute
  
  // Log initial next send time
  const nextSend = getNextSendTime();
  console.log(`First broadcast scheduled for: ${nextSend.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' })}`);
} 