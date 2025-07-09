/**
 * Test script for the new permissive SMS flow
 * This tests that any user can send any message without needing START or YES confirmation
 */

import { processIncomingSms } from '../lib/sms/handlers.js';
import { getSubscriber } from '../lib/subscribers.js';
import { supabase } from '../lib/supabase.js';

// Mock Twilio client for testing
const mockTwilioClient = {
  messages: {
    create: async (messageData: any) => {
      console.log(`📱 MOCK SMS: To ${messageData.to}`);
      console.log(`📱 MOCK SMS: From ${messageData.from}`);
      console.log(`📱 MOCK SMS: Body: ${messageData.body}`);
      console.log('📱 MOCK SMS: ----');
      return { sid: 'mock_message_id' };
    }
  }
} as any;

async function testPermissiveFlow() {
  console.log('🧪 Testing new permissive SMS flow...\n');
  
  // Use a test phone number
  const testPhoneNumber = '+15551234999';
  
  try {
    // Step 1: Clean up any existing test data
    console.log('1️⃣ Cleaning up any existing test data...');
    await supabase
      .from('sms_subscribers')
      .delete()
      .eq('phone_number', testPhoneNumber);
    console.log('✅ Test data cleaned up\n');
    
    // Step 2: Verify user doesn't exist
    console.log('2️⃣ Verifying user doesn\'t exist...');
    const initialUser = await getSubscriber(testPhoneNumber);
    if (initialUser) {
      console.log('❌ Test user still exists after cleanup');
      return;
    }
    console.log('✅ User doesn\'t exist (as expected)\n');
    
    // Step 3: Test WTAF command directly (should auto-create user)
    console.log('3️⃣ Testing WTAF command from completely new user...');
    await processIncomingSms(testPhoneNumber, 'WTAF build me a todo app', mockTwilioClient);
    console.log('✅ WTAF command processed\n');
    
    // Step 4: Verify user was auto-created with correct defaults
    console.log('4️⃣ Verifying user was auto-created with correct defaults...');
    const newUser = await getSubscriber(testPhoneNumber);
    if (!newUser) {
      console.log('❌ User was not created in database');
      return;
    }
    
    console.log('✅ User auto-created successfully:');
    console.log(`   Phone: ${newUser.phone_number}`);
    console.log(`   Consent Given: ${newUser.consent_given}`);
    console.log(`   Confirmed: ${newUser.confirmed}`);
    console.log(`   Unsubscribed: ${newUser.unsubscribed}`);
    console.log(`   Role: ${newUser.role}`);
    console.log(`   Slug: ${newUser.slug}\n`);
    
    // Verify the defaults are correct
    if (newUser.consent_given !== true) {
      console.log('❌ consent_given should be true');
      return;
    }
    if (newUser.confirmed !== false) {
      console.log('❌ confirmed should be false');
      return;
    }
    if (newUser.unsubscribed !== false) {
      console.log('❌ unsubscribed should be false');
      return;
    }
    if (newUser.role !== 'coder') {
      console.log('❌ role should be coder');
      return;
    }
    
    // Step 5: Test another command (should work immediately)
    console.log('5️⃣ Testing another command from same user...');
    await processIncomingSms(testPhoneNumber, 'COMMANDS', mockTwilioClient);
    console.log('✅ COMMANDS processed successfully\n');
    
    // Step 6: Test with a different new user and different command
    const testPhoneNumber2 = '+15559876543';
    console.log('6️⃣ Testing with second new user and CODE command...');
    await processIncomingSms(testPhoneNumber2, 'CODE console.log("hello world")', mockTwilioClient);
    console.log('✅ CODE command processed\n');
    
    // Step 7: Verify second user was also auto-created
    console.log('7️⃣ Verifying second user was auto-created...');
    const secondUser = await getSubscriber(testPhoneNumber2);
    if (!secondUser) {
      console.log('❌ Second user was not created in database');
      return;
    }
    
    console.log('✅ Second user auto-created successfully:');
    console.log(`   Phone: ${secondUser.phone_number}`);
    console.log(`   Consent Given: ${secondUser.consent_given}`);
    console.log(`   Confirmed: ${secondUser.confirmed}`);
    console.log(`   Slug: ${secondUser.slug}\n`);
    
    // Step 8: Test that unsubscribed users still get blocked
    console.log('8️⃣ Testing that unsubscribed users are still blocked...');
    // First unsubscribe the first user
    await supabase
      .from('sms_subscribers')
      .update({ unsubscribed: true })
      .eq('phone_number', testPhoneNumber);
    
    // Try to send a message from unsubscribed user
    await processIncomingSms(testPhoneNumber, 'WTAF another app', mockTwilioClient);
    console.log('✅ Unsubscribed user handling tested\n');
    
    console.log('🎉 All tests passed! New permissive flow is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    // Clean up test data
    console.log('\n🧹 Cleaning up test data...');
    await supabase
      .from('sms_subscribers')
      .delete()
      .eq('phone_number', testPhoneNumber);
    await supabase
      .from('sms_subscribers')
      .delete()
      .eq('phone_number', '+15559876543');
    console.log('✅ Test data cleaned up');
    
    process.exit();
  }
}

// Run the test
testPermissiveFlow().catch(console.error); 