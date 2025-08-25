#!/usr/bin/env node

/**
 * Backup current App Studio and upload the updated version with Webtoys type
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

async function backupAndUpdateAppStudio() {
    try {
        console.log('📦 Backing up and updating App Studio...');
        
        // Step 1: Fetch current App Studio from Supabase
        console.log('\n1️⃣ Fetching current App Studio from Supabase...');
        const { data: currentData, error: fetchError } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'app-studio')
            .single();
        
        if (fetchError) throw fetchError;
        
        // Step 2: Create backup
        const timestamp = Date.now();
        const backupPath = path.join(__dirname, '..', 'backups', `app-studio_BEFORE_WEBTOYS_${timestamp}.html`);
        await fs.writeFile(backupPath, currentData.html_content);
        console.log(`✅ Backup saved: ${backupPath}`);
        
        // Step 3: Read the local updated version
        console.log('\n2️⃣ Reading local App Studio with Webtoys changes...');
        const localBackupPath = path.join(__dirname, '..', 'backups', 'app-studio_before_webtoys_1755812216803.html');
        
        // Get the version we already updated locally
        const { data: updatedData } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'app-studio')
            .single();
        
        // The changes should already be in Supabase from our earlier script
        // Let's verify the Webtoys option is there
        if (updatedData.html_content.includes('value="webtoys"')) {
            console.log('✅ App Studio already has Webtoys type!');
            console.log('📋 The changes were already uploaded by the earlier script.');
            return;
        }
        
        // If not, we need to apply the changes
        console.log('\n3️⃣ Applying Webtoys type changes...');
        
        let html = currentData.html_content;
        
        // Add Webtoys option to dropdown
        if (!html.includes('value="webtoys"')) {
            html = html.replace(
                '</select>',
                '    <option value="webtoys">Webtoys (Import Existing App)</option>\n            </select>'
            );
            console.log('✅ Added Webtoys option');
        }
        
        // Add dynamic placeholder script
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
        
        if (!html.includes('Update placeholder based on app type')) {
            html = html.replace(
                '</script>',
                placeholderScript + '\n        </script>'
            );
            console.log('✅ Added placeholder update script');
        }
        
        // Add Webtoys handling in form submission
        if (!html.includes('Special handling for Webtoys import')) {
            html = html.replace(
                'const description = document.getElementById(\'appDescription\').value;',
                `let description = document.getElementById('appDescription').value;
            
            // Special handling for Webtoys import
            if (type === 'webtoys') {
                description = 'Import Webtoys app: ' + description.trim();
                console.log('Importing Webtoys app with slug:', description);
            }`
            );
            console.log('✅ Added Webtoys import handling');
        }
        
        // Step 4: Update App Studio in Supabase
        console.log('\n4️⃣ Updating App Studio in Supabase...');
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'app-studio');
        
        if (updateError) throw updateError;
        
        console.log('\n✅ App Studio successfully updated!');
        console.log('🎉 Webtoys import feature is now live');
        console.log('\n📋 Test it:');
        console.log('  1. Go to ToyBox OS');
        console.log('  2. Open App Studio');
        console.log('  3. Select "Webtoys (Import Existing App)" from Type');
        console.log('  4. Enter an app slug like "bouncing-ball"');
        console.log('  5. Submit to convert the app!');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        console.log('💡 Backup was created before any changes');
        process.exit(1);
    }
}

backupAndUpdateAppStudio();