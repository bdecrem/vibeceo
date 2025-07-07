import 'dotenv/config';
import { supabase } from '../lib/supabase.js';
import { confirmSubscriber, getSubscriber } from '../lib/subscribers.js';

const PHONE_NUMBER = '+16508989508';

async function testConfirmation() {
  try {
    console.log(`Testing confirmation for ${PHONE_NUMBER}...`);
    
    // First check current status
    console.log('\nChecking current status:');
    const beforeSubscriber = await getSubscriber(PHONE_NUMBER);
    if (!beforeSubscriber) {
      console.log('❌ Subscriber not found in database');
      return;
    }
    console.log('Current status:', {
      confirmed: beforeSubscriber.confirmed,
      unsubscribed: beforeSubscriber.unsubscribed,
      last_message_date: beforeSubscriber.last_message_date
    });
    
    // Try to confirm
    console.log('\nAttempting to confirm subscriber...');
    const success = await confirmSubscriber(PHONE_NUMBER);
    console.log('Confirmation result:', success);
    
    // Check status after confirmation
    console.log('\nChecking status after confirmation:');
    const afterSubscriber = await getSubscriber(PHONE_NUMBER);
    if (!afterSubscriber) {
      console.log('❌ Subscriber not found in database');
      return;
    }
    console.log('Updated status:', {
      confirmed: afterSubscriber.confirmed,
      unsubscribed: afterSubscriber.unsubscribed,
      last_message_date: afterSubscriber.last_message_date
    });
    
  } catch (error) {
    console.error('Error testing confirmation:', error);
  } finally {
    process.exit();
  }
}

testConfirmation(); 