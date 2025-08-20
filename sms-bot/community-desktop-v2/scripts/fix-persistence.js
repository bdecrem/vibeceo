#!/usr/bin/env node

/**
 * Fix ToyBox OS persistence by adding loadIconPositions() call
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

async function fixPersistence() {
  console.log('Fixing ToyBox OS persistence...');
  
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
  
  // Check if loadIconPositions is already being called
  if (html.includes('loadIconPositions();')) {
    console.log('loadIconPositions() call already exists');
    return;
  }
  
  // Add loadIconPositions() call at the end of the script
  // Find the last </script> tag
  const lastScriptIndex = html.lastIndexOf('</script>');
  if (lastScriptIndex === -1) {
    console.error('No script tag found');
    return;
  }
  
  // Insert the call just before the closing script tag
  html = html.slice(0, lastScriptIndex) + 
    '\n        // Load saved icon positions on startup\n' +
    '        loadIconPositions();\n' +
    html.slice(lastScriptIndex);
  
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
  
  console.log('✅ Successfully added loadIconPositions() call to ToyBox OS');
  console.log('The desktop should now persist icon positions across refreshes');
}

fixPersistence().catch(console.error);