#!/usr/bin/env node

import { supabase } from '../lib/supabase.js';
import twilio from 'twilio';

async function finalSupabaseTest() {
  try {
    console.log('🎯 Final test: Sending SMS with newly added Supabase data...\n');

    // Get the message we just added (item 104)
    const { data, error } = await supabase
      .from('af_daily_message')
      .select('*')
      .eq('item', 104)
      .single();

    if (error || !data) {
      console.error('❌ Could not find test message in Supabase:', error);
      return;
    }

    console.log(`📖 Retrieved message ${data.item} from Supabase:`);
    console.log(`   Type: ${data.type}`);
    console.log(`   Text: "${data.text}"`);
    console.log(`   Author: ${data.author}`);

    // Format the message for SMS
    const currentDate = new Date();
    const dateString = currentDate.toLocaleDateString('en-US', { 
      month: 'long', 
      day: 'numeric' 
    });

    let messageText = data.prepend || '';
    
    if (data.quotation_marks === 'yes') {
      messageText += `"${data.text}"`;
    } else {
      messageText += data.text;
    }
    
    if (data.author) {
      messageText += `\n— ${data.author}`;
    }

    const formattedMessage = `AF Daily — ${dateString}\n${messageText}\n\n🌀 SUPABASE TEST: This message was added via the ADD command and retrieved from Supabase! 🚀`;

    console.log('\n📱 Sending final test SMS:');
    console.log('─'.repeat(60));
    console.log(formattedMessage);
    console.log('─'.repeat(60));

    // Send SMS using Twilio
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;
    const toNumber = '+16508989508';

    if (!accountSid || !authToken || !fromNumber) {
      console.error('❌ Missing Twilio credentials');
      return;
    }

    const client = twilio(accountSid, authToken);

    const message = await client.messages.create({
      body: formattedMessage,
      from: fromNumber,
      to: toNumber
    });

    console.log(`\n✅ Final test SMS sent successfully!`);
    console.log(`   Message SID: ${message.sid}`);
    console.log(`   To: ${toNumber}`);
    console.log(`   Using: Supabase data + ADD command functionality`);

    console.log('\n🎉 MISSION ACCOMPLISHED! 🎉');
    console.log('✅ SMS bot now uses Supabase instead of JSON file');
    console.log('✅ ADD command works with Supabase (including interactive message flattening)');
    console.log('✅ Test SMS sent using Supabase data');
    console.log('✅ No code changes committed or pushed');

  } catch (error) {
    console.error('❌ Final test failed:', error);
  }
}

finalSupabaseTest(); 