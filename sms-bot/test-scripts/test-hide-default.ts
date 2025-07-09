/**
 * Test script to check if SMS bot can read hide_default setting
 */

import { getHideDefault, getSubscriber } from '../lib/subscribers.js';

async function testHideDefault() {
  console.log('🧪 Testing hide_default functionality...\n');
  
  // Test with your phone number
  const testPhone = '+16508989508'; // Your phone number
  
  try {
    // Test 1: Can we get the subscriber?
    console.log('1️⃣ Testing getSubscriber...');
    const subscriber = await getSubscriber(testPhone);
    if (subscriber) {
      console.log('✅ Subscriber found:', {
        slug: subscriber.slug,
        hide_default: subscriber.hide_default,
        phone_number: subscriber.phone_number
      });
    } else {
      console.log('❌ Subscriber not found');
      return;
    }
    
    // Test 2: Can we get the hide_default setting?
    console.log('\n2️⃣ Testing getHideDefault...');
    const hideDefault = await getHideDefault(testPhone);
    console.log('✅ Hide default setting:', hideDefault);
    
    // Test 3: What would happen in storage-manager?
    console.log('\n3️⃣ Testing storage-manager logic...');
    if (hideDefault) {
      console.log('✅ Would set Forget=true for new pages');
    } else {
      console.log('❌ Would NOT set Forget=true for new pages');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

testHideDefault() 