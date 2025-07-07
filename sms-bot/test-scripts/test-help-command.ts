/**
 * Test the HELP command response directly
 */
import 'dotenv/config';
import twilio from 'twilio';
import { processIncomingSms } from '../lib/sms/handlers.js';

// Load environment variables from .env.local
if (process.env.NODE_ENV !== 'production') {
  const { config } = await import('dotenv');
  const path = require('path');
  
  // Try to load from .env.local in the project root
  const result = config({ path: path.resolve(process.cwd(), '.env.local') });
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

async function testHelpCommand(): Promise<void> {
  try {
    console.log('Testing HELP command directly...');
    
    // Process the HELP command directly (bypassing webhook)
    await processIncomingSms(YOUR_PHONE, 'HELP', twilioClient);
    
    console.log('HELP command processed successfully');
    console.log('Check your phone for the response');
    
  } catch (err) {
    console.error('Error testing HELP command:', err);
    process.exit(1);
  }
}

// Run the test
testHelpCommand()
  .then(() => {
    console.log('Test completed');
  })
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  });
