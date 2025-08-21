#!/usr/bin/env node

/**
 * Check the current System 7 theme in the database
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '../../.env.local' });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: '../../.env' });
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const SYSTEM7_THEME_ID = '2ec89c02-d424-4cf6-81f1-371ca6b9afcf';

async function checkSystem7Theme() {
  console.log('🔍 Checking System 7 theme in database...');
  
  try {
    const { data: theme, error } = await supabase
      .from('wtaf_themes')
      .select('*')
      .eq('id', SYSTEM7_THEME_ID)
      .single();
      
    if (error) {
      console.error('❌ Error fetching theme:', error);
      return;
    }
    
    if (!theme) {
      console.error('❌ System 7 theme not found with ID:', SYSTEM7_THEME_ID);
      return;
    }
    
    console.log('✅ System 7 Theme found:');
    console.log('  Name:', theme.name);
    console.log('  Description:', theme.description);
    console.log('  CSS Length:', theme.css_content?.length || 0, 'characters');
    console.log('  Created:', theme.created_at);
    console.log('  Updated:', theme.updated_at);
    
    // Check if it contains the window extension CSS
    const hasWindowExtension = theme.css_content?.includes('app-window') || false;
    console.log('  Has window extension:', hasWindowExtension);
    
    // Check if it has the striped title bar
    const hasStripedTitleBar = theme.css_content?.includes('repeating-linear-gradient') || false;
    console.log('  Has striped title bar:', hasStripedTitleBar);
    
    // Show first 500 chars of CSS for debugging
    console.log('\n📄 CSS Preview (first 500 chars):');
    console.log('-'.repeat(50));
    console.log(theme.css_content?.substring(0, 500) || 'No CSS content');
    console.log('-'.repeat(50));
    
  } catch (error) {
    console.error('❌ Script error:', error);
  }
}

checkSystem7Theme().catch(console.error);