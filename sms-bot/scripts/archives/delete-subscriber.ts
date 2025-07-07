/**
 * Quick script to delete a subscriber by phone number
 * Usage: npm run build && node dist/scripts/delete-subscriber.js +16508989508
 */
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { supabase } from '../lib/supabase.js';
import { normalizePhoneNumber } from '../lib/subscribers.js';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try to load environment from multiple possible locations
const envPaths = [
  path.resolve(__dirname, '../.env.local'),
  path.resolve(__dirname, '../../.env.local'),
];

let envLoaded = false;
for (const envPath of envPaths) {
  if (fs.existsSync(envPath)) {
    console.log(`Loading environment from ${envPath}`);
    dotenv.config({ path: envPath });
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.warn('Environment file not found');
}

async function deleteSubscriber(phoneNumber: string) {
  try {
    // Normalize the phone number to ensure consistent format
    const normalizedNumber = normalizePhoneNumber(phoneNumber);
    
    console.log(`Attempting to delete subscriber with phone number: ${normalizedNumber}`);
    
    // Try to find the subscriber by both exact match and partial match
    const { data: subscribers, error: fetchError } = await supabase
      .from('sms_subscribers')
      .select('*')
      .or(`phone_number.eq.${normalizedNumber},phone_number.ilike.%${normalizedNumber.replace('+', '')}%`);
    
    if (fetchError) {
      console.error('Error fetching subscribers:', fetchError.message);
      console.log('No subscribers found with that phone number.');
      return;
    }
    
    if (!subscribers || subscribers.length === 0) {
      console.log('No subscribers found with that phone number.');
      return;
    }
    
    console.log(`Found ${subscribers.length} subscriber(s):`, subscribers);
    
    // Delete all matching subscribers
    for (const subscriber of subscribers) {
      console.log(`Deleting subscriber with ID ${subscriber.id} and phone number ${subscriber.phone_number}`);
      
      const { error: deleteError } = await supabase
        .from('sms_subscribers')
        .delete()
        .eq('id', subscriber.id);
      
      if (deleteError) {
        console.error(`Error deleting subscriber ${subscriber.id}:`, deleteError.message);
      } else {
        console.log(`Successfully deleted subscriber ${subscriber.id}`);
      }
    }
    
    console.log(`Operation completed for phone number: ${normalizedNumber}`);
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

// Get phone number from command line arguments
const phoneNumber = process.argv[2];

if (!phoneNumber) {
  console.error('Please provide a phone number as an argument');
  console.error('Usage: npm run build && node dist/scripts/delete-subscriber.js +16508989508');
  process.exit(1);
}

// Run the delete function
deleteSubscriber(phoneNumber).then(() => {
  console.log('Done');
  process.exit(0);
});
