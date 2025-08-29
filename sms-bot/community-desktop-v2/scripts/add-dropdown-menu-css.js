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

async function addDropdownMenuCSS() {
    try {
        console.log('📋 Adding dropdown menu CSS styling...');
        
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
        
        // Add dropdown menu CSS at the end
        css += `

/* Dropdown Menu Styling */
.theme-system7 .menu-title {
  position: relative;
  cursor: pointer;
}

.theme-system7 .dropdown-menu {
  position: absolute;
  top: 100%;
  left: 0;
  background: var(--sys7-menu-bg);
  border: 1px solid var(--sys7-border);
  box-shadow: 2px 2px 4px rgba(0,0,0,0.3);
  min-width: 120px;
  z-index: 10000;
}

.theme-system7 .menu-item {
  padding: 6px 12px;
  font-size: 14px;
  cursor: pointer;
  border-bottom: 1px solid #E0E0E0;
}

.theme-system7 .menu-item:last-child {
  border-bottom: none;
}

.theme-system7 .menu-item:hover {
  background: var(--sys7-border);
  color: var(--sys7-menu-bg);
}
`;
        
        // Update the theme CSS in database
        const { error: updateError } = await supabase
            .from('wtaf_themes')
            .update({ css_content: css })
            .eq('id', '2ec89c02-d424-4cf6-81f1-371ca6b9afcf');
            
        if (updateError) {
            throw new Error('Failed to update theme: ' + updateError.message);
        }
        
        console.log('✅ Dropdown menu CSS added!');
        console.log('🎨 Added System 7 style dropdown with hover effects');
        console.log('🔗 Live at: https://webtoys.ai/public/toybox-os');
        
    } catch (error) {
        console.error('❌ Error adding dropdown menu CSS:', error);
        process.exit(1);
    }
}

// Run the script
addDropdownMenuCSS();