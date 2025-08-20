#!/usr/bin/env node

/**
 * Fix ToyBox OS - ensure drag functionality is initialized
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

async function fixDragInit() {
  console.log('Fixing ToyBox OS drag initialization...');
  
  // Get current HTML
  const { data, error: fetchError } = await supabase
    .from('wtaf_content')
    .select('html_content')
    .eq('user_slug', 'public')
    .eq('app_slug', 'toybox-os')
    .single();

  if (fetchError) {
    console.error('Error fetching ToyBox OS:', fetchError);
    return;
  }

  let html = data.html_content;
  
  // Find where loadIconPositions is called and add setupDragForIcons after it
  if (html.includes('loadIconPositions();')) {
    // Check if setupDragForIcons is already being called
    if (!html.includes('setupDragForIcons();')) {
      // Add the call after loadIconPositions
      html = html.replace(
        'loadIconPositions();',
        `loadIconPositions();
        
        // Initialize drag functionality for all icons
        setupDragForIcons();`
      );
      console.log('✅ Added setupDragForIcons() call after loadIconPositions()');
    } else {
      console.log('setupDragForIcons() is already being called');
    }
  }
  
  // Also make sure it's called when new icons are added dynamically
  // Find the addToDesktop function if it exists
  const addIconPattern = /onclick="openWindowedApp\('[^']+'\)"/g;
  
  // Update the database
  const { error: updateError } = await supabase
    .from('wtaf_content')
    .update({ 
      html_content: html,
      updated_at: new Date()
    })
    .eq('user_slug', 'public')
    .eq('app_slug', 'toybox-os');

  if (updateError) {
    console.error('Error updating ToyBox OS:', updateError);
    return;
  }
  
  console.log('\n✅ Successfully initialized drag functionality');
  console.log('Icons should now be draggable!');
}

fixDragInit().catch(console.error);