#!/usr/bin/env node

/**
 * Insert semantic test app into wtaf_content with System 7 theme
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
const APP_SLUG = 'system7-semantic-test';
const USER_SLUG = 'bart'; // Assuming bart user exists

async function insertTestApp() {
  console.log('🎯 Inserting semantic test app...');
  
  try {
    // Read the test HTML content
    const htmlPath = path.join(__dirname, 'test-semantic-app.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // Generate a unique UUID for the app
    const appId = crypto.randomUUID();
    
    // Insert the test app
    const { data, error } = await supabase
      .from('wtaf_content')
      .insert({
        id: appId,
        user_slug: USER_SLUG,
        app_slug: APP_SLUG,
        theme_id: SYSTEM7_THEME_ID,
        html_content: htmlContent,
        type: 'web',
        original_prompt: 'Test app for System 7 semantic markup',
        status: 'published',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
      
    if (error) {
      console.error('❌ Error inserting test app:', error);
      return false;
    }
    
    console.log('✅ Test app inserted successfully!');
    console.log('📋 App details:', {
      id: data.id,
      slug: `${USER_SLUG}/${APP_SLUG}`,
      theme_id: data.theme_id,
      url: `https://webtoys.ai/${USER_SLUG}/${APP_SLUG}`
    });
    
    return data;
    
  } catch (error) {
    console.error('❌ Script error:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting test app insertion...');
  
  // Check if app already exists
  const { data: existing } = await supabase
    .from('wtaf_content')
    .select('id')
    .eq('user_slug', USER_SLUG)
    .eq('app_slug', APP_SLUG)
    .single();
    
  if (existing) {
    console.log('⚠️ App already exists, updating instead...');
    
    const htmlPath = path.join(__dirname, 'test-semantic-app.html');
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
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
      process.exit(1);
    }
    
    console.log('✅ App updated successfully!');
    console.log('🌐 URL: https://webtoys.ai/bart/system7-semantic-test');
  } else {
    const result = await insertTestApp();
    
    if (result) {
      console.log('🎉 Test app creation completed successfully!');
      console.log('🌐 View at: https://webtoys.ai/bart/system7-semantic-test');
    } else {
      console.log('💥 Test app creation failed');
      process.exit(1);
    }
  }
}

// Run the script
main().catch(console.error);