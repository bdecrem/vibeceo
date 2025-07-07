import 'dotenv/config';
import { supabase } from '../lib/supabase.js';
import { getSubscriber } from '../lib/subscribers.js';

const PHONE_NUMBER = '+16508989508';

async function checkMyStatus() {
  try {
    console.log(`Checking subscriber status for ${PHONE_NUMBER}...`);
    
    const subscriber = await getSubscriber(PHONE_NUMBER);
    
    if (!subscriber) {
      console.log('❌ Not found in database');
      return;
    }
    
    console.log('✅ Subscriber found:');
    console.log('-------------------');
    console.log(`Phone: ${subscriber.phone_number}`);
    console.log(`Confirmed: ${subscriber.confirmed ? 'Yes' : 'No'}`);
    console.log(`Consent Given: ${subscriber.consent_given ? 'Yes' : 'No'}`);
    console.log(`Unsubscribed: ${subscriber.unsubscribed ? 'Yes' : 'No'}`);
    console.log(`Last Message: ${subscriber.last_message_date || 'Never'}`);
    
  } catch (error) {
    console.error('Error checking status:', error);
  } finally {
    process.exit();
  }
}

checkMyStatus(); 