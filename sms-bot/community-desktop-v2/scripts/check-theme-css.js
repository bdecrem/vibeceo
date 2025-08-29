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

async function checkThemeCSS() {
    try {
        console.log('🔍 Checking current theme CSS in Supabase...');
        
        // Get current theme CSS
        const { data: theme, error: fetchError } = await supabase
            .from('wtaf_themes')
            .select('css_content')
            .eq('id', '2ec89c02-d424-4cf6-81f1-371ca6b9afcf')
            .single();
            
        if (fetchError) {
            throw new Error('Failed to fetch theme: ' + fetchError.message);
        }
        
        console.log('📄 Current theme CSS contains:');
        
        // Look for Apple logo related CSS
        const appleCSSMatch = theme.css_content.match(/\.theme-system7 \.menu-title\.apple[\s\S]*?(?=\.theme-system7|$)/);
        
        if (appleCSSMatch) {
            console.log('🍎 Apple logo CSS found:');
            console.log('---');
            console.log(appleCSSMatch[0]);
            console.log('---');
        } else {
            console.log('❌ No Apple logo CSS found in theme');
        }
        
        // Check menu bar height
        const menuBarMatch = theme.css_content.match(/\.theme-system7 \.menu-bar \{[^}]*\}/);
        if (menuBarMatch) {
            console.log('📊 Menu bar CSS:');
            console.log(menuBarMatch[0]);
        }
        
    } catch (error) {
        console.error('❌ Error checking theme CSS:', error);
        process.exit(1);
    }
}

// Run the script
checkThemeCSS();