#!/usr/bin/env node

/**
 * Deploy Text Editor to WebtoysOS v3
 * This script:
 * 1. Deploys the text-editor.html to Supabase
 * 2. Registers it in the desktop config
 * 3. Adds icon to desktop
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

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

async function deployTextEditor() {
    console.log('\n📝 Deploying Text Editor to WebtoysOS v3...\n');
    
    // Step 1: Read the text editor HTML
    const editorPath = path.join(__dirname, '../apps/text-editor.html');
    if (!fs.existsSync(editorPath)) {
        console.error('❌ Text editor HTML not found at:', editorPath);
        process.exit(1);
    }
    
    const htmlContent = fs.readFileSync(editorPath, 'utf8');
    console.log(`✅ Read text editor HTML (${htmlContent.length} bytes)`);
    
    // Step 2: Deploy to Supabase
    const appSlug = 'toybox-text-editor';
    console.log(`\n📤 Deploying to Supabase as: ${appSlug}`);
    
    // Check if it already exists
    const { data: existing, error: checkError } = await supabase
        .from('wtaf_content')
        .select('id')
        .eq('user_slug', 'public')
        .eq('app_slug', appSlug)
        .single();
    
    const timestamp = new Date().toISOString();
    
    if (existing) {
        // Update existing
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({
                html_content: htmlContent,
                updated_at: timestamp,
                original_prompt: 'Text Editor for WebtoysOS v3 - A simple text editor with file management'
            })
            .eq('user_slug', 'public')
            .eq('app_slug', appSlug);
        
        if (updateError) {
            console.error('❌ Error updating text editor:', updateError);
            process.exit(1);
        }
        console.log('✅ Updated existing text editor in database');
    } else {
        // Insert new
        const { error: insertError } = await supabase
            .from('wtaf_content')
            .insert({
                user_slug: 'public',
                app_slug: appSlug,
                html_content: htmlContent,
                created_at: timestamp,
                updated_at: timestamp,
                original_prompt: 'Text Editor for WebtoysOS v3 - A simple text editor with file management'
            });
        
        if (insertError) {
            console.error('❌ Error inserting text editor:', insertError);
            process.exit(1);
        }
        console.log('✅ Inserted new text editor in database');
    }
    
    // Step 3: Register in desktop config
    console.log('\n📋 Registering in desktop config...');
    
    // Get current desktop config
    const { data: configData, error: configError } = await supabase
        .from('wtaf_desktop_config')
        .select('*')
        .eq('desktop_version', 'webtoys-os-v3')
        .is('user_id', null)  // Get the public/default desktop
        .single();
    
    if (configError) {
        console.error('❌ Error fetching desktop config:', configError);
        console.log('Make sure the wtaf_desktop_config table exists and has the desktop entry');
        process.exit(1);
    }
    
    // Parse the app registry
    let appRegistry = configData.app_registry || [];
    
    // Check if text editor is already registered
    const existingIndex = appRegistry.findIndex(app => app.id === 'text-editor');
    
    const textEditorEntry = {
        id: 'text-editor',
        name: 'Text Editor',
        url: `/public/${appSlug}`,
        icon: '📝',
        width: 800,
        height: 600,
        category: 'tools'
    };
    
    if (existingIndex >= 0) {
        // Update existing entry
        appRegistry[existingIndex] = textEditorEntry;
        console.log('✅ Updated existing text editor registration');
    } else {
        // Add new entry
        appRegistry.push(textEditorEntry);
        console.log('✅ Added new text editor registration');
    }
    
    // Update the desktop config
    const { error: updateConfigError } = await supabase
        .from('wtaf_desktop_config')
        .update({
            app_registry: appRegistry,
            updated_at: timestamp
        })
        .eq('desktop_version', 'webtoys-os-v3')
        .is('user_id', null);
    
    if (updateConfigError) {
        console.error('❌ Error updating desktop config:', updateConfigError);
        process.exit(1);
    }
    
    // Step 4: Add icon position if not exists
    let iconPositions = configData.icon_positions || {};
    
    if (!iconPositions['text-editor']) {
        iconPositions['text-editor'] = {
            x: 20,
            y: 180  // Position below other icons
        };
        
        const { error: positionError } = await supabase
            .from('wtaf_desktop_config')
            .update({
                icon_positions: iconPositions
            })
            .eq('desktop_version', 'webtoys-os-v3')
        .is('user_id', null);
        
        if (positionError) {
            console.error('⚠️  Warning: Could not set icon position:', positionError);
        } else {
            console.log('✅ Set default icon position');
        }
    }
    
    console.log('\n✨ Text Editor deployment complete!');
    console.log('📍 Access at: https://webtoys.ai/public/' + appSlug);
    console.log('🖥️  Desktop: https://webtoys.ai/public/toybox-os-v3-test');
    console.log('\nThe text editor should now appear on the desktop with a 📝 icon.');
}

// Run the deployment
deployTextEditor().catch(console.error);