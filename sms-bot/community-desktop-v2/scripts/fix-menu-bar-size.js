#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
const result = dotenv.config({ path: '../.env.local' });
if (result.error) {
    console.error('Error loading .env.local:', result.error.message);
    process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixMenuBarSize() {
    try {
        console.log('🔧 Fixing menu bar size to match System 7 reference...');
        
        // Get current theme CSS
        const { data: theme, error: fetchError } = await supabase
            .from('wtaf_themes')
            .select('css_content')
            .eq('id', '2ec89c02-d424-4cf6-81f1-371ca6b9afcf')
            .single();
            
        if (fetchError) {
            throw new Error('Failed to fetch theme: ' + fetchError.message);
        }
        
        let css = theme.css_content;
        
        // Update menu bar styling to be MUCH LARGER like the reference
        css = css.replace(
            /\/\* Menu bar \*\/[\s\S]*?\.theme-system7 \.menu-bar \{[^}]*\}/,
            `/* Menu bar */
.theme-system7 .menu-bar {
  background: var(--sys7-menu-bg);
  border-bottom: 1px solid var(--sys7-border);
  color: var(--sys7-text);
  font-size: 16px;
  height: 30px;
  line-height: 30px;
  padding: 0 12px;
}`
        );
        
        // Update menu title styling for larger size
        css = css.replace(
            /\.theme-system7 \.menu-title \{[^}]*\}/,
            `.theme-system7 .menu-title {
  font-weight: normal;
  border-left: none;
  border-right: none;
  padding: 0 14px;
  font-size: 16px;
}`
        );
        
        // Update apple menu styling
        css = css.replace(
            /\.theme-system7 \.menu-title\.apple \{[^}]*\}/,
            `.theme-system7 .menu-title.apple {
  font-size: 18px;
  font-weight: bold;
  padding: 0 16px;
}`
        );
        
        // Update clock styling
        css = css.replace(
            /\.theme-system7 #menu-clock \{[^}]*\}/,
            `.theme-system7 #menu-clock {
  font-weight: normal;
  cursor: default;
  font-size: 16px;
  padding: 0 12px;
}`
        );
        
        // Update the theme CSS in database
        const { error: updateError } = await supabase
            .from('wtaf_themes')
            .update({ css_content: css })
            .eq('id', '2ec89c02-d424-4cf6-81f1-371ca6b9afcf');
            
        if (updateError) {
            throw new Error('Failed to update theme: ' + updateError.message);
        }
        
        console.log('✅ Menu bar size updated to match System 7 reference!');
        console.log('📐 Changes made:');
        console.log('   - Menu bar height: 24px → 30px');
        console.log('   - Menu font size: 14px → 16px');
        console.log('   - Apple menu: 16px → 18px');
        console.log('   - Increased padding for better spacing');
        console.log('🔗 Live at: https://webtoys.ai/public/toybox-os');
        
    } catch (error) {
        console.error('❌ Error fixing menu bar size:', error);
        process.exit(1);
    }
}

// Run the script
fixMenuBarSize();