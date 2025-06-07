// Test script for weekend tipsy Alex SMS functionality
// This script tests the weekend detection and prompt injection without sending real SMS

const { getCoachConversationHistory } = require('./lib/sms/handlers');

// Test function
async function testTipsyAlex() {
  console.log('🧪 Testing Weekend Tipsy Alex SMS Feature');
  console.log('==========================================');
  
  // Force weekend mode for testing
  process.env.WEEKEND_MODE_SMS_OVERRIDE = 'ON';
  console.log('✅ Weekend mode forced ON for testing');
  
  // Test phone number (fake)
  const testPhone = '+1234567890';
  
  try {
    // Test Alex conversation history creation
    console.log('\n📱 Testing Alex conversation history creation...');
    const alexHistory = getCoachConversationHistory(testPhone, 'Alex');
    
    if (alexHistory && alexHistory.length > 0) {
      console.log('✅ Alex conversation history created successfully');
      console.log('📋 System prompt preview:');
      console.log(alexHistory[0].content.substring(0, 200) + '...');
      
      // Check if tipsy prompt is being used
      if (alexHistory[0].content.includes('tipsy')) {
        console.log('🍸 ✅ Weekend tipsy prompt detected!');
      } else {
        console.log('❌ Regular prompt detected (expected tipsy)');
      }
    } else {
      console.log('❌ Failed to create Alex conversation history');
    }
    
    // Test with weekend mode OFF
    console.log('\n🔄 Testing with weekend mode OFF...');
    process.env.WEEKEND_MODE_SMS_OVERRIDE = 'OFF';
    
    // Clear the conversation store to force re-creation
    const testPhone2 = '+1234567891';
    const alexHistoryWeekday = getCoachConversationHistory(testPhone2, 'Alex');
    
    if (alexHistoryWeekday && alexHistoryWeekday.length > 0) {
      console.log('✅ Alex weekday conversation history created');
      
      if (alexHistoryWeekday[0].content.includes('tipsy')) {
        console.log('❌ Tipsy prompt detected (expected regular)');
      } else {
        console.log('✅ Regular prompt detected for weekday');
      }
    }
    
    console.log('\n🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

// Run the test
testTipsyAlex();
