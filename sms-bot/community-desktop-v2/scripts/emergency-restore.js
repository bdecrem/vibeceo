#!/usr/bin/env node

/**
 * EMERGENCY RESTORE - Revert all broken changes
 * Restores ToyBox OS, App Studio, and System 7 theme to last known good state
 */

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: '../../.env.local' });
if (!process.env.SUPABASE_URL) {
    dotenv.config({ path: '../../.env' });
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function emergencyRestore() {
    console.log('🚨 EMERGENCY RESTORE INITIATED');
    console.log('=' + '='.repeat(50));
    
    try {
        // 1. Restore ToyBox OS HTML (from before 7 PM)
        console.log('\n1️⃣ Restoring ToyBox OS HTML...');
        const toyboxBackup = fs.readFileSync(
            path.join(__dirname, '../backups/toybox-os_2025-08-20_18-11-14.html'), 
            'utf8'
        );
        
        const { error: toyboxError } = await supabase
            .from('wtaf_content')
            .update({ 
                html_content: toyboxBackup,
                updated_at: new Date()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os');
            
        if (toyboxError) throw toyboxError;
        console.log('✅ ToyBox OS restored to 6:11 PM version (before Task agent changes)');
        
        // 2. Restore App Studio (from before dropdown changes) 
        console.log('\n2️⃣ Restoring App Studio...');
        const appStudioBackup = fs.readFileSync(
            path.join(__dirname, 'backups/app-studio_2025-08-21_01-26-35.html'),
            'utf8'
        );
        
        const { error: appStudioError } = await supabase
            .from('wtaf_content')
            .update({ 
                html_content: appStudioBackup,
                updated_at: new Date()
            })
            .eq('user_slug', 'community')
            .eq('app_slug', 'app-studio');
            
        if (appStudioError) throw appStudioError;
        console.log('✅ App Studio restored to 1:26 AM version (with dropdown but before theme mess)');
        
        // 3. Restore System 7 theme (use the one from 5:15 PM that was working)
        console.log('\n3️⃣ Restoring System 7 theme...');
        
        // Read the theme that was working at 5:15 PM
        const workingTheme = fs.readFileSync(
            path.join(__dirname, 'system7-theme-with-apps_2025-08-20T23-51-52-108Z.css'),
            'utf8'
        );
        
        // Update in database
        const { error: themeError } = await supabase
            .from('wtaf_themes')
            .update({ 
                css_content: workingTheme,
                updated_at: new Date()
            })
            .eq('id', '2ec89c02-d424-4cf6-81f1-371ca6b9afcf');
            
        if (themeError) throw themeError;
        console.log('✅ System 7 theme restored to working version from 5:15 PM');
        
        console.log('\n' + '=' + '='.repeat(50));
        console.log('🎉 EMERGENCY RESTORE COMPLETE!');
        console.log('\nWhat was restored:');
        console.log('• ToyBox OS: 6:11 PM version (horizontal menu bar working)');
        console.log('• App Studio: 1:26 AM version (with dropdown menu)');
        console.log('• System 7 Theme: 5:15 PM version (before "perfect" theme broke everything)');
        console.log('\n🔗 Check results at:');
        console.log('• https://webtoys.ai/public/toybox-os');
        console.log('• https://webtoys.ai/community/app-studio');
        
    } catch (error) {
        console.error('\n❌ RESTORE FAILED:', error.message);
        console.error('Manual intervention may be required');
        process.exit(1);
    }
}

// Run immediately
emergencyRestore();