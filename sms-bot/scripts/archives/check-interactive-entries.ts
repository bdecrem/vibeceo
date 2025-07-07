#!/usr/bin/env node

import { supabase } from '../lib/supabase.js';
import fs from 'fs';
import path from 'path';

async function checkInteractiveEntries() {
  try {
    console.log('🔍 Checking interactive entries specifically...\n');

    // Query interactive entries from Supabase
    const { data: supabaseData, error } = await supabase
      .from('af_daily_message')
      .select('*')
      .eq('type', 'interactive')
      .order('item', { ascending: true });

    if (error) {
      console.error('❌ Error querying Supabase:', error);
      return;
    }

    // Load interactive entries from JSON
    const jsonPath = path.join(process.cwd(), 'data', 'af_daily_messages.json');
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    const jsonInteractive = jsonData.filter((record: any) => record.type === 'interactive');

    console.log(`📊 Supabase interactive entries: ${supabaseData?.length || 0}`);
    console.log(`📄 JSON interactive entries: ${jsonInteractive.length}\n`);

    // Compare structures
    console.log('🔍 Supabase interactive entry structure:');
    if (supabaseData && supabaseData.length > 0) {
      const first = supabaseData[0];
      console.log('   Available fields:', Object.keys(first).join(', '));
      console.log('\n   Sample entry:');
      console.log(JSON.stringify(first, null, 4));
    }

    console.log('\n📄 JSON interactive entry structure:');
    if (jsonInteractive.length > 0) {
      const first = jsonInteractive[0];
      console.log('   Available fields:', Object.keys(first).join(', '));
      console.log('\n   Sample entry:');
      console.log(JSON.stringify(first, null, 4));
    }

    // Show all interactive entries from both sources
    console.log('\n🔍 All Supabase interactive entries:');
    supabaseData?.forEach((record: any, index: number) => {
      console.log(`\n${index + 1}. Item ${record.item}:`);
      if (record.trigger_keyword) {
        console.log(`   Trigger Keyword: ${record.trigger_keyword}`);
      }
      if (record.trigger_text) {
        console.log(`   Trigger Text: ${record.trigger_text}`);
      }
      console.log(`   Text: "${record.text}"`);
      console.log(`   Author: ${record.author || 'null'}`);
    });

    console.log('\n📄 All JSON interactive entries:');
    jsonInteractive.forEach((record: any, index: number) => {
      console.log(`\n${index + 1}. Item ${record.item}:`);
      if (record.trigger) {
        console.log(`   Trigger: ${JSON.stringify(record.trigger)}`);
      }
      if (record.response) {
        console.log(`   Response: ${JSON.stringify(record.response)}`);
      }
      console.log(`   Text: "${record.text || 'none'}"`);
      console.log(`   Author: ${record.author || 'null'}`);
    });

    console.log('\n✅ Interactive entries comparison complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkInteractiveEntries(); 