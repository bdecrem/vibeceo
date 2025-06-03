// Load environment variables first, before any imports
import dotenv from 'dotenv';
import path from 'path';

// This must come before supabase import
dotenv.config({ path: path.join(process.cwd(), '.env.local') });

// Now import supabase after env vars are loaded
import { supabase } from '../lib/supabase.js';

async function testSupabaseConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Test basic connection
    const { data, error } = await supabase.from('sms_subscribers').select('count');
    
    if (error) {
      console.error('Error connecting to Supabase:', error.message);
      return;
    }
    
    console.log('Successfully connected to Supabase!');
    console.log('Subscriber count:', data);
    
    // Try to insert a test subscriber
    const testNumber = '+1555123' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    console.log(`Inserting test subscriber with phone number: ${testNumber}`);
    
    const { error: insertError } = await supabase.from('sms_subscribers').insert({
      phone_number: testNumber,
      consent_given: true,
      opt_in_date: new Date().toISOString(),
      unsubscribed: false
    });
    
    if (insertError) {
      console.error('Error inserting test subscriber:', insertError.message);
      return;
    }
    
    console.log('Test subscriber added successfully!');
    
    // Fetch the test subscriber
    const { data: subscriber, error: fetchError } = await supabase
      .from('sms_subscribers')
      .select('*')
      .eq('phone_number', testNumber)
      .single();
      
    if (fetchError) {
      console.error('Error fetching test subscriber:', fetchError.message);
      return;
    }
    
    console.log('Retrieved test subscriber:', subscriber);
    
    // Clean up - delete the test subscriber
    const { error: deleteError } = await supabase
      .from('sms_subscribers')
      .delete()
      .eq('phone_number', testNumber);
      
    if (deleteError) {
      console.error('Error deleting test subscriber:', deleteError.message);
      return;
    }
    
    console.log('Test subscriber deleted successfully!');
    console.log('All Supabase tests passed!');
    
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testSupabaseConnection();
