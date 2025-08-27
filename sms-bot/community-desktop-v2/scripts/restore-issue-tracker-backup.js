#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

// Environment variables will be loaded by safe-update-wrapper.js
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load the safe wrapper to get environment variables
import('./safe-update-wrapper.js');

// Wait a moment for env vars to load
setTimeout(async () => {
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('❌ Missing required environment variables');
        process.exit(1);
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    async function restoreIssueTracker() {
        console.log('🔄 Restoring Issue Tracker from backup...');

        try {
            // Read the backup file
            const backupPath = path.join(__dirname, '../backups/issue-tracker_2025-08-26_01-41-40.html');
            
            if (!fs.existsSync(backupPath)) {
                console.error('❌ Backup file not found:', backupPath);
                return;
            }

            const html = fs.readFileSync(backupPath, 'utf8');
            console.log('📄 Read backup file (size:', html.length, 'bytes)');

            // Find the Issue Tracker app slug
            console.log('🔍 Looking for Issue Tracker app in database...');
            const { data: apps, error: listError } = await supabase
                .from('wtaf_content')
                .select('app_slug, user_slug')
                .eq('user_slug', 'public')
                .eq('app_slug', 'toybox-issue-tracker');
                
            if (listError) {
                console.error('❌ Failed to find app:', listError);
                return;
            }
            
            if (!apps || apps.length === 0) {
                console.error('❌ toybox-issue-tracker not found in database');
                return;
            }
            
            console.log('✅ Found toybox-issue-tracker');

            // Restore the backup to database
            const { error: updateError } = await supabase
                .from('wtaf_content')
                .update({ 
                    html_content: html
                })
                .eq('user_slug', 'public')
                .eq('app_slug', 'toybox-issue-tracker');

            if (updateError) {
                console.error('❌ Failed to restore Issue Tracker:', updateError);
                return;
            }

            console.log('✅ Issue Tracker restored from backup!');
            console.log('');
            console.log('Restored from: issue-tracker_2025-08-26_01-41-40.html');
            console.log('This is the version from before the recent authentication changes.');
            console.log('');
            console.log('Test it at: https://webtoys.ai/public/toybox-issue-tracker');

        } catch (error) {
            console.error('❌ Error:', error);
        }
    }

    // Run the restore
    restoreIssueTracker();
}, 100);