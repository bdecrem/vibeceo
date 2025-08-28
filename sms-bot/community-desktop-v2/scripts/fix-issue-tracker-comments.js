#!/usr/bin/env node

/**
 * Fix Issue Tracker Comments - Make Edit Agent comments visible
 * 
 * The execute-open-issue.js script adds comments to the admin_comments array
 * but they're not showing up in the UI. This script will fix that.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Load environment variables
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

export async function fetchCurrentIssueTracker() {
    console.log('🔍 Fetching current Issue Tracker app...');
    
    const { data, error } = await supabase
        .from('wtaf_content')
        .select('html_content, updated_at')
        .eq('user_slug', 'public')
        .eq('app_slug', 'toybox-issue-tracker')
        .single();
    
    if (error) {
        throw new Error(`Failed to fetch Issue Tracker: ${error.message}`);
    }
    
    console.log(`✅ Found Issue Tracker app (${data.html_content.length} chars)`);
    return data;
}

export async function createIssueTrackerBackup(htmlContent, description = '') {
    const timestamp = new Date().toISOString()
        .replace(/:/g, '-')
        .replace(/\./g, '-')
        .replace('T', '_')
        .slice(0, -5);
    
    // Save HTML backup
    const backupFile = path.join(backupDir, `issue-tracker_${timestamp}.html`);
    fs.writeFileSync(backupFile, htmlContent);
    
    // Save metadata
    const metadataFile = path.join(backupDir, `issue-tracker_${timestamp}.json`);
    fs.writeFileSync(metadataFile, JSON.stringify({
        backed_up_at: new Date().toISOString(),
        description: description,
        file_size: htmlContent.length,
        backup_file: backupFile
    }, null, 2));
    
    console.log(`💾 Backup created: ${backupFile}`);
    return backupFile;
}

export async function safeUpdateIssueTracker(newHtml, description = 'Update') {
    try {
        console.log('\n🔒 Safe Update Process Starting for Issue Tracker...');
        
        // Step 1: Fetch and backup current version
        console.log('1️⃣  Backing up current version...');
        const current = await fetchCurrentIssueTracker();
        await createIssueTrackerBackup(current.html_content, `Before: ${description}`);
        
        // Step 2: Update in Supabase
        console.log('2️⃣  Applying update to Supabase...');
        const { error } = await supabase
            .from('wtaf_content')
            .update({ 
                html_content: newHtml,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker');
        
        if (error) {
            throw new Error(`Update failed: ${error.message}`);
        }
        
        // Step 3: Save the new version locally too
        console.log('3️⃣  Saving new version locally...');
        const currentFile = path.join(process.cwd(), 'current-issue-tracker.html');
        fs.writeFileSync(currentFile, newHtml);
        
        console.log('✅ Update completed successfully!');
        console.log(`📄 Description: ${description}`);
        console.log('🔗 Live at: https://webtoys.ai/public/toybox-issue-tracker');
        
        return true;
        
    } catch (error) {
        console.error('❌ Safe update failed:', error.message);
        console.log('🔄 Your backup is safe in the backups/ folder');
        throw error;
    }
}

// Deploy the fixed Issue Tracker
async function deployFixed() {
    try {
        console.log('🚀 Deploying fixed Issue Tracker with admin comments support...');
        
        // Read the fixed HTML file
        const fixedFile = path.join(process.cwd(), 'current-issue-tracker.html');
        if (!fs.existsSync(fixedFile)) {
            throw new Error(`Fixed file not found: ${fixedFile}`);
        }
        
        const fixedHtml = fs.readFileSync(fixedFile, 'utf8');
        
        // Deploy using safe wrapper
        await safeUpdateIssueTracker(fixedHtml, 'Fix Edit Agent comments display - add admin_comments and resolution support');
        
        console.log('\n✅ Issue Tracker has been updated successfully!');
        console.log('🔗 Check it out: https://webtoys.ai/public/toybox-issue-tracker');
        console.log('\nThe following features were added:');
        console.log('• Admin comments section for each issue');
        console.log('• Edit Agent comments with special styling (blue border)');
        console.log('• Resolution information display');
        console.log('• Execution time for Edit Agent tasks');
        
    } catch (error) {
        console.error('❌ Deploy failed:', error.message);
        process.exit(1);
    }
}

// Let's fetch and examine the current Issue Tracker
async function main() {
    try {
        if (process.argv[2] === 'deploy') {
            await deployFixed();
            return;
        }
        
        const current = await fetchCurrentIssueTracker();
        
        // Save current version for analysis
        const currentFile = path.join(process.cwd(), 'current-issue-tracker.html');
        fs.writeFileSync(currentFile, current.html_content);
        console.log(`📄 Current Issue Tracker saved to: ${currentFile}`);
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

// Run if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}