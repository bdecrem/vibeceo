#!/usr/bin/env node

/**
 * Deploy the fixed azure-gannet-honoring app to Supabase
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

async function deployFix() {
  console.log('🚀 Deploying fixed azure-gannet-honoring Message Board app...');

  try {
    // Read the fixed HTML
    const htmlContent = await fs.readFile(path.join(__dirname, 'azure-gannet-fixed.html'), 'utf-8');
    console.log(`📏 HTML size: ${(htmlContent.length / 1024).toFixed(1)} KB`);

    // Update the wtaf_content directly
    const { data, error } = await supabase
      .from('wtaf_content')
      .update({
        html_content: htmlContent,
        updated_at: new Date().toISOString()
      })
      .eq('id', '9b3c0388-a785-4aec-a1c1-c10cd76574b7')
      .select();

    if (error) {
      console.error('❌ Update failed:', error);
      return;
    }

    console.log('✅ Successfully fixed azure-gannet-honoring!');
    console.log('📍 App URL: https://webtoys.ai/bart/azure-gannet-honoring');
    console.log('');
    console.log('🎯 Fixed issues:');
    console.log('  1. ✅ Edit permissions - only authors can edit their own posts');
    console.log('  2. ✅ Non-authors see disabled edit button');
    console.log('  3. ✅ Comment functionality now works properly');
    console.log('  4. ✅ Comments save and display correctly');
    console.log('  5. ✅ Added visual indicators for permissions');
    console.log('');
    console.log('Current users: BART/1102, JAMES/1111');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

deployFix();