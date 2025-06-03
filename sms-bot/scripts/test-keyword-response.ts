/**
 * Test sending messages with different keywords to identify any filtering
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

// Your phone number
const YOUR_PHONE = '+16508989508'; // Replace with your actual phone if different

async function testKeywordResponses(): Promise<void> {
  try {
    console.log('Testing different message types...');
    
    // Test a non-keyword message
    console.log('Sending non-keyword test message...');
    const message1 = await twilioClient.messages.create({
      body: 'Test 1: Regular message without keywords.',
      from: process.env.TWILIO_PHONE_NUMBER,
      to: YOUR_PHONE
    });
    console.log('Message 1 sent successfully, SID:', message1.sid);
    
    // Wait a moment between messages
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test message containing HELP but not as the first word
    console.log('Sending message with HELP but not at start...');
    const message2 = await twilioClient.messages.create({
      body: 'Test 2: This message contains HELP keyword but not at the start.',
      from: process.env.TWILIO_PHONE_NUMBER,
      to: YOUR_PHONE
    });
    console.log('Message 2 sent successfully, SID:', message2.sid);
    
    // Wait a moment between messages
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test message with command-like format
    console.log('Sending MENU command message...');
    const message3 = await twilioClient.messages.create({
      body: 'MENU: Commands available - YES, START, STOP, HELP, INFO',
      from: process.env.TWILIO_PHONE_NUMBER,
      to: YOUR_PHONE
    });
    console.log('Message 3 sent successfully, SID:', message3.sid);
    
    console.log('All test messages sent!');
    
  } catch (err) {
    console.error('Error sending messages:', err);
    process.exit(1);
  }
}

// Run the tests
testKeywordResponses()
  .then(() => {
    console.log('Tests completed');
  })
  .catch((err) => {
    console.error('Tests failed:', err);
    process.exit(1);
  });
