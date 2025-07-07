/**
 * Send confirmation SMS for monitor.py
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

const ADMIN_PHONE = '+16508989508';

async function sendConfirmationSMS(): Promise<void> {
  try {
    const message = process.argv[2] || 'Test confirmation message';
    
    const result = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: ADMIN_PHONE
    });
    
    console.log(`Confirmation SMS sent successfully! SID: ${result.sid}`);
    
  } catch (err) {
    console.error('Error sending confirmation SMS:', err);
    process.exit(1);
  }
}

sendConfirmationSMS();