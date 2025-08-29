#!/usr/bin/env node

/**
 * Fix ToyBox OS ZAD functions to use correct column names
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

async function fixZADColumns() {
  console.log('Fixing ZAD column names in ToyBox OS...');
  
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
  let changesMade = 0;
  
  // Fix in saveIconPositions - change data_type to action_type
  if (html.includes("data_type: 'desktop_state'")) {
    html = html.replace(/data_type: 'desktop_state'/g, "action_type: 'desktop_state'");
    changesMade++;
    console.log('✅ Fixed data_type -> action_type in saveIconPositions');
  }
  
  // Fix in loadIconPositions - change data_type to action_type  
  if (html.includes("data_type: 'desktop_state'")) {
    html = html.replace(/data_type: 'desktop_state'/g, "action_type: 'desktop_state'");
    changesMade++;
    console.log('✅ Fixed data_type -> action_type in loadIconPositions (additional occurrences)');
  }
  
  if (changesMade === 0) {
    console.log('No changes needed - column names are already correct');
    return;
  }
  
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
  
  console.log(`\n✅ Successfully fixed ${changesMade} column references in ToyBox OS`);
  console.log('The desktop should now properly load and save icon positions!');
}

fixZADColumns().catch(console.error);