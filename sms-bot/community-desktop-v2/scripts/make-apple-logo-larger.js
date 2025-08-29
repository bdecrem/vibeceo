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

async function makeAppleLogoLarger() {
    try {
        console.log('🍎 Making Apple logo larger...');
        
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
        
        // Update Apple logo CSS to be larger
        css = css.replace(
            /\.theme-system7 \.menu-title\.apple::before \{[\s\S]*?\}/,
            `.theme-system7 .menu-title.apple::before {
  content: "";
  display: inline-block;
  width: 20px;
  height: 20px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23000000'%3E%3Cpath d='M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z'/%3E%3C/svg%3E");
  background-size: contain;
  background-repeat: no-repeat;
  background-position: center;
  vertical-align: middle;
  margin-right: 4px;
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
        
        console.log('✅ Apple logo made larger!');
        console.log('📐 Changed from 16x16px to 20x20px');
        console.log('➕ Added margin-right for better spacing');
        console.log('🔗 Live at: https://webtoys.ai/public/toybox-os');
        
    } catch (error) {
        console.error('❌ Error making Apple logo larger:', error);
        process.exit(1);
    }
}

// Run the script
makeAppleLogoLarger();