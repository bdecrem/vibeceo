/**
 * Send a direct SMS message for testing
 */
import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from 'dotenv';
import twilio from 'twilio';

// Get current file's directory (for ESM)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
if (process.env.NODE_ENV !== 'production') {
  config({ path: path.resolve(process.cwd(), '.env.local') });
  console.log('Loading environment from ' + path.resolve(process.cwd(), '.env.local'));
}

// Validate environment variables
if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE_NUMBER) {
  console.error('Missing required Twilio environment variables');
  process.exit(1);
}

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID as string,
  process.env.TWILIO_AUTH_TOKEN as string
);

// Your phone number (the one you're testing with)
const YOUR_PHONE = '+16508989508'; // Replace with your actual phone if different

async function sendTestMessage(): Promise<void> {
  try {
    console.log('Sending test message to your phone...');
    
    // Send a message directly using Twilio API
    const message = await twilioClient.messages.create({
      body: 'Test message from AdvisorsFoundry: This is a direct message test.',
      from: process.env.TWILIO_PHONE_NUMBER,
      to: YOUR_PHONE
    });
    
    console.log('Message sent successfully!');
    console.log('Message SID:', message.sid);
    console.log('Check your phone for the message');
    
  } catch (err) {
    console.error('Error sending message:', err);
    process.exit(1);
  }
}

// Run the test
sendTestMessage()
  .then(() => {
    console.log('Test completed');
  })
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });
