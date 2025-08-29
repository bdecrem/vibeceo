#!/usr/bin/env node

/**
 * Restore Fixit Board from a known good backup
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

async function restoreFixit() {
    try {
        console.log('🔄 Restoring Fixit Board from backup...');
        
        // Use the backup from just before the Task agent modified it
        // This one has all our features but before the breaking changes
        const backupFile = 'fixit-board_before_case_fix_1756158790406.html';
        const backupPath = path.join(__dirname, '..', 'backups', backupFile);
        
        console.log(`📂 Reading backup: ${backupFile}`);
        const restoredHtml = await fs.readFile(backupPath, 'utf-8');
        
        // Verify it looks valid
        if (!restoredHtml.includes('Fixit Board') && !restoredHtml.includes('Issue Tracker')) {
            console.error('❌ Backup doesn\'t look like Fixit Board!');
            return;
        }
        
        console.log('✅ Backup looks valid');
        
        // Save current broken version
        const { data: currentData } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        if (currentData) {
            const brokenBackup = path.join(__dirname, '..', 'backups', `fixit_BROKEN_BY_TASK_${Date.now()}.html`);
            await fs.writeFile(brokenBackup, currentData.html_content);
            console.log('💾 Saved broken version for analysis');
        }
        
        // Restore to Supabase
        console.log('📤 Uploading to Supabase...');
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
        
        console.log('✅ RESTORE SUCCESSFUL!');
        console.log('\n📋 What\'s been restored:');
        console.log('  • ToyBox OS Fixit Board title');
        console.log('  • Issue numbering system');
        console.log('  • Reload button in corner');
        console.log('  • Dropdown for action types');
        console.log('  • Authentication integration');
        console.log('  • BART superpowers (for "BART" uppercase)');
        console.log('\n⚠️ Note: BART features still require uppercase "BART"');
        console.log('   We\'ll need to fix case sensitivity properly later');
        console.log('\n🔄 Reload the Fixit Board - it should work again!');
        
    } catch (error) {
        console.error('❌ Restore failed:', error);
        process.exit(1);
    }
}

restoreFixit();