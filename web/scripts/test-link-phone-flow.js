#!/usr/bin/env node

// Test the EXACT flow that happens when linking a phone
// This simulates what the API does step by step

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLinkPhoneFlow() {
  // Simulate the exact scenario
  const testUserId = '5bdc3be5-c245-4148-8b99-8505b4aa1cbd'; // bartdecrem+13's auth ID
  const testEmail = 'bartdecrem+13@gmail.com';
  const phoneToLink = '+14156366573';
  
  console.log('🧪 TESTING LINK PHONE FLOW\n');
  console.log('User ID:', testUserId);
  console.log('Email:', testEmail);
  console.log('Phone to link:', phoneToLink);
  console.log('---\n');
  
  // Step 1: Get auth user (simulating what getUser does)
  console.log('1️⃣ Getting auth user...');
  const { data: authData } = await supabase.auth.admin.getUserById(testUserId);
  const user = authData.user;
  
  if (!user) {
    console.error('❌ No auth user found');
    return;
  }
  
  console.log('✅ Auth user found:');
  console.log('   ID:', user.id);
  console.log('   Email:', user.email);
  console.log('');
  
  // Step 2: Look for existing subscriber by supabase_id
  console.log('2️⃣ Looking for subscriber by supabase_id...');
  let { data: currentUser } = await supabase
    .from('sms_subscribers')
    .select('*')
    .eq('supabase_id', testUserId)
    .single();
  
  if (currentUser) {
    console.log('✅ Found existing subscriber:');
    console.log('   ID:', currentUser.id);
    console.log('   Email in DB:', currentUser.email);
    console.log('   Phone:', currentUser.phone_number);
    console.log('   Slug:', currentUser.slug);
  } else {
    console.log('❌ No subscriber found by supabase_id');
    
    // Step 3: Try by email
    console.log('\n3️⃣ Looking for subscriber by email...');
    const { data: userByEmail } = await supabase
      .from('sms_subscribers')
      .select('*')
      .eq('email', user.email)
      .single();
    
    if (userByEmail) {
      console.log('✅ Found by email - would update supabase_id');
      currentUser = userByEmail;
    } else {
      console.log('❌ No subscriber found by email either');
      
      // Step 4: Would create new subscriber
      console.log('\n4️⃣ WOULD CREATE NEW SUBSCRIBER WITH:');
      console.log('   supabase_id:', testUserId);
      console.log('   email:', user.email, '<-- THIS IS WHAT WOULD BE USED');
      console.log('   phone: +1555XXXXXXX (placeholder)');
      console.log('');
      console.log('⚠️  If user.email is:', user.email);
      console.log('    Then that\'s what would be inserted');
    }
  }
  
  // Step 5: Check what would happen with the phone
  console.log('\n5️⃣ Checking phone', phoneToLink, '...');
  const { data: existingPhone } = await supabase
    .from('sms_subscribers')
    .select('*')
    .eq('phone_number', phoneToLink)
    .neq('id', currentUser?.id || 'no-id')
    .single();
  
  if (existingPhone) {
    console.log('⚠️  Phone exists for another user:');
    console.log('   Slug:', existingPhone.slug);
    console.log('   Email:', existingPhone.email);
    console.log('   → Would trigger MERGE flow');
  } else {
    console.log('✅ Phone not found elsewhere - would proceed with simple link');
  }
}

testLinkPhoneFlow().catch(console.error);