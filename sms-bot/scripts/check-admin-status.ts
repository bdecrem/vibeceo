import 'dotenv/config';
import { supabase } from '../lib/supabase.js';
import { getSubscriber } from '../lib/subscribers.js';

const PHONE_NUMBER = '+16508989508';

async function checkAdminStatus() {
  try {
    console.log(`Checking admin status for ${PHONE_NUMBER}...`);
    
    const subscriber = await getSubscriber(PHONE_NUMBER);
    
    if (!subscriber) {
      console.log('❌ Not found in database');
      return;
    }
    
    console.log('✅ Subscriber found:');
    console.log('-------------------');
    console.log(`Phone: ${subscriber.phone_number}`);
    console.log(`Confirmed: ${subscriber.confirmed ? 'Yes' : 'No'}`);
    console.log(`Admin: ${subscriber.is_admin ? 'Yes' : 'No'}`);
    console.log(`Unsubscribed: ${subscriber.unsubscribed ? 'Yes' : 'No'}`);
    
    if (subscriber.is_admin) {
      console.log('\n✅ CODE command should work for this number');
    } else {
      console.log('\n❌ CODE command will be silently ignored - not admin');
    }
    
  } catch (error) {
    console.error('Error checking status:', error);
  } finally {
    process.exit();
  }
}

checkAdminStatus(); 