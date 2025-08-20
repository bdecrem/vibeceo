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

async function fixAppleLogoDisplay() {
    try {
        console.log('🍎 Fixing Apple logo display...');
        
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
        
        // Fix Apple logo styling with a visible character
        css = css.replace(
            /\.theme-system7 \.menu-title\.apple \{[\s\S]*?\}/,
            `.theme-system7 .menu-title.apple {
  font-size: 18px;
  font-weight: bold;
  padding: 0 16px;
}

.theme-system7 .menu-title.apple::before {
  content: "⌘";
  font-family: "Apple Symbols", "Menlo", "Monaco", monospace;
  font-size: 16px;
  color: #000000;
  font-weight: bold;
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
        
        console.log('✅ Apple logo display fixed!');
        console.log('⌘ Using Command symbol as fallback - classic Mac symbol');
        console.log('🔗 Live at: https://webtoys.ai/public/toybox-os');
        
    } catch (error) {
        console.error('❌ Error fixing Apple logo display:', error);
        process.exit(1);
    }
}

// Run the script
fixAppleLogoDisplay();