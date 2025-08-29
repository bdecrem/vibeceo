#!/usr/bin/env node

/**
 * Deploy Community Desktop to Supabase
 * Updates the HTML content in wtaf_content table
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

/**
 * Deploy desktop.html to Supabase
 */
async function deployToSupabase() {
  console.log('\n=== Community Desktop Deployment to Supabase ===');
  console.log('Time:', new Date().toISOString());
  
  try {
    // Read the current desktop.html
    const desktopPath = path.join(__dirname, 'desktop.html');
    const html = await fs.readFile(desktopPath, 'utf-8');
    
    // Count apps in the HTML
    const appCount = (html.match(/class="desktop-icon"/g) || []).length;
    console.log(`📊 Desktop has ${appCount} apps`);
    
    // Update in Supabase
    console.log('🚀 Updating community-desktop in Supabase...');
    
    const { data, error } = await supabase
      .from('wtaf_content')
      .update({ 
        html_content: html,
        updated_at: new Date()
      })
      .eq('app_slug', 'community-desktop')
      .eq('user_slug', 'bart')
      .select();
    
    if (error) {
      console.error('❌ Error updating Supabase:', error);
      return false;
    }
    
    if (!data || data.length === 0) {
      console.error('❌ No record found for bart/community-desktop');
      console.log('💡 Make sure the app exists in wtaf_content table');
      return false;
    }
    
    console.log('✅ Successfully deployed to Supabase!');
    console.log(`🌐 Live at: http://localhost:3000/bart/community-desktop`);
    console.log(`📅 Updated at: ${new Date().toISOString()}`);
    
    return true;
    
  } catch (error) {
    console.error('❌ Deployment error:', error);
    return false;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  deployToSupabase()
    .then(success => {
      if (success) {
        console.log('\n=== Deployment Complete ===\n');
        process.exit(0);
      } else {
        console.log('\n=== Deployment Failed ===\n');
        process.exit(1);
      }
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

export { deployToSupabase };