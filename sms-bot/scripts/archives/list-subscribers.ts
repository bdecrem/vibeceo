/**
 * List all SMS subscribers in the database
 */
import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';
import { SMSSubscriber } from '../lib/supabase.js';
import { normalizePhoneNumber } from '../lib/subscribers.js';

// Load environment variables from .env.local
if (process.env.NODE_ENV !== 'production') {
  const { config } = await import('dotenv');
  const path = require('path');
  
  // Try to load from dist/.env.local first (for built scripts)
  let result = config({ path: path.resolve(process.cwd(), 'dist', '.env.local') });
  
  if (result.error) {
    console.log('Environment file not found at ' + path.resolve(process.cwd(), 'dist', '.env.local'));
    // Fall back to .env.local in the project root
    result = config({ path: path.resolve(process.cwd(), '.env.local') });
    console.log('Loading environment from ' + path.resolve(process.cwd(), '.env.local'));
  }
}

// Validate required environment variables
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set');
  process.exit(1);
}

// Initialize Supabase client with service role key for admin access
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * List all subscribers in the database
 */
async function listSubscribers(): Promise<void> {
  try {
    console.log('Fetching all SMS subscribers from database...');
    
    // Query all subscribers from the database
    const { data: subscribers, error } = await supabase
      .from('sms_subscribers')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching subscribers:', error.message);
      process.exit(1);
    }
    
    if (!subscribers || subscribers.length === 0) {
      console.log('No subscribers found in the database.');
      return;
    }
    
    console.log(`Found ${subscribers.length} subscriber(s):`);
    subscribers.forEach((subscriber: SMSSubscriber, index: number) => {
      console.log(`\n--- Subscriber ${index + 1} ---`);
      console.log(`ID: ${subscriber.id}`);
      console.log(`Phone: ${subscriber.phone_number}`);
      console.log(`Confirmed: ${subscriber.confirmed ? 'Yes' : 'No'}`);
      console.log(`Opt-in Date: ${subscriber.opt_in_date}`);
      console.log(`Last Message: ${subscriber.last_message_date || 'Never'}`);
      console.log(`Unsubscribed: ${subscriber.unsubscribed ? 'Yes' : 'No'}`);
    });
    
  } catch (err) {
    console.error('Unexpected error:', err);
    process.exit(1);
  }
}

// Run the script
listSubscribers()
  .then(() => {
    console.log('Done');
  })
  .catch((err) => {
    console.error('Script failed:', err);
    process.exit(1);
  });
