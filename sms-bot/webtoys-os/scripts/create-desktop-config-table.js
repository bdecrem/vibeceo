#!/usr/bin/env node

/**
 * Create Desktop Config Table in Supabase
 * Run this to set up the wtaf_desktop_config table for WebtoysOS v3
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';
import * as fs from 'fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
let result = dotenv.config({ path: path.join(__dirname, '../../.env.local') });
if (result.error) {
    result = dotenv.config({ path: path.join(__dirname, '../../.env') });
    if (result.error) {
        console.error('Error loading .env files:', result.error.message);
        process.exit(1);
    }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function createTable() {
    console.log('🚀 Creating wtaf_desktop_config table...\n');
    
    // Read SQL file
    const sqlPath = path.join(__dirname, 'create-desktop-config-table.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    // Note: Supabase JS client doesn't support raw SQL execution
    // You'll need to run this SQL directly in Supabase Dashboard
    
    console.log('📋 SQL Script Generated!\n');
    console.log('Please run the following steps:\n');
    console.log('1. Go to your Supabase Dashboard');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy and paste the SQL from:');
    console.log(`   ${sqlPath}`);
    console.log('4. Click "Run"\n');
    
    // We can at least check if the table exists
    const { data, error } = await supabase
        .from('wtaf_desktop_config')
        .select('id')
        .limit(1);
    
    if (error && error.code === '42P01') {
        console.log('❌ Table does not exist yet. Please create it using the SQL script.');
        console.log('\n📝 Quick way to create it:');
        console.log('   1. Copy the SQL file to clipboard:');
        console.log(`      cat ${sqlPath} | pbcopy`);
        console.log('   2. Open Supabase SQL Editor');
        console.log('   3. Paste and run\n');
    } else if (error) {
        console.log('⚠️  Could not check table status:', error.message);
    } else {
        console.log('✅ Table already exists!');
        
        // Try to get the default config
        const { data: config, error: configError } = await supabase
            .from('wtaf_desktop_config')
            .select('*')
            .is('user_id', null)
            .eq('desktop_version', 'webtoys-os-v3')
            .single();
        
        if (config) {
            console.log('\n✅ Default desktop configuration found:');
            console.log(`   Apps: ${config.app_registry?.length || 0} registered`);
            console.log(`   Theme: ${config.settings?.theme || 'default'}`);
            console.log(`   Created: ${config.created_at}`);
        } else if (configError) {
            console.log('\n⚠️  No default configuration found. Run the SQL to create it.');
        }
    }
    
    // Save a simpler version for manual execution
    const simpleSql = `
-- Simplified version for quick setup
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS wtaf_desktop_config (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT,
    desktop_version TEXT DEFAULT 'webtoys-os-v3',
    icon_positions JSONB DEFAULT '{}',
    widget_positions JSONB DEFAULT '{}',
    app_registry JSONB DEFAULT '[]',
    user_folders JSONB DEFAULT '{}',
    settings JSONB DEFAULT '{}',
    window_states JSONB DEFAULT '{}',
    version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, desktop_version)
);

-- Insert default config
INSERT INTO wtaf_desktop_config (user_id, desktop_version, app_registry, settings) 
VALUES (
    NULL,
    'webtoys-os-v3',
    '[
        {"id": "notepad", "name": "Notepad", "icon": "📝", "url": "/public/community-notepad"},
        {"id": "issue-tracker", "name": "Issue Tracker", "icon": "📋", "url": "/public/toybox-issue-tracker"},
        {"id": "chat", "name": "Chat", "icon": "💬", "url": "/public/toybox-chat"}
    ]'::jsonb,
    '{"background": "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", "theme": "modern"}'::jsonb
) ON CONFLICT DO NOTHING;
    `;
    
    const quickSetupPath = path.join(__dirname, 'quick-setup-desktop-config.sql');
    fs.writeFileSync(quickSetupPath, simpleSql);
    console.log(`\n💡 Quick setup SQL saved to: ${quickSetupPath}`);
}

// Helper function to test the API integration
async function testDesktopConfigAPI() {
    console.log('\n🧪 Testing Desktop Config API...\n');
    
    // Test loading config
    const { data: config, error } = await supabase
        .from('wtaf_desktop_config')
        .select('*')
        .is('user_id', null)
        .eq('desktop_version', 'webtoys-os-v3')
        .single();
    
    if (error) {
        console.log('❌ API Test Failed:', error.message);
        return false;
    }
    
    if (config) {
        console.log('✅ Successfully loaded desktop config via API');
        console.log('   Config ID:', config.id);
        console.log('   Apps registered:', config.app_registry?.length || 0);
        return true;
    }
    
    return false;
}

// Example: Save icon position
async function saveIconPosition(userId, iconId, position) {
    // First, get or create user config
    const { data: existing } = await supabase
        .from('wtaf_desktop_config')
        .select('*')
        .eq('user_id', userId || null)
        .eq('desktop_version', 'webtoys-os-v3')
        .single();
    
    if (existing) {
        // Update existing config
        const newPositions = {
            ...existing.icon_positions,
            [iconId]: position
        };
        
        const { error } = await supabase
            .from('wtaf_desktop_config')
            .update({ 
                icon_positions: newPositions,
                updated_at: new Date().toISOString()
            })
            .eq('id', existing.id);
        
        if (error) {
            console.error('Failed to save icon position:', error);
            return false;
        }
        return true;
    } else {
        // Create new config
        const { error } = await supabase
            .from('wtaf_desktop_config')
            .insert({
                user_id: userId,
                desktop_version: 'webtoys-os-v3',
                icon_positions: { [iconId]: position }
            });
        
        if (error) {
            console.error('Failed to create config:', error);
            return false;
        }
        return true;
    }
}

// Main execution
async function main() {
    await createTable();
    
    // Test if we can use the API
    const apiWorks = await testDesktopConfigAPI();
    
    if (apiWorks) {
        console.log('\n🎉 Desktop Config system is ready!');
        console.log('\nExample usage in desktop HTML:');
        console.log(`
// Load desktop config
const { data: config } = await supabase
    .from('wtaf_desktop_config')
    .select('*')
    .eq('user_id', currentUser?.handle || null)
    .eq('desktop_version', 'webtoys-os-v3')
    .single();

// Save icon position
await supabase
    .from('wtaf_desktop_config')
    .upsert({
        user_id: currentUser?.handle,
        desktop_version: 'webtoys-os-v3',
        icon_positions: { notepad: { gridColumn: 2, gridRow: 1 } }
    });
        `);
    } else {
        console.log('\n⚠️  Please create the table using the SQL script first.');
    }
}

// Export for use in other scripts
export { saveIconPosition };

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main().catch(console.error);
}