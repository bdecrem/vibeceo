// Test script to trace exact failure point
const fetch = require('node-fetch');
require('dotenv').config({ path: '.env.local' });

async function testExactFlow() {
  const { createClient } = require('@supabase/supabase-js');
  
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    return;
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  // Test user email - you said bartdecrem+14@gmail
  const testEmail = 'bartdecrem+14@gmail.com'; // Adding .com
  
  console.log('STEP 1: Looking up user by email:', testEmail);
  
  // Try exact email match
  let { data: subscriber, error } = await supabase
    .from('sms_subscribers')
    .select('*')
    .eq('email', testEmail)
    .single();
    
  if (error) {
    console.log('Not found with exact match, error:', error.message);
    
    // Try case-insensitive
    console.log('STEP 2: Trying case-insensitive search...');
    const { data: ilikeSubs, error: ilikeError } = await supabase
      .from('sms_subscribers')
      .select('*')
      .ilike('email', testEmail);
      
    console.log('Case-insensitive results:', ilikeSubs);
    
    // Try partial match
    console.log('STEP 3: Trying partial match for bartdecrem+14...');
    const { data: partialSubs, error: partialError } = await supabase
      .from('sms_subscribers')
      .select('*')
      .ilike('email', '%bartdecrem+14%');
      
    console.log('Partial match results:', partialSubs);
  } else {
    console.log('FOUND subscriber:', {
      slug: subscriber.slug,
      email: subscriber.email,
      phone: subscriber.phone_number,
      role: subscriber.role,
      supabase_id: subscriber.supabase_id
    });
  }
  
  // Now check what supabase_id the auth user has
  console.log('\nSTEP 4: Checking auth users table...');
  const { data: authUsers, error: authError } = await supabase
    .from('auth.users')
    .select('id, email')
    .ilike('email', '%bartdecrem+14%');
    
  if (authUsers && authUsers.length > 0) {
    console.log('Auth user found:', authUsers[0]);
    
    // Check if this ID exists in sms_subscribers
    const authUserId = authUsers[0].id;
    console.log('\nSTEP 5: Looking up by supabase_id:', authUserId);
    
    const { data: subById, error: idError } = await supabase
      .from('sms_subscribers')
      .select('*')
      .eq('supabase_id', authUserId)
      .single();
      
    if (subById) {
      console.log('Found by supabase_id:', subById.slug);
    } else {
      console.log('NOT found by supabase_id, error:', idError?.message);
    }
  }
}

testExactFlow();