/**
 * Enhanced SMS + Email Broadcast Script
 * Sends a message to all SMS subscribers AND triggers email broadcast via SendGrid
 * 
 * Usage: 
 *   Production: npm run broadcast:all -- "Your message here"
 *   Test Email Only: npm run broadcast:all -- --test-email-only "Your test message"
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import twilio from 'twilio';
import pLimit from 'p-limit';
import { getActiveSubscribers, updateLastMessageDate } from '../lib/subscribers.js';
import { sendBroadcastEmailToList, sendTestEmail } from '../lib/email/sendgrid.js';

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

async function broadcastSmsAndEmail(message: string, testEmailOnly = false) {
  console.log('🚀 Starting broadcast...');
  console.log('📱 Message:', message);
  
  if (testEmailOnly) {
    console.log('⚠️  TEST MODE: Email only - NO SMS will be sent to subscribers');
    
    // Only send email in test mode
    console.log('\n📧 === EMAIL TEST ===');
    const emailResults = await broadcastEmail(message);
    
    console.log('\n🎉 === TEST SUMMARY ===');
    console.log(`📧 Email: ${emailResults.success ? 'Test email sent' : 'Failed'}`);
    console.log('📱 SMS: SKIPPED (test mode)');
    
    return { sms: { success: 0, total: 0, skipped: true }, email: emailResults };
  }
  
  // Production mode - send both SMS and Email
  console.log('🔴 PRODUCTION MODE: Will send to REAL subscribers');
  console.log('⚠️  This will send SMS to ALL active subscribers!');
  
  // Add a 5-second delay for safety
  console.log('⏳ Starting in 5 seconds... (Ctrl+C to cancel)');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Step 1: Send SMS to all subscribers
  console.log('\n📱 === SMS BROADCAST ===');
  const smsResults = await broadcastSms(message);
  
  // Step 2: Send Email broadcast
  console.log('\n📧 === EMAIL BROADCAST ===');
  const emailResults = await broadcastEmail(message);
  
  // Summary
  console.log('\n🎉 === BROADCAST SUMMARY ===');
  console.log(`📱 SMS: ${smsResults.success} of ${smsResults.total} sent successfully`);
  console.log(`📧 Email: ${emailResults.success ? 'Prepared for SendGrid list' : 'Failed'}`);
  
  return {
    sms: smsResults,
    email: emailResults
  };
}

async function broadcastSms(message: string) {
  // Get all active subscribers
  const subscribers = await getActiveSubscribers();
  console.log(`📱 Broadcasting SMS to ${subscribers.length} subscribers`);
  
  if (subscribers.length === 0) {
    console.log('No active SMS subscribers found');
    return { success: 0, total: 0 };
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
        
        console.log(`📱 SMS sent to ${subscriber.phone_number}, SID: ${result.sid}`);
        return true;
      } catch (error: unknown) {
        console.error(`❌ Failed to send SMS to ${subscriber.phone_number}:`, error);
        return false;
      }
    });
  });
  
  const results = await Promise.all(promises);
  const successCount = results.filter(Boolean).length;
  
  console.log(`📱 SMS broadcast complete. ${successCount} of ${subscribers.length} messages sent successfully.`);
  
  return { success: successCount, total: subscribers.length };
}

async function broadcastEmail(message: string) {
  try {
    // Option 1: Use SendGrid list (when you have it set up)
    // const listId = process.env.SENDGRID_LIST_ID;
    // const result = await sendBroadcastEmailToList(message, listId);
    
    // Option 2: For testing, send to your email
    const testEmail = 'bdecrem@gmail.com';
    console.log(`📧 Sending test email to ${testEmail} (in production, this would go to SendGrid list)`);
    const result = await sendTestEmail(message, testEmail);
    
    return { success: true, details: result };
  } catch (error: unknown) {
    console.error('❌ Email broadcast failed:', error);
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.length < 1 || (args[0] === '--test-email-only' && args.length < 2)) {
  console.error('Usage: npm run broadcast:all -- "Your message here"');
  console.error('Usage (test email only): npm run broadcast:all -- --test-email-only "Your test message"');
  process.exit(1);
}

const testEmailOnly = args[0] === '--test-email-only';
const message = testEmailOnly ? args.slice(1).join(' ') : args.join(' ');

broadcastSmsAndEmail(message, testEmailOnly)
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error('Error in broadcast:', error);
    process.exit(1);
  });
