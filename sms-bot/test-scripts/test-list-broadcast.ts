/**
 * Test script for sending emails to a SendGrid contact list
 * SAFE: This script only sends email, no SMS messages to subscribers
 */

import { sendToSendGridList } from '../lib/email/sendgrid.js';

// Get the message from command line arguments
const message = process.argv.slice(2).join(' ');

// Main function to run the test
async function runTest() {
  console.log('\n📧 === PRODUCTION EMAIL LIST BROADCAST ===');
  console.log('✅ Safe: No SMS will be sent to subscribers');
  console.log('📧 Sending PRODUCTION EMAIL to ACTUAL SENDGRID LIST');
  console.log(`📱 Message: ${message}`);
  console.log('');
  
  if (!message) {
    console.error('❌ Error: No message provided');
    console.log('Usage: npm run test:list -- "Your message here"');
    process.exit(1);
  }

  // Confirm environment is properly set up
  if (!process.env.SENDGRID_API_KEY) {
    console.error('❌ ERROR: SENDGRID_API_KEY is required but not found in environment');
    process.exit(1);
  }
  
  if (!process.env.SENDGRID_LIST_ID) {
    console.error('❌ ERROR: SENDGRID_LIST_ID is required but not found in environment');
    process.exit(1);
  }
  
  console.log(`📧 Using SendGrid List ID: ${process.env.SENDGRID_LIST_ID}`);

  try {
    console.log('📧 Sending PRODUCTION email to ACTUAL SendGrid contact list...');
    const result = await sendToSendGridList(message);
    
    if (result.success) {
      console.log('✅ PRODUCTION email broadcast successful!');
      console.log(`📧 Message ID: ${result.messageId}`);
    } else {
      console.error('❌ PRODUCTION email broadcast failed!');
    }
    
    console.log('\n🎉 Production email broadcast completed');
  } catch (error) {
    console.error('❌ Error during production email broadcast:', error);
    process.exit(1);
  }
}

// Run the broadcast
runTest();
