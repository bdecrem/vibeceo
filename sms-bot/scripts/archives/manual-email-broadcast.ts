import dotenv from 'dotenv';
import { getTodaysInspiration, formatDailyMessage } from '../lib/sms/handlers.js';
import { sendToSendGridList } from '../lib/email/sendgrid.js';

// Load environment variables
const envPath = process.cwd() + '/.env.local';
dotenv.config({ path: envPath });

async function manualEmailBroadcast() {
  try {
    console.log('🚀 Manual Email Broadcast - Getting today\'s message...');
    
    // Get today's actual message (should be the office chair message - Item 107)
    const todaysData = await getTodaysInspiration();
    const messageText = formatDailyMessage(todaysData.inspiration);
    
    console.log(`📧 Today's message (Item ${todaysData.inspiration.item}):`);
    console.log(messageText);
    console.log('\n📤 Sending to SendGrid email list...');
    
    // Send the email broadcast
    const emailResult = await sendToSendGridList(messageText);
    
    if (emailResult.success) {
      console.log(`✅ Email broadcast sent successfully!`);
      console.log(`📧 Message ID: ${emailResult.messageId}`);
    } else {
      console.log('❌ Email broadcast failed');
    }
    
  } catch (error) {
    console.error('❌ Error sending manual email broadcast:', error);
  }
}

console.log('📧 Manual SendGrid Email Broadcast');
console.log('🕙 Current time: 10:50 AM PDT');
console.log('📋 Sending today\'s scheduled message...\n');

manualEmailBroadcast(); 