#!/usr/bin/env node

/**
 * Test ZAD persistence system
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load .env.local first, fallback to .env
dotenv.config({ path: '../.env.local' });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: '../.env' });
}

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function testZAD() {
  console.log('Testing ZAD persistence...\n');
  
  // Check what's in the ZAD table for desktop layout
  const { data, error } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('*')
    .eq('app_id', 'toybox-desktop-layout')
    .eq('action_type', 'desktop_state');

  if (error) {
    console.error('Error querying ZAD:', error);
    return;
  }

  console.log(`Found ${data.length} desktop_state records:\n`);
  
  data.forEach(record => {
    console.log('Record ID:', record.id);
    console.log('Participant:', record.participant_id);
    console.log('Updated:', record.updated_at);
    console.log('Icon data:', JSON.stringify(record.content_data, null, 2));
    console.log('---');
  });
  
  // Test the load function behavior
  console.log('\nTesting load function behavior:');
  console.log('The ZAD load endpoint should return the most recent record');
  console.log('or all records if multiple exist.');
}

testZAD().catch(console.error);