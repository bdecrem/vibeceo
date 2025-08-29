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
        
        // Combine the CSS (just the System 7 CSS, as base should be in HTML)
        // Actually, for theme engine, we want ALL styling in the theme
        const combinedCSS = `/* System 7 Theme for ToyBox OS */

${system7CSS}`;
        
        // Check if theme already exists
        const { data: existing } = await supabase
            .from('wtaf_themes')
            .select('id')
            .eq('name', 'System 7')
            .single();
        
        if (existing) {
            console.log('⚠️ Theme already exists, updating...');
            const { data, error } = await supabase
                .from('wtaf_themes')
                .update({
                    css_content: combinedCSS,
                    description: 'Classic Mac OS System 7 theme with menu bar and pixelated desktop',
                    is_active: true,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id)
                .select()
                .single();
            
            if (error) throw error;
            return data;
        }
        
        // Insert new theme
        const { data, error } = await supabase
            .from('wtaf_themes')
            .insert({
                name: 'System 7',
                css_content: combinedCSS,
                description: 'Classic Mac OS System 7 theme with menu bar and pixelated desktop',
                is_active: true,
                is_default: false,
                created_by: 'system',
                version: '1.0.0'
            })
            .select()
            .single();
        
        if (error) {
            console.error('❌ Error inserting theme:', error.message);
            process.exit(1);
        }
        
        console.log('✅ System 7 theme added successfully!');
        console.log(`   Theme ID: ${data.id}`);
        console.log(`   Theme Name: ${data.name}`);
        
        return data;
        
    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
        process.exit(1);
    }
}

// Run the script
addSystem7Theme().then(theme => {
    console.log(`\n🎉 Theme ready! ID: ${theme.id}`);
    console.log('\nNext step: Update ToyBox OS to use this theme ID');
    console.log(`UPDATE wtaf_content SET theme_id = '${theme.id}' WHERE user_slug = 'public' AND app_slug = 'toybox-os';`);
});