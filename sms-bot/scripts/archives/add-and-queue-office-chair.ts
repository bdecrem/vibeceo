import dotenv from 'dotenv';
import { addItemToSupabase } from '../lib/sms/supabase-add.js';
import { queueSpecificMessage } from '../lib/sms/handlers.js';

// Load environment variables
const envPath = process.cwd() + '/.env.local';
dotenv.config({ path: envPath });

async function addAndQueueOfficeChair() {
  try {
    console.log('🪑 Adding office chair message to database...');
    
    const messageData = {
      type: "inspiration",
      text: "🪑 This is your office chair.\n I've absorbed 47 silent breakdowns this week.\nPlease stop projecting onto the lumbar support.",
      "quotation-marks": "no"
    };

    // Add to database
    const result = await addItemToSupabase(messageData);
    
    if (!result.success) {
      console.error('❌ Failed to add message:', result.error);
      return;
    }

    console.log(`✅ Added office chair message as Item ${result.itemId}`);

    // Queue it for today
    console.log('🎯 Queueing for today\'s broadcast...');
    const queueResult = await queueSpecificMessage(result.itemId!);
    
    if (queueResult.success) {
      console.log(`✅ SUCCESS! Office chair message (Item ${result.itemId}) is now queued for today's broadcast!`);
      console.log('📧 This will be used for both SMS and email sends today.');
    } else {
      console.error('❌ Failed to queue message for today');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

addAndQueueOfficeChair(); 