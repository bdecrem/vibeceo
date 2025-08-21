#!/usr/bin/env node

// Reset user credits to test webhook again
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function resetCredits() {
  const subscriberId = 'a5167b9a-a718-4567-a22d-312b7bf9e773';
  
  console.log('🔄 Resetting credits to 0 for testing...');
  
  const { data, error } = await supabase
    .from('sms_subscribers')
    .update({ credits_remaining: 0 })
    .eq('id', subscriberId)
    .select('credits_remaining');
    
  if (error) {
    console.error('❌ Failed to reset:', error);
  } else {
    console.log('✅ Credits reset to:', data[0].credits_remaining);
  }
}

resetCredits();