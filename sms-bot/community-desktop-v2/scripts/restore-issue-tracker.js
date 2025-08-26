#!/usr/bin/env node

/**
 * Restore Issue Tracker from backup
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

async function restoreIssueTracker() {
    try {
        console.log('🔄 Restoring Issue Tracker from backup...');
        
        // Read the backup file (before duplicate fix)
        const backupPath = path.join(__dirname, '..', 'backups', 'issue-tracker_before_duplicate_fix_1756166724102.html');
        const html = await fs.readFile(backupPath, 'utf-8');
        
        console.log(`📁 Restoring from: ${backupPath}`);
        
        // Update in Supabase
        const { error } = await supabase
            .from('wtaf_content')
            .update({
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker');
        
        if (error) throw error;
        
        console.log('✅ Issue Tracker restored successfully!');
        console.log('\n📋 Restored version includes:');
        console.log('  • All authentication fixes');
        console.log('  • Admin powers for bart');
        console.log('  • Username display');
        console.log('  • Issue numbering');
        console.log('\n🔄 Refresh the Issue Tracker to see all issues again!');
        console.log('  • https://webtoys.ai/public/toybox-issue-tracker');
        
    } catch (error) {
        console.error('❌ Failed to restore:', error);
        process.exit(1);
    }
}

restoreIssueTracker();