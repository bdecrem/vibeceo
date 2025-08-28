#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function restoreIssuesApp(backupFile) {
    if (!backupFile) {
        console.error('❌ Please provide a backup file path');
        console.log('Usage: node restore-issues-app.js <backup-file-path>');
        console.log('Example: node restore-issues-app.js ../backups/community-issues_latest-backup.html');
        process.exit(1);
    }
    
    // Check if backup file exists
    const fullPath = path.isAbsolute(backupFile) ? backupFile : path.join(__dirname, backupFile);
    
    if (!fs.existsSync(fullPath)) {
        console.error(`❌ Backup file not found: ${fullPath}`);
        process.exit(1);
    }
    
    console.log(`📂 Reading backup from: ${fullPath}`);
    const htmlContent = fs.readFileSync(fullPath, 'utf-8');
    
    console.log('🚀 Restoring Issues app from backup...');
    
    const { error } = await supabase
        .from('wtaf_content')
        .update({ 
            html_content: htmlContent,
            updated_at: new Date().toISOString()
        })
        .eq('user_slug', 'public')
        .eq('app_slug', 'toybox-issue-tracker');
    
    if (error) {
        console.error('❌ Error restoring Issues app:', error);
        process.exit(1);
    }
    
    console.log('✅ Issues app successfully restored from backup!');
    console.log('🌐 View at: https://webtoys.ai/public/toybox-issue-tracker');
}

const backupFile = process.argv[2];
restoreIssuesApp(backupFile).catch(console.error);