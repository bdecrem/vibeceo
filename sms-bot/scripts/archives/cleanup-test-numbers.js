import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../web/.env.local') });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function cleanupTestNumbers() {
  console.log('Cleaning up invalid test phone numbers...');
  console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  
  // Remove any 555 test numbers that are not valid for SMS
  const { data, error } = await supabase
    .from('sms_subscribers')
    .delete()
    .like('phone_number', '+1555%');
    
  if (error) {
    console.error('Error cleaning up test numbers:', error);
    return;
  }
  
  console.log('Cleanup completed successfully');
  console.log('Removed records:', data);
}

cleanupTestNumbers().catch(console.error); 