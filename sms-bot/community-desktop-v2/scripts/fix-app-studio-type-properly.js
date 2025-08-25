#!/usr/bin/env node

/**
 * Properly fix App Studio to save the correct appType value
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

async function fixAppStudioType() {
    try {
        console.log('🔧 Fixing App Studio type handling...');
        
        // Fetch current App Studio
        const { data: appStudioData, error: fetchError } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'app-studio')
            .single();
        
        if (fetchError) throw fetchError;
        
        let html = appStudioData.html_content;
        
        // Backup
        const backupPath = path.join(__dirname, '..', 'backups', `app-studio_type_fix2_${Date.now()}.html`);
        await fs.writeFile(backupPath, html);
        console.log(`💾 Backup saved: ${backupPath}`);
        
        // Find the createApp function
        console.log('🔍 Analyzing current code...');
        
        // Look for where the submission object is created
        const submissionPattern = /const submission = \{[\s\S]*?\};/;
        const submissionMatch = html.match(submissionPattern);
        
        if (submissionMatch) {
            const currentSubmission = submissionMatch[0];
            console.log('Found submission object');
            
            // Check if appType is hardcoded
            if (currentSubmission.includes("appType: 'windowed'")) {
                // Replace with dynamic type
                const fixedSubmission = currentSubmission.replace(
                    "appType: 'windowed'",
                    "appType: type || 'windowed'"
                );
                html = html.replace(currentSubmission, fixedSubmission);
                console.log('✅ Fixed: appType now uses selected type');
            }
        }
        
        // Make sure the type variable is properly captured
        const createAppFunction = html.match(/async function createApp\(\) \{[\s\S]*?\n        \}/);
        if (createAppFunction) {
            const func = createAppFunction[0];
            
            // Check if type is being read from dropdown
            if (!func.includes("document.getElementById('appType').value")) {
                console.log('🔍 Adding type variable...');
                // Add it after getting the name
                html = html.replace(
                    "const name = document.getElementById('appName').value;",
                    `const name = document.getElementById('appName').value;
            const type = document.getElementById('appType').value;`
                );
                console.log('✅ Added: type variable from dropdown');
            }
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
        
        console.log('\n✅ App Studio type handling fixed!');
        console.log('\n📋 Now try again:');
        console.log('  1. Reload ToyBox OS');
        console.log('  2. Open App Studio');
        console.log('  3. Select "Webtoys (Import Existing App)"');
        console.log('  4. Name: Paint (or whatever)');
        console.log('  5. Description: wave-wood-deconstructing');
        console.log('  6. Submit');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

fixAppStudioType();