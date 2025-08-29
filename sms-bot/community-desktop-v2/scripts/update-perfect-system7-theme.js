#!/usr/bin/env node

/**
 * Update System 7 theme with perfect museum-quality CSS
 * This replaces the entire theme CSS with the authentic System 7 implementation
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '../../.env.local' });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: '../../.env' });
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const SYSTEM7_THEME_ID = '2ec89c02-d424-4cf6-81f1-371ca6b9afcf';

async function updatePerfectSystem7Theme() {
  console.log('🎨 Updating System 7 theme with perfect museum-quality CSS...');
  
  try {
    // Read the perfect System 7 CSS
    const cssPath = path.join(__dirname, 'perfect-system7-theme.css');
    const perfectCSS = fs.readFileSync(cssPath, 'utf8');
    
    console.log('📄 Perfect CSS loaded:', perfectCSS.length, 'characters');
    
    // Update the theme completely
    const { data: updatedTheme, error: updateError } = await supabase
      .from('wtaf_themes')
      .update({
        css_content: perfectCSS,
        updated_at: new Date().toISOString(),
        description: 'Perfect System 7 theme - Museum quality reproduction of 1991 Mac OS interface'
      })
      .eq('id', SYSTEM7_THEME_ID)
      .select()
      .single();
      
    if (updateError) {
      console.error('❌ Error updating theme:', updateError);
      return false;
    }
    
    console.log('✅ Perfect System 7 theme updated successfully!');
    console.log('📄 New CSS length:', perfectCSS.length, 'characters');
    console.log('🎯 Description updated');
    console.log('🏛️ Museum-quality System 7 styling is now active');
    
    return true;
    
  } catch (error) {
    console.error('❌ Script error:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting Perfect System 7 theme update...');
  console.log('🎨 This will create an authentic 1991 Mac System 7 experience');
  
  const success = await updatePerfectSystem7Theme();
  
  if (success) {
    console.log('🎉 Perfect System 7 theme update completed!');
    console.log('✨ All windowed apps will now look authentically System 7');
    console.log('🖥️ The interface should be nearly indistinguishable from 1991 Mac OS');
  } else {
    console.log('💥 Theme update failed');
    process.exit(1);
  }
}

// Run the script
main().catch(console.error);