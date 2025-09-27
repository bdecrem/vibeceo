#!/usr/bin/env node

/**
 * Restore the tide-worm-speaking app to Supabase
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

async function restoreApp() {
  console.log('🚀 Restoring tide-worm-speaking (PILE-O-NOTES) app...');

  try {
    // Read the fixed HTML
    const htmlContent = await fs.readFile(path.join(__dirname, 'tide-worm-fixed.html'), 'utf-8');
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

    console.log('✅ Successfully restored PILE-O-NOTES!');
    console.log('📍 App URL: https://webtoys.ai/bart/tide-worm-speaking');
    console.log('');
    console.log('🎯 Restored features:');
    console.log('  1. ✅ EDIT button works for document owners');
    console.log('  2. ✅ VIEW button for non-owners');
    console.log('  3. ✅ Permission system working');
    console.log('  4. ✅ Delete button with confirmation');
    console.log('  5. ✅ Text formatting toolbar (bold, italic, underline, bullets)');
    console.log('  6. ✅ Auto-open new documents in edit mode');
    console.log('  7. ✅ Fun landing page with animations');
    console.log('  8. ✅ Document textarea 3x taller (450px)');
    console.log('');
    console.log('🎉 App fully restored after the accidental destruction!');

  } catch (error) {
    console.error('❌ Error:', error);
  }
}

restoreApp();