#!/usr/bin/env node

/**
 * Deploy the azure-gannet Message Board to tide-worm-speaking
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config({ path: '../.env.local' });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: '../.env' });
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Initialize Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function deployMessageBoard() {
  console.log('🚀 Deploying Message Board to tide-worm-speaking...');

  try {
    // Read the message board HTML with tide-worm's APP_ID
    const htmlContent = await fs.readFile(path.join(__dirname, 'tide-worm-message-board.html'), 'utf-8');
    console.log(`📏 HTML size: ${(htmlContent.length / 1024).toFixed(1)} KB`);

    // Update the wtaf_content directly
    const { data, error } = await supabase
      .from('wtaf_content')
      .update({
        html_content: htmlContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', '016d77c4-fd74-462f-bc4b-12b709e6abd2')
      .select();

    if (error) {
      console.error('❌ Update failed:', error);
      return;
    }

    console.log('✅ Successfully deployed Message Board to tide-worm-speaking!');
    console.log('📍 App URL: https://webtoys.ai/bart/tide-worm-speaking');
    console.log('');
    console.log('🎯 Migrated features from azure-gannet-honoring:');
    console.log('  1. ✅ Message Board with posts and comments');
    console.log('  2. ✅ Custom username/passcode authentication');
    console.log('  3. ✅ Edit permissions - only authors can edit posts');
    console.log('  4. ✅ Comment functionality for all logged-in users');
    console.log('  5. ✅ Post titles and delete functionality');
    console.log('  6. ✅ Line break formatting preserved');
    console.log('');
    console.log('Current users: BART/1102, JAMES/1111, ACXTRILLA/2304, ROXI/0517, CHAOS_AGENT/2167');
    console.log('');
    console.log('🔄 Migration complete! The destroyed tide-worm-speaking has been replaced with the working Message Board app.');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

deployMessageBoard();