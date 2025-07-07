#!/usr/bin/env node

import { supabase } from '../lib/supabase.js';
import fs from 'fs';
import path from 'path';

async function checkAfDailyMessages() {
  try {
    console.log('🔍 Checking af_daily_message table in Supabase...\n');

    // Query the Supabase table
    const { data: supabaseData, error } = await supabase
      .from('af_daily_message')
      .select('*')
      .order('item', { ascending: true });

    if (error) {
      console.error('❌ Error querying Supabase:', error);
      return;
    }

    console.log(`📊 Found ${supabaseData?.length || 0} records in Supabase af_daily_message table`);

    // Load the JSON file
    const jsonPath = path.join(process.cwd(), 'data', 'af_daily_messages.json');
    const jsonData = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    console.log(`📄 Found ${jsonData.length} records in JSON file\n`);

    // Show sample from Supabase
    if (supabaseData && supabaseData.length > 0) {
      console.log('🔍 Sample from Supabase (first 3 records):');
             supabaseData.slice(0, 3).forEach((record: any, index: number) => {
        console.log(`\n${index + 1}. Item ${record.item} (${record.type}):`);
        console.log(`   Text: "${record.text?.substring(0, 60)}${record.text?.length > 60 ? '...' : ''}"`);
        console.log(`   Author: ${record.author || 'null'}`);
        console.log(`   Prepend: "${record.prepend || ''}"`);
      });
    }

    // Show sample from JSON
    console.log('\n📄 Sample from JSON (first 3 records):');
    jsonData.slice(0, 3).forEach((record: any, index: number) => {
      console.log(`\n${index + 1}. Item ${record.item} (${record.type}):`);
      console.log(`   Text: "${record.text?.substring(0, 60)}${record.text?.length > 60 ? '...' : ''}"`);
      console.log(`   Author: ${record.author || 'null'}`);
      console.log(`   Prepend: "${record.prepend || ''}"`);
    });

    // Compare counts by type
    const supabaseTypes = supabaseData?.reduce((acc: Record<string, number>, record: any) => {
      acc[record.type] = (acc[record.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>) || {};

    const jsonTypes = jsonData.reduce((acc: Record<string, number>, record: any) => {
      acc[record.type] = (acc[record.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n📈 Comparison by type:');
    const allTypes = new Set([...Object.keys(supabaseTypes), ...Object.keys(jsonTypes)]);
    
    for (const type of allTypes) {
      const supabaseCount = supabaseTypes[type] || 0;
      const jsonCount = jsonTypes[type] || 0;
      console.log(`   ${type}: Supabase=${supabaseCount}, JSON=${jsonCount} ${supabaseCount === jsonCount ? '✅' : '❌'}`);
    }

    // Check for highest item numbers
    const maxSupabaseItem = Math.max(...(supabaseData?.map((r: any) => r.item) || [0]));
    const maxJsonItem = Math.max(...jsonData.map((r: any) => r.item));
    
    console.log(`\n🔢 Max item numbers: Supabase=${maxSupabaseItem}, JSON=${maxJsonItem}`);

    console.log('\n✅ Comparison complete!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

checkAfDailyMessages(); 