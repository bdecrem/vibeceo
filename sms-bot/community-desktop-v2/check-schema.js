#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '../.env.local' });

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSchema() {
  console.log('📋 Checking wtaf_content table schema...');
  
  // Get a sample record to see the structure
  const { data, error } = await supabase
    .from('wtaf_content')
    .select('*')
    .limit(1);
    
  if (error) {
    console.error('❌ Error:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('📄 Sample record columns:');
    Object.keys(data[0]).forEach(key => {
      console.log(`  - ${key}: ${typeof data[0][key]}`);
    });
  } else {
    console.log('📄 No records found in table');
  }
}

checkSchema().catch(console.error);