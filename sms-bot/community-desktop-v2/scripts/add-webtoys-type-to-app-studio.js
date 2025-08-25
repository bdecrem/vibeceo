#!/usr/bin/env node

/**
 * Add 'Webtoys' type to App Studio for converting existing Webtoys apps
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });
if (!process.env.SUPABASE_URL) {
    dotenv.config({ path: path.join(__dirname, '../../.env') });
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function addWebtoysType() {
    try {
        console.log('🎨 Adding Webtoys type to App Studio...');
        
        // Fetch current App Studio
        const { data: appStudioData, error: fetchError } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'app-studio')
            .single();
        
        if (fetchError) throw fetchError;
        
        let html = appStudioData.html_content;
        
        // Backup first
        const backupPath = path.join(__dirname, '..', 'backups', `app-studio_before_webtoys_${Date.now()}.html`);
        await fs.writeFile(backupPath, html);
        console.log(`💾 Backup saved: ${backupPath}`);
        
        // Find the app type dropdown and add Webtoys option
        const dropdownRegex = /<select id="appType"[^>]*>([\s\S]*?)<\/select>/;
        const dropdownMatch = html.match(dropdownRegex);
        
        if (dropdownMatch) {
            const currentOptions = dropdownMatch[1];
            
            // Check if Webtoys already exists
            if (!currentOptions.includes('value="webtoys"')) {
                // Add Webtoys option after the existing options
                const newOptions = currentOptions.replace(
                    '</option>\n            </select>',
                    '</option>\n                <option value="webtoys">Webtoys (Import Existing App)</option>\n            </select>'
                );
                
                // Replace the entire select element
                const newDropdown = `<select id="appType" style="width: 100%; padding: 8px; font-size: 14px; margin-bottom: 16px;">${newOptions}</select>`;
                html = html.replace(dropdownRegex, newDropdown);
                
                console.log('✅ Added Webtoys option to dropdown');
            } else {
                console.log('ℹ️ Webtoys option already exists');
            }
        }
        
        // Update the description placeholder to be dynamic based on type
        const placeholderScript = `
        // Update placeholder based on app type
        document.getElementById('appType').addEventListener('change', function() {
            const descField = document.getElementById('appDescription');
            if (this.value === 'webtoys') {
                descField.placeholder = 'Enter the Webtoys app slug (e.g., "bouncing-ball" or "todo-list")';
                descField.value = ''; // Clear any existing text
            } else {
                descField.placeholder = 'Describe your app idea...';
            }
        });`;
        
        // Add this script if it doesn't exist
        if (!html.includes('Update placeholder based on app type')) {
            html = html.replace(
                '</script>',
                placeholderScript + '\n        </script>'
            );
            console.log('✅ Added dynamic placeholder script');
        }
        
        // Update the submit handler to handle Webtoys type specially
        const submitHandlerUpdate = `
            // Special handling for Webtoys import
            if (type === 'webtoys') {
                description = 'Import Webtoys app: ' + description.trim();
                console.log('Importing Webtoys app with slug:', description);
            }`;
        
        // Find and update the createApp function
        if (!html.includes('Special handling for Webtoys import')) {
            html = html.replace(
                'const description = document.getElementById(\'appDescription\').value;',
                `const description = document.getElementById('appDescription').value;
            ${submitHandlerUpdate}`
            );
            console.log('✅ Added Webtoys import handling');
        }
        
        // Update App Studio
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'app-studio');
        
        if (updateError) throw updateError;
        
        console.log('\n✅ App Studio updated with Webtoys type!');
        console.log('📋 How it works:');
        console.log('  1. Select "Webtoys" from the Type dropdown');
        console.log('  2. Enter just the app slug in Description');
        console.log('  3. CLI agent will fetch and convert the app');
        console.log('\n🎯 Next: Update process-windowed-apps.js to handle conversion');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

addWebtoysType();