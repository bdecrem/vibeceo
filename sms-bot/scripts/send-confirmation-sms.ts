/**
 * Script to send confirmation SMS messages to unconfirmed subscribers
 * This script should be run periodically to send confirmation requests
 * to new subscribers who signed up via the web form
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import twilio from 'twilio';
import { supabase, SMSSubscriber } from '../lib/supabase.js';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load environment from multiple possible locations
const envPaths = [
  path.resolve(__dirname, '../.env.local'),
  path.resolve(__dirname, '../../.env.local'),
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`Loading environment from ${envPath}`);
    dotenv.config({ path: envPath });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn('Environment file not found');
}

// Validate Twilio credentials
const requiredVars = [
  'TWILIO_ACCOUNT_SID',
  'TWILIO_AUTH_TOKEN',
  'TWILIO_PHONE_NUMBER'
];

const missingVars = requiredVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error('Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Confirmation message text
const CONFIRMATION_MESSAGE = 
  "Reply YES to confirm your subscription to The Foundry updates. " +
  "Standard msg & data rates may apply. " +
  "Reply STOP at any time to unsubscribe.";

/**
 * Get all unconfirmed subscribers who haven't received a confirmation SMS yet
 */
async function getUnconfirmedSubscribers(): Promise<SMSSubscriber[]> {
  try {
    const { data, error } = await supabase
      .from('sms_subscribers')
      .select('*')
      .is('confirmed', false)
      .eq('unsubscribed', false);
      
    if (error) {
      console.error('Error fetching unconfirmed subscribers:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('Error in getUnconfirmedSubscribers:', error);
    return [];
  }
}

/**
 * Send confirmation SMS to a subscriber
 */
async function sendConfirmationSMS(subscriber: SMSSubscriber): Promise<boolean> {
  try {
    const result = await twilioClient.messages.create({
      body: CONFIRMATION_MESSAGE,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: subscriber.phone_number
    });
    
    console.log(`Sent confirmation SMS to ${subscriber.phone_number}, SID: ${result.sid}`);
    
    // Update last_message_date to track when confirmation was sent
    const { error } = await supabase
      .from('sms_subscribers')
      .update({ last_message_date: new Date().toISOString() })
      .eq('phone_number', subscriber.phone_number);
      
    if (error) {
      console.error(`Error updating last_message_date for ${subscriber.phone_number}:`, error);
    }
    
    return true;
  } catch (error) {
    console.error(`Error sending confirmation SMS to ${subscriber.phone_number}:`, error);
    return false;
  }
}

/**
 * Main function to send confirmation messages
 */
async function sendConfirmations() {
  try {
    console.log('Fetching unconfirmed subscribers...');
    const unconfirmedSubscribers = await getUnconfirmedSubscribers();
    
    console.log(`Found ${unconfirmedSubscribers.length} unconfirmed subscribers`);
    
    if (unconfirmedSubscribers.length === 0) {
      console.log('No unconfirmed subscribers to send confirmation to');
      return;
    }
    
    // Add a small delay between messages to avoid rate limits
    for (let i = 0; i < unconfirmedSubscribers.length; i++) {
      const subscriber = unconfirmedSubscribers[i];
      console.log(`Sending confirmation to ${subscriber.phone_number} (${i+1}/${unconfirmedSubscribers.length})`);
      
      await sendConfirmationSMS(subscriber);
      
      // Add a small delay between messages
      if (i < unconfirmedSubscribers.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    console.log('Finished sending confirmation messages');
  } catch (error) {
    console.error('Error in sendConfirmations:', error);
  }
}

// Run the script
sendConfirmations();
