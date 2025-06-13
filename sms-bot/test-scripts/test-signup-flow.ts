/**
 * Test script for the new START command signup functionality
 * This tests the complete signup flow: START -> YES -> confirmed user
 */

import { processIncomingSms } from '../lib/sms/handlers.js';
import { getSubscriber, createNewSubscriber } from '../lib/subscribers.js';
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

async function testSignupFlow() {
  console.log('🧪 Starting signup flow test...\n');
  
  // Use a test phone number
  const testPhoneNumber = '+15551234567';
  
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
    
    // Step 3: Test START command (new signup)
    console.log('3️⃣ Testing START command for new user...');
    await processIncomingSms(testPhoneNumber, 'START', mockTwilioClient);
    console.log('✅ START command processed\n');
    
    // Step 4: Verify user was created but not confirmed
    console.log('4️⃣ Verifying user was created but not confirmed...');
    const newUser = await getSubscriber(testPhoneNumber);
    if (!newUser) {
      console.log('❌ User was not created in database');
      return;
    }
    if (newUser.confirmed) {
      console.log('❌ User should not be confirmed yet');
      return;
    }
    console.log('✅ User created, not confirmed (as expected)');
    console.log(`   Phone: ${newUser.phone_number}`);
    console.log(`   Slug: ${newUser.slug}`);
    console.log(`   Confirmed: ${newUser.confirmed}`);
    console.log(`   Role: ${newUser.role}\n`);
    
    // Step 5: Test YES confirmation
    console.log('5️⃣ Testing YES confirmation...');
    await processIncomingSms(testPhoneNumber, 'YES', mockTwilioClient);
    console.log('✅ YES command processed\n');
    
    // Step 6: Verify user is now confirmed
    console.log('6️⃣ Verifying user is now confirmed...');
    const confirmedUser = await getSubscriber(testPhoneNumber);
    if (!confirmedUser) {
      console.log('❌ User disappeared from database');
      return;
    }
    if (!confirmedUser.confirmed) {
      console.log('❌ User should be confirmed now');
      return;
    }
    console.log('✅ User is now confirmed');
    console.log(`   Confirmed: ${confirmedUser.confirmed}\n`);
    
    // Step 7: Test START command for existing user
    console.log('7️⃣ Testing START command for existing confirmed user...');
    await processIncomingSms(testPhoneNumber, 'START', mockTwilioClient);
    console.log('✅ START command for existing user processed\n');
    
    // Step 8: Test regular message processing
    console.log('8️⃣ Testing regular message processing...');
    await processIncomingSms(testPhoneNumber, 'COMMANDS', mockTwilioClient);
    console.log('✅ Regular message processed\n');
    
    // Step 9: Clean up test data
    console.log('9️⃣ Cleaning up test data...');
    await supabase
      .from('sms_subscribers')
      .delete()
      .eq('phone_number', testPhoneNumber);
    console.log('✅ Test data cleaned up\n');
    
    console.log('🎉 All signup flow tests passed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    
    // Clean up on error
    try {
      await supabase
        .from('sms_subscribers')
        .delete()
        .eq('phone_number', testPhoneNumber);
      console.log('🧹 Cleaned up test data after error');
    } catch (cleanupError) {
      console.error('Failed to clean up test data:', cleanupError);
    }
  }
}

// Run the test
testSignupFlow().catch(console.error); 