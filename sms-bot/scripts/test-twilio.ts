/**
 * Simple test script to verify Twilio integration
 * Run this script to send a test message to a specified phone number
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import twilio from 'twilio';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Environment detection
const isProduction = process.env.NODE_ENV === 'production';

// Load environment variables from .env.local
if (!isProduction) {
  const envPath = path.resolve(__dirname, '../../.env.local');
  console.log('Loading environment from:', envPath);
  const result = dotenv.config({ path: envPath });
  if (result.error) {
    console.error('Error loading .env.local:', result.error);
    process.exit(1);
  }
}

// Validate required environment variables
const requiredVars = [
  'TWILIO_ACCOUNT_SID', 
  'TWILIO_AUTH_TOKEN', 
  'TWILIO_PHONE_NUMBER'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  console.error('Please set these in your .env.local file');
  process.exit(1);
}

async function testTwilioIntegration() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    
    if (args.length < 1) {
      console.error('Usage: npm run build && node dist/scripts/test-twilio.js <to_phone_number>');
      console.error('Example: npm run build && node dist/scripts/test-twilio.js +15551234567');
      process.exit(1);
    }
    
    const toPhoneNumber = args[0];
    
    // Initialize Twilio client
    const twilioClient = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    
    console.log('Twilio client initialized successfully');
    console.log(`Sending test message to ${toPhoneNumber}...`);
    
    // Send a test message
    const message = await twilioClient.messages.create({
      body: 'This is a test message from your VibeCEO SMS bot! 🎉',
      to: toPhoneNumber,
      from: process.env.TWILIO_PHONE_NUMBER
    });
    
    console.log('Message sent successfully!');
    console.log('Message SID:', message.sid);
    console.log('Status:', message.status);
    
  } catch (error) {
    console.error('Error in Twilio test:', error);
    process.exit(1);
  }
}

// Run the test
testTwilioIntegration();
