#!/usr/bin/env node

// Check user credits in database to debug payment issue
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  console.error('Please set SUPABASE_URL and SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUserCredits() {
  const phone = '+16508989508';
  const subscriberId = 'a5167b9a-a718-4567-a22d-312b7bf9e773';
  
  console.log(`🔍 Checking credits for user:`);
  console.log(`Phone: ${phone}`);
  console.log(`Subscriber ID: ${subscriberId}`);
  console.log('');
  
  try {
    // Check by phone number
    console.log('1. Looking up by phone number...');
    const { data: phoneUser, error: phoneError } = await supabase
      .from('sms_subscribers')
      .select('*')
      .eq('phone_number', phone);
      
    if (phoneError) {
      console.error('Error fetching by phone:', phoneError);
    } else {
      console.log(`Found ${phoneUser.length} user(s) with phone ${phone}:`);
      phoneUser.forEach((user, idx) => {
        console.log(`  ${idx + 1}. ID: ${user.id}`);
        console.log(`     Credits: ${user.credits_remaining || 0}`);
        console.log(`     Email: ${user.email || 'none'}`);
        console.log(`     Slug: ${user.slug || 'none'}`);
        console.log(`     Payment Customer ID: ${user.payment_customer_id || 'none'}`);
        console.log('');
      });
    }
    
    // Check by subscriber ID
    console.log('2. Looking up by subscriber ID...');
    const { data: idUser, error: idError } = await supabase
      .from('sms_subscribers')
      .select('*')
      .eq('id', subscriberId);
      
    if (idError) {
      console.error('Error fetching by ID:', idError);
    } else {
      console.log(`Found ${idUser.length} user(s) with ID ${subscriberId}:`);
      idUser.forEach((user, idx) => {
        console.log(`  ${idx + 1}. Phone: ${user.phone_number}`);
        console.log(`     Credits: ${user.credits_remaining || 0}`);
        console.log(`     Email: ${user.email || 'none'}`);
        console.log(`     Slug: ${user.slug || 'none'}`);
        console.log(`     Payment Customer ID: ${user.payment_customer_id || 'none'}`);
        console.log('');
      });
    }
    
    // Also check if there are any users with recent payment activity
    console.log('3. Recent payment activity (last 24h)...');
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    const { data: recentPayments, error: recentError } = await supabase
      .from('sms_subscribers')
      .select('*')
      .not('payment_customer_id', 'is', null)
      .gte('updated_at', yesterday.toISOString());
      
    if (recentError) {
      console.error('Error fetching recent payments:', recentError);
    } else {
      console.log(`Found ${recentPayments.length} user(s) with recent payment activity:`);
      recentPayments.forEach((user, idx) => {
        console.log(`  ${idx + 1}. Phone: ${user.phone_number}, Credits: ${user.credits_remaining || 0}, Updated: ${user.updated_at}`);
      });
    }
    
  } catch (error) {
    console.error('Error checking user credits:', error);
  }
}

checkUserCredits();