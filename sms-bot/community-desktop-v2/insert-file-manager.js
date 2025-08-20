#!/usr/bin/env node

/**
 * Insert semantic file manager app into wtaf_content with System 7 theme
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '../.env.local' });

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Constants
const SYSTEM7_THEME_ID = '2ec89c02-d424-4cf6-81f1-371ca6b9afcf';
const APP_SLUG = 'semantic-file-manager';
const USER_SLUG = 'bart';

async function insertFileManager() {
  console.log('📁 Inserting semantic file manager app...');
  
  try {
    // Read the generated HTML content
    const htmlPath = path.join(__dirname, 'generated-semantic-file-manager.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Check if app already exists
    const { data: existing } = await supabase
      .from('wtaf_content')
      .select('id')
      .eq('user_slug', USER_SLUG)
      .eq('app_slug', APP_SLUG)
      .single();
      
    if (existing) {
      console.log('⚠️ App already exists, updating instead...');
      
      const { data, error } = await supabase
        .from('wtaf_content')
        .update({
          html_content: htmlContent,
          theme_id: SYSTEM7_THEME_ID,
          updated_at: new Date().toISOString()
        })
        .eq('user_slug', USER_SLUG)
        .eq('app_slug', APP_SLUG)
        .select()
        .single();
        
      if (error) {
        console.error('❌ Error updating app:', error);
        return false;
      }
      
      console.log('✅ File manager app updated successfully!');
    } else {
      // Generate a unique UUID for the app
      const appId = crypto.randomUUID();
      
      // Insert the file manager app
      const { data, error } = await supabase
        .from('wtaf_content')
        .insert({
          id: appId,
          user_slug: USER_SLUG,
          app_slug: APP_SLUG,
          theme_id: SYSTEM7_THEME_ID,
          html_content: htmlContent,
          type: 'web',
          original_prompt: 'Build a desktop file manager app with System 7 semantic markup',
          status: 'published',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
        
      if (error) {
        console.error('❌ Error inserting file manager:', error);
        return false;
      }
      
      console.log('✅ File manager app inserted successfully!');
    }
    
    console.log('📋 App details:', {
      slug: `${USER_SLUG}/${APP_SLUG}`,
      theme_id: SYSTEM7_THEME_ID,
      url: `https://webtoys.ai/${USER_SLUG}/${APP_SLUG}`
    });
    
    return true;
    
  } catch (error) {
    console.error('❌ Script error:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting file manager app insertion...');
  
  const result = await insertFileManager();
  
  if (result) {
    console.log('🎉 File manager creation completed successfully!');
    console.log('🌐 View at: https://webtoys.ai/bart/semantic-file-manager');
    console.log('');
    console.log('🎨 This app demonstrates:');
    console.log('  - Semantic markup working with System 7 theme');
    console.log('  - Desktop-style windowing');
    console.log('  - Theme CSS automatically applied');
    console.log('  - Professional retro appearance');
  } else {
    console.log('💥 File manager creation failed');
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);