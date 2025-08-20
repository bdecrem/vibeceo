#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

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

async function addSystem7Theme() {
    try {
        console.log('🎨 Adding System 7 theme to wtaf_themes table...');
        
        // Read the CSS files
        const baseCSS = fs.readFileSync(path.join(process.cwd(), 'themes/base.css'), 'utf8');
        const system7CSS = fs.readFileSync(path.join(process.cwd(), 'themes/system7/system7.css'), 'utf8');
        
        // Combine the CSS
        const combinedCSS = `/* System 7 Theme for ToyBox OS */

/* Base structural styles */
${baseCSS}

/* System 7 specific styles */
${system7CSS}`;
        
        // Insert into wtaf_themes table
        const { data, error } = await supabase
            .from('wtaf_themes')
            .insert({
                theme_name: 'System 7',
                theme_slug: 'system7',
                css_content: combinedCSS,
                is_active: true,
                is_default: false,
                created_by: 'system',
                description: 'Classic Mac OS System 7 theme with menu bar and pixelated desktop'
            })
            .select()
            .single();
        
        if (error) {
            console.error('❌ Error inserting theme:', error.message);
            process.exit(1);
        }
        
        console.log('✅ System 7 theme added successfully!');
        console.log(`   Theme ID: ${data.id}`);
        console.log(`   Theme Name: ${data.theme_name}`);
        console.log(`   Theme Slug: ${data.theme_slug}`);
        
        return data.id;
        
    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
        process.exit(1);
    }
}

// Run the script
addSystem7Theme().then(themeId => {
    console.log(`\n🎉 Theme ready! ID: ${themeId}`);
    console.log('Next step: Update ToyBox OS to use this theme ID');
});