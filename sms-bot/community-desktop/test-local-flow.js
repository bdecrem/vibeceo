#!/usr/bin/env node

/**
 * Test the Community Desktop flow locally
 * Adds test submissions directly to the database
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env.local' });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: '../.env' });
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function addTestSubmission(appName, appFunction, submitterName = 'Test User') {
  console.log(`\n📝 Adding test submission: ${appName}`);
  
  const submission = {
    appName,
    appFunction,
    submitterName,
    timestamp: new Date().toISOString(),
    status: 'new'
  };
  
  const { data, error } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .insert({
      app_id: 'community-desktop-apps',
      action_type: 'desktop_app',
      content_data: submission
    });
  
  if (error) {
    console.error('❌ Error:', error);
    return false;
  }
  
  console.log('✅ Submission added to database');
  return true;
}

async function main() {
  console.log('='.repeat(60));
  console.log('🧪 COMMUNITY DESKTOP - LOCAL TEST');
  console.log('='.repeat(60));
  
  // Add some test submissions
  await addTestSubmission(
    'Timer',
    'Counts down from 10 seconds and shows an alert',
    'You'
  );
  
  await addTestSubmission(
    'Magic 8 Ball',
    'Gives mysterious answers to yes/no questions',
    'Test Bot'
  );
  
  await addTestSubmission(
    'Compliment Bot',
    'Says something nice to make you smile',
    'Happy User'
  );
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Test submissions added!');
  console.log('\nNow run: node monitor.js');
  console.log('Then check: open desktop.html');
  console.log('='.repeat(60));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}