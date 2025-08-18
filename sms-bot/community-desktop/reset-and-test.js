#!/usr/bin/env node

/**
 * Complete reset and test - makes everything work locally
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '../.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function resetEverything() {
  console.log('🧹 Cleaning up old submissions...');
  
  // Delete all existing submissions
  await supabase
    .from('wtaf_zero_admin_collaborative')
    .delete()
    .eq('app_id', 'community-desktop-apps')
    .eq('action_type', 'desktop_app');
  
  console.log('✅ Cleaned up');
}

async function addFreshSubmissions() {
  console.log('\n📝 Adding fresh test submissions...');
  
  const submissions = [
    {
      appName: 'Countdown Timer',
      appFunction: 'Counts down from 10 and alerts when done',
      submitterName: 'Bart'
    },
    {
      appName: 'Coin Flip',
      appFunction: 'Flips a coin and shows heads or tails',
      submitterName: 'Test User'
    },
    {
      appName: 'Color Changer',
      appFunction: 'Changes the page background to a random color',
      submitterName: 'Anonymous'
    }
  ];
  
  for (const sub of submissions) {
    await supabase
      .from('wtaf_zero_admin_collaborative')
      .insert({
        app_id: 'community-desktop-apps',
        action_type: 'desktop_app',
        content_data: {
          ...sub,
          timestamp: new Date().toISOString(),
          status: 'new'
        }
      });
    console.log(`  ✅ Added: ${sub.appName}`);
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 COMPLETE LOCAL TEST SETUP');
  console.log('='.repeat(60));
  
  await resetEverything();
  await addFreshSubmissions();
  
  console.log('\n' + '='.repeat(60));
  console.log('✅ Setup complete!');
  console.log('\nNOW RUN THESE COMMANDS:');
  console.log('1. node community-desktop/monitor.js');
  console.log('2. open community-desktop/desktop.html');
  console.log('\nYou should see 3 new apps added to the desktop!');
  console.log('='.repeat(60));
}

main().catch(console.error);