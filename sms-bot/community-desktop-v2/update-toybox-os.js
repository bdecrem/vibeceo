#!/usr/bin/env node

/**
 * Universal ToyBox OS Update Script with Automatic Backup
 * 
 * Usage:
 *   node update-toybox-os.js [html-file]
 * 
 * Examples:
 *   node update-toybox-os.js fixed-toybox-os.html  # Deploy specific file
 *   node update-toybox-os.js                        # Just backup current version
 * 
 * This script:
 * 1. ALWAYS backs up current version from Supabase first
 * 2. Optionally updates with new HTML if file provided
 * 3. Creates timestamped backups in backups/ folder
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

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Create backups directory if it doesn't exist
const backupDir = path.join(process.cwd(), 'backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
}

async function backupCurrentVersion() {
    console.log('📥 Fetching current ToyBox OS from Supabase...');
    
    const { data, error } = await supabase
        .from('wtaf_content')
        .select('html_content, updated_at')
        .eq('user_slug', 'public')
        .eq('app_slug', 'toybox-os')
        .single();
    
    if (error) {
        console.error('❌ Error fetching from Supabase:', error.message);
        throw error;
    }
    
    // Create timestamp for backup filename
    const timestamp = new Date().toISOString()
        .replace(/:/g, '-')
        .replace(/\./g, '-')
        .replace('T', '_')
        .slice(0, -5); // Remove timezone
    
    // Save backup with timestamp
    const backupFile = path.join(backupDir, `toybox-os_${timestamp}.html`);
    fs.writeFileSync(backupFile, data.html_content);
    
    // Also save as 'latest-backup' for easy access
    const latestBackup = path.join(backupDir, 'toybox-os_latest-backup.html');
    fs.writeFileSync(latestBackup, data.html_content);
    
    console.log(`✅ Backup saved: ${backupFile}`);
    console.log(`✅ Also saved as: ${latestBackup}`);
    
    // Save metadata about the backup
    const metadataFile = path.join(backupDir, `toybox-os_${timestamp}.json`);
    fs.writeFileSync(metadataFile, JSON.stringify({
        backed_up_at: new Date().toISOString(),
        from_database_updated_at: data.updated_at,
        file_size: data.html_content.length,
        backup_file: backupFile
    }, null, 2));
    
    return backupFile;
}

async function updateToyBoxOS(htmlFile) {
    console.log(`📤 Updating ToyBox OS from: ${htmlFile}`);
    
    // Read the new HTML content
    if (!fs.existsSync(htmlFile)) {
        console.error(`❌ File not found: ${htmlFile}`);
        process.exit(1);
    }
    
    const newHtml = fs.readFileSync(htmlFile, 'utf8');
    
    // Update in Supabase
    const { error } = await supabase
        .from('wtaf_content')
        .update({ 
            html_content: newHtml,
            updated_at: new Date().toISOString()
        })
        .eq('user_slug', 'public')
        .eq('app_slug', 'toybox-os');
    
    if (error) {
        console.error('❌ Error updating Supabase:', error.message);
        throw error;
    }
    
    console.log('✅ ToyBox OS updated successfully!');
    console.log('🔗 Live at: https://webtoys.ai/public/toybox-os');
}

async function main() {
    try {
        // Always backup first
        const backupFile = await backupCurrentVersion();
        
        // If HTML file provided, update with it
        const htmlFile = process.argv[2];
        if (htmlFile) {
            await updateToyBoxOS(htmlFile);
        } else {
            console.log('\n📝 No HTML file provided - only backed up current version');
            console.log('   To update, run: node update-toybox-os.js [html-file]');
        }
        
        // List recent backups
        console.log('\n📂 Recent backups:');
        const backups = fs.readdirSync(backupDir)
            .filter(f => f.endsWith('.html') && f.includes('toybox-os'))
            .sort()
            .slice(-5);
        backups.forEach(b => console.log(`   - ${b}`));
        
    } catch (error) {
        console.error('❌ Operation failed:', error.message);
        process.exit(1);
    }
}

// Run the script
main();