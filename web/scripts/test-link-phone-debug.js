// Test script to debug the link phone issue
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

async function testLinkPhone() {
  const { createClient } = require('@supabase/supabase-js');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // First, let's check what's in the database for bartdecrem+10
  console.log('\n=== Checking bartdecrem+10@gmail.com ===');
  const { data: user10, error: error10 } = await supabase
    .from('sms_subscribers')
    .select('*')
    .eq('email', 'bartdecrem+10@gmail.com')
    .single();
    
  if (user10) {
    console.log('User bartdecrem+10:');
    console.log('  Email:', user10.email);
    console.log('  Phone:', user10.phone_number);
    console.log('  Supabase ID:', user10.supabase_id);
    console.log('  Slug:', user10.slug);
    console.log('  Phone starts with +1555?', user10.phone_number?.startsWith('+1555'));
    console.log('  Phone starts with +15556?', user10.phone_number?.startsWith('+15556'));
  } else {
    console.log('User not found:', error10);
  }
  
  // Now check all users with supabase_id to see if there are duplicates
  if (user10?.supabase_id) {
    console.log('\n=== Checking for duplicate supabase_id ===');
    const { data: duplicates, error: dupError } = await supabase
      .from('sms_subscribers')
      .select('email, phone_number, slug')
      .eq('supabase_id', user10.supabase_id);
      
    if (duplicates && duplicates.length > 1) {
      console.log('WARNING: Found multiple users with same supabase_id!');
      duplicates.forEach(dup => {
        console.log(`  - ${dup.email || 'NO EMAIL'} | ${dup.phone_number} | ${dup.slug}`);
      });
    } else {
      console.log('No duplicates found');
    }
  }
  
  // Check if there's a user with the phone number we're trying to link
  console.log('\n=== Checking target phone 4156366573 ===');
  const { data: targetPhone } = await supabase
    .from('sms_subscribers')
    .select('email, phone_number, slug, supabase_id')
    .or('phone_number.eq.+14156366573,phone_number.eq.4156366573');
    
  if (targetPhone && targetPhone.length > 0) {
    console.log('Found users with target phone:');
    targetPhone.forEach(t => {
      console.log(`  - ${t.email || 'NO EMAIL'} | ${t.phone_number} | ${t.slug}`);
    });
  } else {
    console.log('No existing user with this phone number');
  }
}

testLinkPhone();