#!/usr/bin/env node

/**
 * Safe Update Wrapper for ToyBox OS
 * 
 * This wrapper ensures ANY update to ToyBox OS:
 * 1. Backs up current version first
 * 2. Applies the update
 * 3. Keeps backup history
 * 
 * Usage in your fix scripts:
 *   import { safeUpdateToyBoxOS } from './safe-update-wrapper.js';
 *   await safeUpdateToyBoxOS(modifiedHtml, 'Description of changes');
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
const result = dotenv.config({ path: '../.env.local' });
if (result.error) {
    console.error('Error loading .env.local:', result.error.message);
    process.exit(1);
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

export async function fetchCurrentToyBoxOS() {
    const { data, error } = await supabase
        .from('wtaf_content')
        .select('html_content, updated_at')
        .eq('user_slug', 'public')
        .eq('app_slug', 'toybox-os')
        .single();
    
    if (error) {
        throw new Error(`Failed to fetch ToyBox OS: ${error.message}`);
    }
    
    return data;
}

export async function createBackup(htmlContent, description = '') {
    const timestamp = new Date().toISOString()
        .replace(/:/g, '-')
        .replace(/\./g, '-')
        .replace('T', '_')
        .slice(0, -5);
    
    // Save HTML backup
    const backupFile = path.join(backupDir, `toybox-os_${timestamp}.html`);
    fs.writeFileSync(backupFile, htmlContent);
    
    // Save metadata
    const metadataFile = path.join(backupDir, `toybox-os_${timestamp}.json`);
    fs.writeFileSync(metadataFile, JSON.stringify({
        backed_up_at: new Date().toISOString(),
        description: description,
        file_size: htmlContent.length,
        backup_file: backupFile
    }, null, 2));
    
    // Update latest backup
    const latestBackup = path.join(backupDir, 'toybox-os_latest-backup.html');
    fs.writeFileSync(latestBackup, htmlContent);
    
    console.log(`💾 Backup created: ${backupFile}`);
    
    return backupFile;
}

export async function safeUpdateToyBoxOS(newHtml, description = 'Update') {
    try {
        console.log('\n🔒 Safe Update Process Starting...');
        
        // Step 1: Fetch and backup current version
        console.log('1️⃣  Backing up current version...');
        const current = await fetchCurrentToyBoxOS();
        await createBackup(current.html_content, `Before: ${description}`);
        
        // Step 2: Update in Supabase
        console.log('2️⃣  Applying update to Supabase...');
        const { error } = await supabase
            .from('wtaf_content')
            .update({ 
                html_content: newHtml,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os');
        
        if (error) {
            throw new Error(`Update failed: ${error.message}`);
        }
        
        // Step 3: Save the new version locally too
        console.log('3️⃣  Saving new version locally...');
        const currentFile = path.join(process.cwd(), 'current-toybox-os.html');
        fs.writeFileSync(currentFile, newHtml);
        
        console.log('✅ Update completed successfully!');
        console.log(`📄 Description: ${description}`);
        console.log('🔗 Live at: https://webtoys.ai/public/toybox-os');
        
        return true;
        
    } catch (error) {
        console.error('❌ Safe update failed:', error.message);
        console.log('🔄 Your backup is safe in the backups/ folder');
        throw error;
    }
}

// Quick restore function
export async function restoreFromBackup(backupFile) {
    if (!fs.existsSync(backupFile)) {
        throw new Error(`Backup file not found: ${backupFile}`);
    }
    
    const htmlContent = fs.readFileSync(backupFile, 'utf8');
    await safeUpdateToyBoxOS(htmlContent, `Restored from: ${path.basename(backupFile)}`);
}

// List available backups
export function listBackups() {
    if (!fs.existsSync(backupDir)) {
        return [];
    }
    
    return fs.readdirSync(backupDir)
        .filter(f => f.endsWith('.html') && f.includes('toybox-os'))
        .sort()
        .reverse();
}