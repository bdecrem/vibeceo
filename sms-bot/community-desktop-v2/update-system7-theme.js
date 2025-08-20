#!/usr/bin/env node

/**
 * Update System 7 theme in database with windowing extension CSS
 * This script appends the app windowing CSS to the existing System 7 theme
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

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

// System 7 theme ID from the plan
const SYSTEM7_THEME_ID = '2ec89c02-d424-4cf6-81f1-371ca6b9afcf';

async function updateSystem7Theme() {
  console.log('🎯 Updating System 7 theme with windowing extension...');
  
  try {
    // Read the windowing extension CSS
    const cssExtensionPath = path.join(__dirname, 'system7-app-windowing-extension.css');
    const extensionCSS = fs.readFileSync(cssExtensionPath, 'utf8');
    
    // First, get the current theme
    const { data: currentTheme, error: fetchError } = await supabase
      .from('wtaf_themes')
      .select('*')
      .eq('id', SYSTEM7_THEME_ID)
      .single();
      
    if (fetchError) {
      console.error('❌ Error fetching current theme:', fetchError);
      return false;
    }
    
    if (!currentTheme) {
      console.error('❌ System 7 theme not found with ID:', SYSTEM7_THEME_ID);
      return false;
    }
    
    console.log('📋 Current theme found:', currentTheme.name);
    console.log('📄 Current CSS length:', currentTheme.css_content?.length || 0, 'chars');
    
    // Append the extension CSS to the existing CSS
    const updatedCSS = (currentTheme.css_content || '') + '\n\n' + extensionCSS;
    
    // Update the theme
    const { data: updatedTheme, error: updateError } = await supabase
      .from('wtaf_themes')
      .update({
        css_content: updatedCSS,
        updated_at: new Date().toISOString()
      })
      .eq('id', SYSTEM7_THEME_ID)
      .select()
      .single();
      
    if (updateError) {
      console.error('❌ Error updating theme:', updateError);
      return false;
    }
    
    console.log('✅ Theme updated successfully!');
    console.log('📄 New CSS length:', updatedCSS.length, 'chars');
    console.log('➕ Added extension length:', extensionCSS.length, 'chars');
    
    return true;
    
  } catch (error) {
    console.error('❌ Script error:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting System 7 theme update...');
  
  const success = await updateSystem7Theme();
  
  if (success) {
    console.log('🎉 System 7 theme update completed successfully!');
    console.log('🎨 Apps using this theme will now support semantic windowing classes');
  } else {
    console.log('💥 Theme update failed');
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);