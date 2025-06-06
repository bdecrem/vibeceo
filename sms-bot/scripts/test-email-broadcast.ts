/**
 * Email-Only Test Script
 * Tests SendGrid email functionality WITHOUT sending any SMS
 * Safe to use with real subscriber database
 * 
 * Usage: npm run test:email -- "Your test message here"
 */
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendTestEmail } from '../lib/email/sendgrid.js';

// Environment setup
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isProduction = process.env.NODE_ENV === 'production';
if (!isProduction) {
  dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
}

async function testEmailBroadcast(message: string, testEmail: string) {
  console.log('📧 === EMAIL TEST MODE ===');
  console.log('✅ Safe: No SMS will be sent to subscribers');
  console.log('📧 Testing email functionality only');
  console.log('📱 Message:', message);
  
  try {
    // Send test email to provided address
    console.log(`\n📧 Sending test email to ${testEmail}...`);
    
    const result = await sendTestEmail(message, testEmail);
    
    if (result.success) {
      console.log('✅ Email sent successfully!');
      console.log(`📧 Message ID: ${result.messageId}`);
      console.log('\n🎉 Email test completed successfully');
      console.log('💡 Check your inbox and spam folder');
    } else {
      console.log('❌ Email test failed');
    }
    
    return result;
  } catch (error) {
    console.error('❌ Email test error:', error);
    throw error;
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
if (args.length < 2) {
  console.error('Usage: npm run test:email -- "Your test message here" your-email@example.com');
  console.error('Example: npm run test:email -- "Testing email integration" test@example.com');
  process.exit(1);
}

const email = args.pop()!; // Last argument is the email
const message = args.join(' '); // Everything else is the message

testEmailBroadcast(message, email)
  .then(() => {
    console.log('\n✅ Test completed successfully');
    process.exit(0);
  })
  .catch((error: unknown) => {
    console.error('❌ Test failed:', error);
    process.exit(1);
  });
