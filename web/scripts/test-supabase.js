// A simple script to test the Supabase connection in the web project
import { supabase } from '../lib/supabase.ts';

async function testWebSupabaseConnection() {
  console.log('Testing web project Supabase connection...');
  
  try {
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
    console.log('Supabase URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    
    console.log('All web Supabase tests passed!');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testWebSupabaseConnection();
