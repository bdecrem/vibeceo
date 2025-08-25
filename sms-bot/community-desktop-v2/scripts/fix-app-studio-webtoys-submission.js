#!/usr/bin/env node

/**
 * Fix App Studio to properly save appType as 'webtoys' when that option is selected
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

async function fixAppStudio() {
    try {
        console.log('🔧 Fixing App Studio to properly handle Webtoys type...');
        
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
        const backupPath = path.join(__dirname, '..', 'backups', `app-studio_before_type_fix_${Date.now()}.html`);
        await fs.writeFile(backupPath, html);
        console.log(`💾 Backup saved: ${backupPath}`);
        
        // Find the createApp function and fix the type handling
        // The issue is that 'windowed' is being hardcoded
        const oldPattern = `appType: 'windowed',`;
        const newPattern = `appType: type,`;
        
        if (html.includes(oldPattern)) {
            html = html.replace(oldPattern, newPattern);
            console.log('✅ Fixed: appType now uses the selected type');
        } else {
            console.log('🔍 Looking for alternative pattern...');
            
            // Find where appType is set in the submission
            const submitPattern = /appType:\s*['"]windowed['"]/;
            if (submitPattern.test(html)) {
                html = html.replace(submitPattern, 'appType: type');
                console.log('✅ Fixed: appType now uses the selected type variable');
            }
        }
        
        // Also ensure the type variable gets the correct value
        if (!html.includes('const type = document.getElementById(\'appType\').value;')) {
            // Find where we get the type value
            const typePattern = /const type = .*?;/;
            if (typePattern.test(html)) {
                html = html.replace(typePattern, 'const type = document.getElementById(\'appType\').value;');
                console.log('✅ Fixed: type variable gets value from dropdown');
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
        
        console.log('\n✅ App Studio fixed!');
        console.log('🎯 Now when you select "Webtoys", it will save appType as "webtoys"');
        console.log('\n📋 To convert the paint app:');
        console.log('  1. Open App Studio again');
        console.log('  2. Select "Webtoys (Import Existing App)"');
        console.log('  3. Enter: wave-wood-deconstructing');
        console.log('  4. Submit');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

fixAppStudio();