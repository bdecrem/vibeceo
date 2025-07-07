#!/usr/bin/env node

import { supabase } from '../lib/supabase.js';

async function checkItem106() {
  try {
    console.log('🔍 Checking if item 106 exists in Supabase...\n');

    // Direct Supabase query
    const { data, error } = await supabase
      .from('af_daily_message')
      .select('*')
      .eq('item', 106);

    if (error) {
      console.error('❌ Error querying Supabase:', error);
      return;
    }

    if (!data || data.length === 0) {
      console.log('❌ Item 106 NOT FOUND in Supabase');
      return;
    }

    console.log('✅ Item 106 FOUND in Supabase:');
    console.log('   Item:', data[0].item);
    console.log('   Type:', data[0].type);
    console.log('   Text:', `"${data[0].text}"`);
    console.log('   Author:', data[0].author);
    console.log('   Prepend:', data[0].prepend);
    console.log('   Quotation marks:', data[0].quotation_marks);

    // Check the latest few items
    console.log('\n📊 Latest items in Supabase:');
    const { data: latestData, error: latestError } = await supabase
      .from('af_daily_message')
      .select('item, type, text')
      .order('item', { ascending: false })
      .limit(5);

    if (latestError) {
      console.error('Error getting latest items:', latestError);
    } else {
      latestData?.forEach(item => {
        const preview = item.text.length > 40 ? item.text.substring(0, 40) + '...' : item.text;
        console.log(`   ${item.item}: ${item.type} - "${preview}"`);
      });
    }

    console.log('\n🔧 The MORE command should be able to find this item now.');
    console.log('💡 If MORE 106 still fails, there might be a caching issue.');

  } catch (error) {
    console.error('❌ Script failed:', error);
  }
}

checkItem106(); 