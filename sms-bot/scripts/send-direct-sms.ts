/**
 * Send a direct SMS message for testing
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import twilio from 'twilio';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.resolve(__dirname, '../.env.local');
console.log('Loading environment from:', envPath);
dotenv.config({ path: envPath });

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

// Default phone number (fallback)
const DEFAULT_PHONE = '+16508989508';

async function sendMessage(customMessage?: string): Promise<void> {
  try {
    // Use custom message from command line argument, or default
    const messageBody = customMessage || process.argv[2] || 'Hello World';
    // Use phone number from command line argument 3, or default
    const targetPhone = process.argv[3] || DEFAULT_PHONE;
    
    console.log(`Sending message: "${messageBody}"`);
    console.log(`To phone number: ${targetPhone}`);
    
    // Send a message directly using Twilio API
    const message = await twilioClient.messages.create({
      body: messageBody,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: targetPhone
    });
    
    console.log('Message sent successfully!');
    console.log('Message SID:', message.sid);
    
  } catch (err) {
    console.error('Error sending message:', err);
    process.exit(1);
  }
}

// Run the message sender
sendMessage()
  .then(() => {
    console.log('Message completed');
  })
  .catch((err) => {
    console.error('Message failed:', err);
    process.exit(1);
  });