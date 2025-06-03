import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env.local
const envPath = path.join(process.cwd(), '.env.local');
if (fs.existsSync(envPath)) {
  console.log(`Loading environment from ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  console.warn(`Environment file not found at ${envPath}`);
}

// Import Supabase after loading environment variables
import { createClient } from '@supabase/supabase-js';

async function testWebSupabaseConnection() {
  console.log('Testing web project Supabase connection...');
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Missing Supabase credentials in environment variables');
      console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Not set');
      console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'Set' : 'Not set');
      return;
    }
    
    // Create Supabase client manually for testing
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test basic connection by counting subscribers
    const { data, error } = await supabase
      .from('sms_subscribers')
      .select('count');
      
    if (error) {
      console.error('Error connecting to Supabase:', error.message);
      return;
    }
    
    console.log('Successfully connected to Supabase from web project!');
    console.log('Subscriber count:', data);
    
    console.log('All web Supabase tests passed!');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testWebSupabaseConnection();
