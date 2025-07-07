#!/usr/bin/env node

import { supabase } from '../lib/supabase.js';
import twilio from 'twilio';

async function testSupabaseSms() {
  try {
    console.log('🧪 Testing Supabase SMS integration...\n');

    // 1. Test Supabase connection and get a random message
    console.log('📊 Querying Supabase for messages...');
    const { data: messages, error } = await supabase
      .from('af_daily_message')
      .select('*')
      .eq('type', 'inspiration')
      .limit(5);

    if (error) {
      console.error('❌ Supabase query failed:', error);
      return;
    }

    console.log(`✅ Found ${messages?.length || 0} inspiration messages in Supabase`);

    // Get a random message
    if (!messages || messages.length === 0) {
      console.error('❌ No messages found in Supabase');
      return;
    }

    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    console.log(`🎯 Selected message ${randomMessage.item}: "${randomMessage.text.substring(0, 50)}..."`);

    // 2. Format the message
    const currentDate = new Date();
    const dateString = currentDate.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric' 
    });

    let messageText = randomMessage.prepend || '';
    
    if (randomMessage.quotation_marks === 'yes') {
      messageText += `"${randomMessage.text}"`;
    } else {
      messageText += randomMessage.text;
    }
    
    if (randomMessage.author) {
      messageText += `\n— ${randomMessage.author}`;
    }

    const formattedMessage = `AF Daily — ${dateString}\n${messageText}\n\n🌀 Text MORE for one extra line of chaos.`;

    console.log('\n📱 Formatted SMS message:');
    console.log('─'.repeat(50));
    console.log(formattedMessage);
    console.log('─'.repeat(50));

    // 3. Send SMS using Twilio
    console.log('\n📤 Sending SMS via Twilio...');
    
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    const toNumber = '+16508989508';

    if (!accountSid || !authToken || !fromNumber) {
      console.error('❌ Missing Twilio credentials in environment variables');
      console.log('   TWILIO_ACCOUNT_SID:', accountSid ? 'Set' : 'Missing');
      console.log('   TWILIO_AUTH_TOKEN:', authToken ? 'Set' : 'Missing');
      console.log('   TWILIO_PHONE_NUMBER:', fromNumber ? 'Set' : 'Missing');
      return;
    }

    const client = twilio(accountSid, authToken);

    const message = await client.messages.create({
      body: formattedMessage,
      from: fromNumber,
      to: toNumber
    });

    console.log(`✅ SMS sent successfully!`);
    console.log(`   Message SID: ${message.sid}`);
    console.log(`   To: ${toNumber}`);
    console.log(`   Status: ${message.status}`);

    // 4. Test adding a new message to Supabase
    console.log('\n➕ Testing ADD functionality to Supabase...');
    
    const testMessage = {
      type: 'inspiration',
      'quotation-marks': 'yes',
      prepend: '💬 ',
      text: 'This is a test message from the Supabase integration.',
      author: 'Test Bot'
    };

    // Get next item number
    const { data: maxData, error: maxError } = await supabase
      .from('af_daily_message')
      .select('item')
      .order('item', { ascending: false })
      .limit(1);

    if (maxError) {
      console.error('❌ Error getting max item number:', maxError);
      return;
    }

    const nextItemNumber = maxData && maxData.length > 0 ? maxData[0].item + 1 : 1;
    console.log(`🔢 Next item number: ${nextItemNumber}`);

    // Insert test message
    const { error: insertError } = await supabase
      .from('af_daily_message')
      .insert([{
        item: nextItemNumber,
        type: testMessage.type,
        quotation_marks: testMessage['quotation-marks'],
        prepend: testMessage.prepend,
        text: testMessage.text,
        author: testMessage.author,
        intro: null,
        outro: null,
        trigger_keyword: null,
        trigger_text: null
      }]);

    if (insertError) {
      console.error('❌ Error inserting test message:', insertError);
      return;
    }

    console.log(`✅ Test message added as item ${nextItemNumber}`);

    // Clean up - delete the test message
    const { error: deleteError } = await supabase
      .from('af_daily_message')
      .delete()
      .eq('item', nextItemNumber);

    if (deleteError) {
      console.warn('⚠️  Could not clean up test message:', deleteError);
    } else {
      console.log('🧹 Test message cleaned up');
    }

    console.log('\n🎉 All tests passed! Supabase SMS integration is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error);
  }
}

testSupabaseSms(); 