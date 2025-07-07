import 'dotenv/config';
import { supabase } from '../lib/supabase.js';
import { normalizePhoneNumber } from '../lib/subscribers.js';

// Get phone number from command line argument or use default
const phoneNumber = process.argv[2] || '+16508989508';
const normalizedNumber = normalizePhoneNumber(phoneNumber);

console.log(`Checking for subscriber: ${normalizedNumber}`);

async function checkSubscriber() {
  try {
    const { data, error } = await supabase
      .from('sms_subscribers')
      .select('*')
      .eq('phone_number', normalizedNumber)
      .single();
      
    if (error) {
      if (error.code === 'PGRST116') {
        console.log('❌ Subscriber not found in database');
        return;
      }
      console.error('Error:', error);
      return;
    }
    
    console.log('✅ Subscriber found:');
    console.log(`  - Phone: ${data.phone_number}`);
    console.log(`  - Confirmed: ${data.confirmed}`);
    console.log(`  - Unsubscribed: ${data.unsubscribed}`);
    console.log(`  - Created: ${data.created_at}`);
    
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

checkSubscriber(); 