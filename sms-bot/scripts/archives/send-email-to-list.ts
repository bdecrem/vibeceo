/**
 * Send Email to SendGrid List
 * Sends an email to all contacts in the configured SendGrid list
 * 
 * Usage: npm run build && node dist/scripts/send-email-to-list.js "Your message here"
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendToSendGridList } from '../lib/email/sendgrid.js';

// Environment setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
if (!isProduction) {
  dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
}

async function sendEmailToList(message: string) {
  console.log('📧 === SENDGRID LIST EMAIL BROADCAST ===');
  console.log('📧 Sending to all contacts in SendGrid list');
  console.log('📱 Message:', message);
  console.log(`📧 List ID: ${process.env.SENDGRID_LIST_ID}`);
  
  try {
    console.log('\n📧 Sending to SendGrid list...');
    
    const result = await sendToSendGridList(message);
    
    if (result.success) {
      console.log('✅ Email broadcast sent successfully!');
      console.log(`📧 Result: ${result.messageId}`);
      console.log('\n🎉 Email broadcast completed successfully');
    } else {
      console.log('❌ Email broadcast failed');
    }
    
    return result;
  } catch (error) {
    console.error('❌ Email broadcast error:', error);
    throw error;
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.length < 1) {
  console.error('Usage: npm run build && node dist/scripts/send-email-to-list.js "Your message here"');
  console.error('Example: npm run build && node dist/scripts/send-email-to-list.js "AF Daily — June 6..."');
  process.exit(1);
}

const message = args.join(' ');

sendEmailToList(message)
  .then(() => {
    console.log('\n✅ Email broadcast completed successfully');
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error('❌ Email broadcast failed:', error);
    process.exit(1);
  }); 