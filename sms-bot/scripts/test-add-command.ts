#!/usr/bin/env node

import { addItemToSupabase } from '../lib/sms/supabase-add.js';

async function testAddCommand() {
  try {
    console.log('🧪 Testing ADD command with Supabase...\n');

    // Test 1: Add a simple inspiration message
    const inspirationMessage = {
      type: 'inspiration',
      'quotation-marks': 'yes',
      prepend: '💬 ',
      text: 'Testing is just debugging with extra steps and more caffeine.',
      author: 'Test Coach'
    };

    console.log('📝 Adding inspiration message...');
    console.log('   JSON:', JSON.stringify(inspirationMessage, null, 2));

    const result1 = await addItemToSupabase(inspirationMessage);
    if (result1.success) {
      console.log(`✅ Successfully added inspiration as item ${result1.itemId}`);
    } else {
      console.error(`❌ Failed to add inspiration: ${result1.error}`);
      return;
    }

    // Test 2: Add an interactive message (with flattening)
    const interactiveMessage = {
      type: 'interactive',
      trigger: {
        keyword: 'TEST ME',
        text: '🌀 Text TEST ME to verify the ADD command works.'
      },
      response: {
        'quotation-marks': 'no',
        prepend: '',
        text: 'The ADD command is working perfectly! 🎉',
        author: 'AF System'
      }
    };

    console.log('\n📝 Adding interactive message...');
    console.log('   JSON:', JSON.stringify(interactiveMessage, null, 2));

    const result2 = await addItemToSupabase(interactiveMessage);
    if (result2.success) {
      console.log(`✅ Successfully added interactive message as item ${result2.itemId}`);
    } else {
      console.error(`❌ Failed to add interactive message: ${result2.error}`);
      return;
    }

    console.log('\n🎉 Both ADD tests passed! The ADD command is working with Supabase.');
    console.log('\n📋 What was added:');
    console.log(`   • Item ${result1.itemId}: Inspiration message`);
    console.log(`   • Item ${result2.itemId}: Interactive message (TEST ME)`);

    console.log('\n💡 You can now test the ADD command via SMS:');
    console.log(`   Send: ADD ${JSON.stringify(inspirationMessage)}`);

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testAddCommand(); 