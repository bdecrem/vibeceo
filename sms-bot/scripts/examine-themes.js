#!/usr/bin/env node

/**
 * Database Theme Explorer
 * 
 * This script examines the Supabase database to understand theme structure,
 * specifically looking for the wtaf_themes table and toybox-os theme content.
 * 
 * Following project architecture rules:
 * - Uses environment variables for credentials (no hardcoded secrets)
 * - Uses proper database access patterns
 * - Located in scripts/ directory (covered by .gitignore)
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.join(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env.local') });

// Get credentials from environment
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing required environment variables:');
    console.error('SUPABASE_URL:', SUPABASE_URL ? 'Set' : 'Not set');
    console.error('SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? 'Set' : 'Not set');
    console.error('\nPlease ensure your .env file contains these variables.');
    process.exit(1);
}

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function examineThemes() {
    console.log('🔍 Examining WEBTOYS theme system...\n');
    
    try {
        // First, check if wtaf_themes table exists
        console.log('1. Checking for wtaf_themes table...');
        const { data: themeData, error: themeError } = await supabase
            .from('wtaf_themes')
            .select('*')
            .limit(10);
        
        if (themeError) {
            console.log('❌ wtaf_themes table not found or error:', themeError.message);
            console.log('   This might indicate themes are stored elsewhere or not yet implemented.');
        } else {
            console.log('✅ wtaf_themes table found!');
            console.log(`📊 Found ${themeData.length} theme records`);
            
            if (themeData.length > 0) {
                console.log('\n📋 Theme table structure:');
                console.log('Columns:', Object.keys(themeData[0]));
                
                console.log('\n🎨 All available themes:');
                themeData.forEach((theme, index) => {
                    console.log(`\n${index + 1}. Theme: ${theme.name || theme.id}`);
                    console.log(`   ID: ${theme.id}`);
                    console.log(`   Description: ${theme.description}`);
                    console.log(`   Active: ${theme.is_active}`);
                    console.log(`   Default: ${theme.is_default}`);
                    console.log(`   Version: ${theme.version}`);
                    console.log(`   CSS Length: ${theme.css_content ? theme.css_content.length : 0} characters`);
                    
                    // Show CSS content for all themes
                    if (theme.css_content) {
                        console.log(`\n   🔍 ${theme.id.toUpperCase()} CSS CONTENT:`);
                        console.log('   ' + '='.repeat(50));
                        console.log(theme.css_content);
                        console.log('   ' + '='.repeat(50));
                    }
                });
            }
        }
        
        // Check other potential theme storage locations
        console.log('\n2. Checking for themes in wtaf_content...');
        const { data: contentData, error: contentError } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .ilike('html_content', '%toybox%')
            .limit(5);
        
        if (contentError) {
            console.log('❌ Error checking wtaf_content:', contentError.message);
        } else {
            console.log(`📊 Found ${contentData.length} content entries mentioning 'toybox'`);
            if (contentData.length > 0) {
                console.log('   (These might contain embedded theme CSS)');
            }
        }
        
        // Check for any CSS-related content
        console.log('\n3. Searching for CSS theme patterns...');
        const { data: cssData, error: cssError } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .ilike('html_content', '%toybox-os%')
            .limit(3);
        
        if (cssError) {
            console.log('❌ Error searching for CSS patterns:', cssError.message);
        } else {
            console.log(`📊 Found ${cssData.length} entries with 'toybox-os' pattern`);
            
            if (cssData.length > 0) {
                console.log('\n🎨 Sample CSS patterns found:');
                cssData.forEach((item, index) => {
                    const match = item.html_content.match(/toybox-os[^}]*}/i);
                    if (match) {
                        console.log(`\nSample ${index + 1}:`);
                        console.log(match[0].substring(0, 200) + '...');
                    }
                });
            }
        }
        
        // Check information_schema for table structure
        console.log('\n4. Checking database schema for theme-related tables...');
        const { data: schemaData, error: schemaError } = await supabase
            .rpc('exec_sql', { 
                sql: `SELECT table_name 
                      FROM information_schema.tables 
                      WHERE table_schema = 'public' 
                      AND table_name LIKE '%theme%'` 
            });
        
        if (schemaError) {
            console.log('❌ Schema check failed:', schemaError.message);
        } else {
            console.log('📋 Theme-related tables in database:');
            if (schemaData && schemaData.length > 0) {
                schemaData.forEach(table => console.log(`  - ${table.table_name}`));
            } else {
                console.log('   No theme-specific tables found');
            }
        }
        
        // Alternative: Check for templates or styles table
        console.log('\n5. Checking for alternative theme storage...');
        const possibleTables = ['wtaf_templates', 'wtaf_styles', 'wtaf_assets'];
        
        for (const tableName of possibleTables) {
            try {
                const { data, error } = await supabase
                    .from(tableName)
                    .select('*')
                    .limit(1);
                
                if (!error && data) {
                    console.log(`✅ Found table: ${tableName}`);
                    if (data.length > 0) {
                        console.log(`   Columns: ${Object.keys(data[0]).join(', ')}`);
                    }
                }
            } catch (e) {
                // Table doesn't exist, continue
            }
        }
        
        console.log('\n📋 Summary:');
        console.log('- Theme system analysis complete');
        console.log('- If no wtaf_themes table found, themes might be:');
        console.log('  1. Embedded in HTML content');
        console.log('  2. Stored in a different table');
        console.log('  3. Generated dynamically');
        console.log('  4. Not yet implemented as a formal system');
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Run the examination
examineThemes().then(() => {
    console.log('\n✅ Theme examination complete!');
    process.exit(0);
}).catch(error => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
});