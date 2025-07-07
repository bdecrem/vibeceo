import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getActiveSubscribers, updateLastMessageDate } from '../lib/subscribers.js';
import { initializeTwilioClient } from '../lib/sms/webhooks.js';
import { formatDailyMessage } from '../lib/sms/handlers.js';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
const envPath = path.resolve(__dirname, '../.env.local');
console.log('Loading environment from:', envPath);
dotenv.config({ path: envPath });

// The specific message to send
const specificMessage = {
  "item": 86,
  "type": "intervention",
  "quotation-marks": "no",
  "prepend": "\n🪙 Startup Fortune Cookie: ",
  "text": "You will lose a billionaire ally.\nBut gain a new Twitter feud.",
  "author": null
};

async function sendMessageToAllUsers() {
  console.log('🚀 Starting message send to all subscribers...');
  
  try {
    // Initialize Twilio client
    const twilioClient = initializeTwilioClient();
    console.log('✅ Twilio client initialized');
    
    // Format the message with header
    const formattedMessage = formatDailyMessage(specificMessage);
    // Replace the coin emoji with fortune cookie emoji and add line break after "Fortune Cookie:"
    const updatedMessage = formattedMessage.replace('🪙', '🥠').replace('Fortune Cookie: ', 'Fortune Cookie: \n');
    const messageText = `AF Daily — Disruption Alert\n${updatedMessage}\n\n🌀 Text MORE for one extra line of chaos.`;
    console.log('📝 Formatted message:');
    console.log('---');
    console.log(messageText);
    console.log('---');
    
    // Get all active subscribers
    const allSubscribers = await getActiveSubscribers();
    console.log(`📊 Found ${allSubscribers.length} total active subscribers`);
    
    // Send to all active subscribers
    const targetUsers = allSubscribers;
    console.log(`🎯 Sending to all ${targetUsers.length} active subscribers`);
    
    if (targetUsers.length === 0) {
      console.log('❌ No active subscribers found!');
      return;
    }
    
    // Show all users (just phone numbers for confirmation)
    console.log('👥 All active subscribers:');
    targetUsers.forEach((user, index) => {
      console.log(`  ${index + 1}. ${user.phone_number}`);
    });
    
    console.log('\n🔄 Sending messages...');
    
    // Send to each active subscriber
    let successCount = 0;
    let failureCount = 0;
    
    for (const subscriber of targetUsers) {
      try {
        // Send via Twilio
        const message = await twilioClient.messages.create({
          body: messageText,
          to: subscriber.phone_number,
          from: process.env.TWILIO_PHONE_NUMBER
        });
        
        // Update last message date
        await updateLastMessageDate(subscriber.phone_number);
        
        successCount++;
        console.log(`✅ Sent to ${subscriber.phone_number} (SID: ${message.sid})`);
        
        // Add delay between messages to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
        
      } catch (error) {
        failureCount++;
        console.error(`❌ Failed to send to ${subscriber.phone_number}:`, error instanceof Error ? error.message : String(error));
      }
    }
    
    console.log('\n🎉 Message send to all subscribers complete!');
    console.log(`✅ Success: ${successCount}`);
    console.log(`❌ Failures: ${failureCount}`);
    console.log(`📱 Message sent: Item ${specificMessage.item} (${specificMessage.type})`);
    
  } catch (error) {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  }
}

// Run the script
sendMessageToAllUsers().catch(console.error); 