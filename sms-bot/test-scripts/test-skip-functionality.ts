#!/usr/bin/env node

import { pickMessageForSkip, skipToNextInspiration, setNextDailyMessage } from '../lib/sms/handlers.js';

async function testSkipFunctionality() {
  try {
    console.log('🧪 Testing SKIP functionality...\n');
    
    // Test 1: Basic pickMessageForSkip function
    console.log('📋 Test 1: Testing pickMessageForSkip function');
    const message1 = await pickMessageForSkip();
    console.log(`✅ First message: Item ${message1.item} (${message1.type})`);
    
    // Test 2: Exclude a specific item
    console.log('\n📋 Test 2: Testing exclusion of specific item');
    const message2 = await pickMessageForSkip(message1.item);
    console.log(`✅ Second message: Item ${message2.item} (${message2.type})`);
    
    if (message1.item !== message2.item) {
      console.log('✅ Exclusion working - got different message');
    } else {
      console.log('⚠️  Same message returned (might be only one available in category)');
    }
    
    // Test 3: Multiple SKIP operations
    console.log('\n📋 Test 3: Testing multiple consecutive SKIPs');
    
    // Simulate setting a message for today
    setNextDailyMessage(message1);
    console.log(`🎯 Set initial message: Item ${message1.item}`);
    
    // First SKIP
    console.log('\n🔄 Performing first SKIP...');
    const skipResult1 = await skipToNextInspiration();
    console.log(`✅ After first SKIP: Item ${skipResult1.inspiration.item} (${skipResult1.inspiration.type})`);
    
    // Second SKIP
    console.log('\n🔄 Performing second SKIP...');
    const skipResult2 = await skipToNextInspiration();
    console.log(`✅ After second SKIP: Item ${skipResult2.inspiration.item} (${skipResult2.inspiration.type})`);
    
    // Third SKIP
    console.log('\n🔄 Performing third SKIP...');
    const skipResult3 = await skipToNextInspiration();
    console.log(`✅ After third SKIP: Item ${skipResult3.inspiration.item} (${skipResult3.inspiration.type})`);
    
    // Check all results are different (if possible)
    const allResults = [message1.item, skipResult1.inspiration.item, skipResult2.inspiration.item, skipResult3.inspiration.item];
    const uniqueResults = [...new Set(allResults)];
    
    console.log('\n📊 Summary:');
    console.log(`🎲 Total messages tested: ${allResults.length}`);
    console.log(`🆔 Unique messages: ${uniqueResults.length}`);
    console.log(`📝 Message IDs: ${allResults.join(', ')}`);
    
    if (uniqueResults.length >= 3) {
      console.log('🎉 SUCCESS: Multiple SKIP operations are working correctly!');
    } else if (uniqueResults.length >= 2) {
      console.log('✅ GOOD: SKIP is providing alternatives (limited message pool might be causing some repeats)');
    } else {
      console.log('⚠️  WARNING: All SKIPs returned the same message - check message pool size');
    }
    
    console.log('\n✅ SKIP functionality test completed!');
    
  } catch (error) {
    console.error('❌ Error testing SKIP functionality:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

// Run the test
testSkipFunctionality(); 