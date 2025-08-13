#!/usr/bin/env node

// Test script to verify phone linking logic
// Run with: node scripts/test-phone-link.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testPhoneLinking() {
  console.log('🧪 Testing Phone Linking Logic\n');
  
  // Test user email - CHANGE THIS TO YOUR TEST USER
  const testEmail = 'bdecrem@gmail.com'; // <-- CHANGE THIS
  const testPhone = '+19999999999'; // <-- Brand new phone number
  
  try {
    // 1. Find user by email
    console.log(`1️⃣ Looking for user with email: ${testEmail}`);
    const { data: users, error: userError } = await supabase
      .from('sms_subscribers')
      .select('*')
      .eq('email', testEmail);
    
    if (userError) {
      console.error('❌ Error finding user:', userError);
      return;
    }
    
    if (!users || users.length === 0) {
      console.log('❌ No user found with that email');
      return;
    }
    
    const currentUser = users[0];
    console.log('✅ Found user:', {
      id: currentUser.id,
      slug: currentUser.slug,
      phone: currentUser.phone_number,
      email: currentUser.email
    });
    
    // 2. Check if same phone
    console.log(`\n2️⃣ Checking if ${testPhone} equals current phone ${currentUser.phone_number}`);
    const isSamePhone = currentUser.phone_number === testPhone;
    const isPlaceholder = currentUser.phone_number?.startsWith('+1555');
    
    console.log(`   Same phone? ${isSamePhone}`);
    console.log(`   Is placeholder? ${isPlaceholder}`);
    
    if (isSamePhone && !isPlaceholder) {
      console.log('❌ Would block: Same phone already linked');
      return;
    }
    console.log('✅ Would allow: Different phone or placeholder');
    
    // 3. Check if phone exists elsewhere
    console.log(`\n3️⃣ Checking if ${testPhone} exists for OTHER users`);
    const { data: otherUsers, error: otherError } = await supabase
      .from('sms_subscribers')
      .select('*')
      .eq('phone_number', testPhone)
      .neq('id', currentUser.id);
    
    if (otherError) {
      console.error('❌ Error checking other users:', otherError);
      return;
    }
    
    if (otherUsers && otherUsers.length > 0) {
      console.log('⚠️ Phone exists for other user(s):');
      otherUsers.forEach(u => {
        console.log(`   - @${u.slug} (id: ${u.id})`);
      });
      console.log('   → Would trigger MERGE flow with SMS verification');
    } else {
      console.log('✅ Phone not found elsewhere');
      console.log('   → Would proceed with simple SMS verification');
    }
    
    console.log('\n✅ Test complete - logic appears correct');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testPhoneLinking();