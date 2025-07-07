/**
 * SMS Broadcast Script
 * Sends a message to all active subscribers
 * 
 * Usage: npm run broadcast -- "Your message here"
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import twilio from 'twilio';
import pLimit from 'p-limit';
import { getActiveSubscribers, updateLastMessageDate } from '../lib/subscribers.js';

// Environment setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
if (!isProduction) {
  dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });
}

// Initialize Twilio
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

async function broadcastMessage(message: string) {
  // Get all active subscribers
  const subscribers = await getActiveSubscribers();
  console.log(`Broadcasting to ${subscribers.length} subscribers`);
  
  if (subscribers.length === 0) {
    console.log('No active subscribers found');
    return;
  }
  
  // Limit concurrent requests to avoid rate limiting
  const limit = pLimit(5);
  
  // Send messages with rate limiting
  const promises = subscribers.map(subscriber => {
    return limit(async () => {
      try {
        const result = await twilioClient.messages.create({
          body: message,
          to: subscriber.phone_number,
          from: process.env.TWILIO_PHONE_NUMBER
        });
        
        // Update last message date
        await updateLastMessageDate(subscriber.phone_number);
        
        console.log(`Message sent to ${subscriber.phone_number}, SID: ${result.sid}`);
        return true;
      } catch (error) {
        console.error(`Failed to send to ${subscriber.phone_number}:`, error);
        return false;
      }
    });
  });
  
  const results = await Promise.all(promises);
  const successCount = results.filter(Boolean).length;
  
  console.log(`Broadcast complete. ${successCount} of ${subscribers.length} messages sent successfully.`);
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: npm run broadcast -- "Your message here"');
  process.exit(1);
}

broadcastMessage(args.join(' '))
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error in broadcast:', error);
    process.exit(1);
  });
