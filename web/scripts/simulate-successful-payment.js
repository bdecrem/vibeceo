#!/usr/bin/env node

// Simulate a successful payment by directly calling the database update
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function simulatePayment() {
  const subscriberId = 'a5167b9a-a718-4567-a22d-312b7bf9e773';
  const phoneNumber = '+16508989508';
  const creditsToAdd = 25;
  
  console.log('🧪 Simulating successful $10 payment...');
  console.log(`User: ${phoneNumber}`);
  console.log(`Subscriber ID: ${subscriberId}`);
  console.log(`Credits to add: ${creditsToAdd}\n`);
  
  try {
    // 1. Get current credits
    console.log('1. Fetching current subscriber data...');
    const { data: subscriber, error: fetchError } = await supabase
      .from('sms_subscribers')
      .select('credits_remaining, phone_number, email, slug')
      .eq('id', subscriberId)
      .single();
      
    if (fetchError || !subscriber) {
      console.error('❌ Failed to fetch subscriber:', fetchError);
      return;
    }
    
    console.log('Current subscriber data:', {
      phone: subscriber.phone_number,
      email: subscriber.email,
      slug: subscriber.slug,
      currentCredits: subscriber.credits_remaining || 0
    });
    
    // 2. Calculate new credits
    const currentCredits = subscriber.credits_remaining || 0;
    const newCredits = currentCredits + creditsToAdd;
    
    console.log(`\n2. Credit calculation:`);
    console.log(`Current: ${currentCredits}`);
    console.log(`Adding: ${creditsToAdd}`);
    console.log(`New total: ${newCredits}`);
    
    // 3. Update credits
    console.log(`\n3. Updating database...`);
    const { data: updateResult, error: updateError } = await supabase
      .from('sms_subscribers')
      .update({
        credits_remaining: newCredits
      })
      .eq('id', subscriberId)
      .select('credits_remaining');
    
    if (updateError) {
      console.error('❌ Failed to update credits:', updateError);
      return;
    }
    
    console.log('✅ Database updated successfully!');
    console.log('New credits in database:', updateResult?.[0]?.credits_remaining);
    
    // 4. Verify the update
    console.log(`\n4. Verifying update...`);
    const { data: verifyData, error: verifyError } = await supabase
      .from('sms_subscribers')
      .select('credits_remaining')
      .eq('id', subscriberId)
      .single();
      
    if (verifyError) {
      console.error('❌ Verification failed:', verifyError);
      return;
    }
    
    console.log(`✅ Verification successful!`);
    console.log(`Credits in database: ${verifyData.credits_remaining}`);
    
    if (verifyData.credits_remaining === newCredits) {
      console.log(`\n🎉 SUCCESS: Payment simulation completed!`);
      console.log(`User ${phoneNumber} now has ${verifyData.credits_remaining} credits.`);
    } else {
      console.log(`\n❌ MISMATCH: Expected ${newCredits}, got ${verifyData.credits_remaining}`);
    }
    
  } catch (error) {
    console.error('❌ Error during simulation:', error);
  }
}

simulatePayment();