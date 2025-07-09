/**
 * Test script to verify YES command still works for daily messages
 */

import { processIncomingSms } from '../lib/sms/handlers.js';
import { getSubscriber } from '../lib/subscribers.js';
import { supabase } from '../lib/supabase.js';

// Mock Twilio client for testing
const mockTwilioClient = {
  messages: {
    create: async (messageData: any) => {
      console.log(`📱 MOCK SMS: ${messageData.body}`);
      return { sid: 'mock_message_id' };
    }
  }
} as any;

async function testYesCommand() {
  console.log('🧪 Testing YES command functionality...\n');
  
  const testPhone = '+15551111111';
  
  try {
    // Clean up
    await supabase.from('sms_subscribers').delete().eq('phone_number', testPhone);
    
    // Test START command
    console.log('1️⃣ Testing START command...');
    await processIncomingSms(testPhone, 'START', mockTwilioClient);
    
    // Check user state
    const user = await getSubscriber(testPhone);
    console.log(`User after START: confirmed=${user?.confirmed}, consent_given=${user?.consent_given}`);
    
    // Test WTAF command (should work immediately)
    console.log('\n2️⃣ Testing WTAF command (should work without YES)...');
    await processIncomingSms(testPhone, 'WTAF build me a calculator', mockTwilioClient);
    
    // Test YES command
    console.log('\n3️⃣ Testing YES command...');
    await processIncomingSms(testPhone, 'YES', mockTwilioClient);
    
    // Check final state
    const finalUser = await getSubscriber(testPhone);
    console.log(`User after YES: confirmed=${finalUser?.confirmed}, consent_given=${finalUser?.consent_given}`);
    
    // Verify the flow works correctly
    if (finalUser?.confirmed === true && finalUser?.consent_given === true) {
      console.log('\n✅ YES command test passed - user is now confirmed for daily messages!');
    } else {
      console.log('\n❌ YES command test failed - user state incorrect');
    }
    
    // Clean up
    await supabase.from('sms_subscribers').delete().eq('phone_number', testPhone);
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    process.exit();
  }
}

testYesCommand().catch(console.error); 