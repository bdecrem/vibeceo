#!/usr/bin/env node

/**
 * EMERGENCY ROLLBACK - Restore Fixit Board to last working version
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

async function rollback() {
    try {
        console.log('🚨 EMERGENCY ROLLBACK - Restoring Fixit Board...');
        
        // Look for the last good backup before the Task agent broke it
        const backupFiles = await fs.readdir(path.join(__dirname, '..', 'backups'));
        
        // Find backups from before the Task agent mess
        const goodBackups = [
            'fixit-board_before_case_fix_1756159808515.html',
            'fixit-board_before_bart_powers_1756159123325.html',
            'fixit-board_before_auth_1756158671853.html',
            'issue-tracker_before_simplify_1756157910289.html',
            'issue-tracker_before_ui_update_1756157609045.html',
            'issue-tracker_before_number_enhance_1756157382879.html'
        ];
        
        // Try to find a working backup
        let restoredHtml = null;
        let backupUsed = null;
        
        for (const backupFile of goodBackups) {
            try {
                const backupPath = path.join(__dirname, '..', 'backups', backupFile);
                const html = await fs.readFile(backupPath, 'utf-8');
                
                // Check if this backup looks valid
                if (html.includes('ToyBox OS Fixit Board') || html.includes('ToyBox OS Direct Updates')) {
                    console.log(`✅ Found valid backup: ${backupFile}`);
                    restoredHtml = html;
                    backupUsed = backupFile;
                    break;
                }
            } catch (e) {
                // Try next backup
                continue;
            }
        }
        
        if (!restoredHtml) {
            // If no specific backup found, try the most recent case fix one
            try {
                const caseFix = path.join(__dirname, '..', 'backups', 'fixit-board_before_case_fix_1756159808515.html');
                restoredHtml = await fs.readFile(caseFix, 'utf-8');
                backupUsed = 'fixit-board_before_case_fix_1756159808515.html';
                console.log('✅ Using case-fix backup as fallback');
            } catch (e) {
                console.error('❌ Could not find any valid backup!');
                return;
            }
        }
        
        // Save current broken version as backup just in case
        const { data: currentData } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        if (currentData) {
            const brokenBackup = path.join(__dirname, '..', 'backups', `fixit-board_BROKEN_${Date.now()}.html`);
            await fs.writeFile(brokenBackup, currentData.html_content);
            console.log(`💾 Saved broken version to ${brokenBackup}`);
        }
        
        // Restore to Supabase
        const { error } = await supabase
            .from('wtaf_content')
            .update({
                html_content: restoredHtml,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker');
        
        if (error) {
            console.error('❌ Failed to restore:', error);
            return;
        }
        
        console.log('✅ ROLLBACK SUCCESSFUL!');
        console.log(`\n📋 Restored from: ${backupUsed}`);
        console.log('\n🔄 The Fixit Board has been restored to the last working version.');
        console.log('   It should now work properly again.');
        console.log('\n⚠️ Note: The BART features may still need the username to be "BART" (uppercase)');
        console.log('   or we need to fix the case sensitivity issue properly.');
        
    } catch (error) {
        console.error('❌ Rollback failed:', error);
        process.exit(1);
    }
}

rollback();