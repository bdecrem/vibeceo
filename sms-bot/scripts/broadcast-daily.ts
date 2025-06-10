import { getTodaysInspiration, formatDailyMessage } from '../lib/sms/handlers.js';
import { getActiveSubscribers } from '../lib/subscribers.js';
import { initializeTwilioClient } from '../lib/sms/webhooks.js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function broadcastDailyMessage() {
  try {
    console.log('Starting daily message broadcast...');
    
    // Initialize Twilio client
    const twilioClient = initializeTwilioClient();
    
    // Get today's inspiration
    const todaysData = await getTodaysInspiration();
    const messageText = formatDailyMessage(todaysData.inspiration);
    
    // Get all active subscribers
    const subscribers = await getActiveSubscribers();
    console.log(`Found ${subscribers.length} active subscribers`);
    
    // Send message to each subscriber
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
      } catch (error) {
        failureCount++;
        console.error(`Failed to send to ${subscriber.phone_number}:`, error);
      }
      
      // Add a small delay between messages to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`Broadcast complete. Success: ${successCount}, Failures: ${failureCount}`);
    
  } catch (error) {
    console.error('Error in broadcast:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the broadcast
broadcastDailyMessage(); 