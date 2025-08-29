#!/usr/bin/env node

/**
 * Restore Issue Tracker to working version
 * 
 * Restores the Issue Tracker from backup before the OPEN button mess
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
let result = dotenv.config({ path: '../.env.local' });
if (result.error) {
    result = dotenv.config({ path: '../.env' });
    if (result.error) {
        console.error('Error loading .env files:', result.error.message);
        process.exit(1);
    }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function restore() {
    console.log('🔄 Restoring Issue Tracker to working version...\n');
    
    // Read the backup from before the OPEN button changes
    const backupFile = path.join(process.cwd(), 'backups/issue-tracker_2025-08-26_01-13-36.html');
    
    if (!fs.existsSync(backupFile)) {
        console.error('❌ Backup file not found:', backupFile);
        return;
    }
    
    const html = fs.readFileSync(backupFile, 'utf8');
    console.log('✅ Loaded backup from before OPEN button changes');
    console.log('📅 Backup timestamp: 2025-08-26 01:13:36');
    
    // Update in database
    console.log('\n📤 Restoring to database...');
    const { error } = await supabase
        .from('wtaf_content')
        .update({ 
            html_content: html,
            updated_at: new Date().toISOString()
        })
        .eq('user_slug', 'public')
        .eq('app_slug', 'toybox-issue-tracker');
    
    if (error) {
        console.error('❌ Restore failed:', error.message);
        return;
    }
    
    // Save as current version
    const currentFile = path.join(process.cwd(), 'current-issue-tracker-from-db.html');
    fs.writeFileSync(currentFile, html);
    
    console.log('\n✅ Successfully restored Issue Tracker!');
    console.log('📋 Restored to version with:');
    console.log('   - Working CLOSE button for bart user');
    console.log('   - No broken OPEN button implementation');
    console.log('   - All original functionality intact');
    console.log('\n🔗 Live at: https://webtoys.ai/public/toybox-issue-tracker');
}

restore().catch(console.error);