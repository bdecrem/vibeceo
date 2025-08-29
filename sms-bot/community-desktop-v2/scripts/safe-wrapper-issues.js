#!/usr/bin/env node

/**
 * Safe Update Wrapper for ToyBox Issues Tracker
 * 
 * This wrapper ensures ANY update to Issues Tracker:
 * 1. Backs up current version first
 * 2. Applies the update
 * 3. Keeps backup history
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
let result = dotenv.config({ path: path.join(__dirname, '../../.env.local') });
if (result.error) {
    result = dotenv.config({ path: path.join(__dirname, '../../.env') });
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

// Ensure backups directory exists
const backupDir = path.join(process.cwd(), 'backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
}

export async function fetchCurrentIssuesTracker() {
    const { data, error } = await supabase
        .from('wtaf_content')
        .select('html_content, updated_at')
        .eq('user_slug', 'public')
        .eq('app_slug', 'toybox-issue-tracker')
        .single();
    
    if (error) {
        throw new Error(`Failed to fetch Issues Tracker: ${error.message}`);
    }
    
    return data;
}

export async function createBackup(htmlContent, description = '') {
    const timestamp = new Date().toISOString()
        .replace(/:/g, '-')
        .replace(/\./g, '-')
        .replace('T', 'T')
        .slice(0, -5);
    
    // Simple description for filename
    const cleanDesc = description.toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/_+/g, '_')
        .replace(/^_|_$/g, '')
        .slice(0, 20);
    
    // Save HTML backup
    const backupFile = path.join(backupDir, `toybox-issue-tracker_${timestamp}_${cleanDesc}.html`);
    fs.writeFileSync(backupFile, htmlContent);
    
    // Save metadata
    const metadataFile = path.join(backupDir, `toybox-issue-tracker_${timestamp}.json`);
    fs.writeFileSync(metadataFile, JSON.stringify({
        backed_up_at: new Date().toISOString(),
        description: description,
        file_size: htmlContent.length,
        backup_file: backupFile
    }, null, 2));
    
    console.log(`💾 Backup created: ${backupFile}`);
    
    return backupFile;
}

export async function safeUpdateToyBoxIssueTracker(newHtml, description = 'Update') {
    try {
        console.log('\n🔒 Safe Update Process Starting...');
        
        // Step 1: Fetch and backup current version
        console.log('1️⃣  Backing up current version...');
        const current = await fetchCurrentIssuesTracker();
        const backupFile = await createBackup(current.html_content, description);
        
        // Step 2: Apply update
        console.log('2️⃣  Applying update to database...');
        const { data: updateData, error: updateError } = await supabase
            .from('wtaf_content')
            .update({ 
                html_content: newHtml,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker');
        
        if (updateError) {
            throw new Error(`Failed to update Issues Tracker: ${updateError.message}`);
        }
        
        console.log('✅ Update successful!');
        console.log(`📝 Description: ${description}`);
        console.log(`💾 Backup saved: ${backupFile}`);
        
        return true;
    } catch (error) {
        console.error('❌ Update failed:', error.message);
        throw error;
    }
}

// If running directly
if (import.meta.url === `file://${process.argv[1]}`) {
    console.log('Safe wrapper for Issues Tracker ready.');
    console.log('Import this in your fix scripts:');
    console.log("  import { safeUpdateToyBoxIssueTracker } from './safe-wrapper-issues.js';");
}