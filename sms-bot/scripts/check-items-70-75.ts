#!/usr/bin/env node

import { supabase } from '../lib/supabase.js';

async function checkItems() {
  try {
    const { data, error } = await supabase
      .from('af_daily_message')
      .select('item, type, text, author')
      .gte('item', 70)
      .lte('item', 75)
      .order('item');

    if (error) {
      console.error('Error:', error);
      return;
    }

    console.log('Messages 70-75 in Supabase:');
    data?.forEach(msg => {
      const preview = msg.text.length > 50 ? msg.text.substring(0, 50) + '...' : msg.text;
      console.log(`📝 ${msg.item}: ${msg.type} - "${preview}" (${msg.author || 'no author'})`);
    });

    console.log('\n💡 You can test these commands:');
    console.log('📱 MORE 72 - Preview message 72');
    console.log('📱 SKIP 72 - Force message 72 for next daily broadcast');

  } catch (error) {
    console.error('Failed:', error);
  }
}

checkItems(); 