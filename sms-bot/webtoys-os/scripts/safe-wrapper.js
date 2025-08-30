#!/usr/bin/env node

/**
 * Safe Update Wrapper for WebtoysOS v3
 * 
 * This wrapper ensures ANY update to WebtoysOS desktop:
 * 1. Backs up current version first
 * 2. Validates the update
 * 3. Applies the update to database
 * 4. Maintains backup history for rollback
 * 
 * Usage in scripts:
 *   import { safeUpdateDesktop } from './safe-wrapper.js';
 *   await safeUpdateDesktop(modifiedHtml, 'Description of changes');
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Ensure backups directory exists
const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

/**
 * Fetch current desktop HTML from database
 * @param {boolean} isTest - Whether to fetch test or production version
 */
export async function fetchCurrentDesktop(isTest = true) {
    const appSlug = isTest ? 'toybox-os-v3-test' : 'toybox-os-v3';
    
    const { data, error } = await supabase
        .from('wtaf_content')
        .select('html_content, updated_at, app_slug')
        .eq('user_slug', 'public')
        .eq('app_slug', appSlug)
        .limit(1);
    
    if (error) {
        throw new Error(`Failed to fetch desktop: ${error.message}`);
    }
    
    if (!data || data.length === 0) {
        throw new Error(`Desktop not found: ${appSlug}`);
    }
    
    return data[0];
}

/**
 * Create a backup of the current desktop
 */
export async function createBackup(htmlContent, appSlug, description = '') {
    const timestamp = new Date().toISOString()
        .replace(/:/g, '-')
        .replace(/\./g, '-')
        .replace('T', '_')
        .slice(0, -5);
    
    // Save HTML backup
    const backupFile = path.join(backupDir, `${appSlug}_${timestamp}.html`);
    fs.writeFileSync(backupFile, htmlContent);
    
    // Save metadata
    const metadataFile = path.join(backupDir, `${appSlug}_${timestamp}.json`);
    fs.writeFileSync(metadataFile, JSON.stringify({
        backed_up_at: new Date().toISOString(),
        description: description,
        file_size: htmlContent.length,
        backup_file: backupFile,
        app_slug: appSlug
    }, null, 2));
    
    // Update latest backup for quick restore
    const latestBackup = path.join(backupDir, `${appSlug}_latest-backup.html`);
    fs.writeFileSync(latestBackup, htmlContent);
    
    console.log(`💾 Backup created: ${backupFile}`);
    
    return backupFile;
}

/**
 * Validate HTML content before updating
 */
export function validateHTML(html) {
    const errors = [];
    
    // Check for required desktop components
    if (!html.includes('class="desktop"') && !html.includes('id="desktop"')) {
        errors.push('Missing desktop container');
    }
    
    if (!html.includes('window-container')) {
        errors.push('Missing window container for apps');
    }
    
    if (!html.includes('menu-bar')) {
        errors.push('Missing menu bar');
    }
    
    // Check for basic HTML structure
    if (!html.includes('<!DOCTYPE html>')) {
        errors.push('Missing DOCTYPE declaration');
    }
    
    if (!html.includes('<html') || !html.includes('</html>')) {
        errors.push('Invalid HTML structure');
    }
    
    // Check for malicious content
    if (html.includes('eval(') || html.includes('Function(')) {
        errors.push('⚠️  Warning: Contains potentially dangerous eval() or Function()');
    }
    
    return errors;
}

/**
 * Safe update desktop with automatic backup
 */
export async function safeUpdateDesktop(newHtml, description = 'Update', isTest = true) {
    try {
        console.log('\n🔒 Safe Desktop Update Process Starting...');
        
        const appSlug = isTest ? 'toybox-os-v3-test' : 'toybox-os-v3';
        console.log(`📍 Target: ${appSlug}`);
        
        // Step 1: Validate new HTML
        console.log('1️⃣  Validating HTML...');
        const validationErrors = validateHTML(newHtml);
        
        if (validationErrors.length > 0) {
            console.warn('⚠️  Validation warnings:');
            validationErrors.forEach(err => console.warn(`   - ${err}`));
            
            // Ask for confirmation on warnings
            if (validationErrors.some(err => err.includes('dangerous'))) {
                console.error('❌ Dangerous code detected. Update cancelled.');
                return false;
            }
        }
        
        // Step 2: Backup current version
        console.log('2️⃣  Backing up current version...');
        const current = await fetchCurrentDesktop(isTest);
        await createBackup(current.html_content, appSlug, `Before: ${description}`);
        
        // Step 3: Update in Supabase
        console.log('3️⃣  Applying update to Supabase...');
        const { error } = await supabase
            .from('wtaf_content')
            .update({ 
                html_content: newHtml,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', appSlug);
        
        if (error) {
            throw new Error(`Update failed: ${error.message}`);
        }
        
        // Step 4: Save the new version locally for reference
        console.log('4️⃣  Saving reference copy locally...');
        const currentFile = path.join(__dirname, '../', `current-${appSlug}.html`);
        fs.writeFileSync(currentFile, newHtml);
        
        console.log('\n✅ Update completed successfully!');
        console.log(`📄 Description: ${description}`);
        console.log(`🔗 Live at: https://webtoys.ai/public/${appSlug}`);
        console.log(`💾 Backup saved in: backups/`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Safe update failed:', error.message);
        console.log('🔄 Your backup is safe in the backups/ folder');
        console.log('   Run: node scripts/restore-backup.js to restore');
        throw error;
    }
}

/**
 * Quick restore function from backup
 */
export async function restoreFromBackup(backupFile, isTest = true) {
    if (!fs.existsSync(backupFile)) {
        // Try relative to backups directory
        backupFile = path.join(backupDir, backupFile);
        if (!fs.existsSync(backupFile)) {
            throw new Error(`Backup file not found: ${backupFile}`);
        }
    }
    
    const htmlContent = fs.readFileSync(backupFile, 'utf8');
    await safeUpdateDesktop(htmlContent, `Restored from: ${path.basename(backupFile)}`, isTest);
}

/**
 * List available backups
 */
export function listBackups(appSlug = null) {
    if (!fs.existsSync(backupDir)) {
        console.log('No backups found');
        return [];
    }
    
    const files = fs.readdirSync(backupDir);
    const htmlFiles = files.filter(f => f.endsWith('.html') && !f.includes('latest'));
    
    if (appSlug) {
        return htmlFiles.filter(f => f.startsWith(appSlug));
    }
    
    const backups = htmlFiles.map(file => {
        const metadataFile = file.replace('.html', '.json');
        const metadataPath = path.join(backupDir, metadataFile);
        
        let metadata = {};
        if (fs.existsSync(metadataPath)) {
            try {
                metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            } catch (e) {
                // Ignore metadata errors
            }
        }
        
        return {
            file: file,
            path: path.join(backupDir, file),
            timestamp: metadata.backed_up_at || 'Unknown',
            description: metadata.description || 'No description',
            size: metadata.file_size || fs.statSync(path.join(backupDir, file)).size
        };
    });
    
    return backups.sort((a, b) => b.file.localeCompare(a.file));
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const command = process.argv[2];
    
    if (command === 'list') {
        console.log('\n📚 Available backups:\n');
        const backups = listBackups();
        backups.forEach((backup, index) => {
            console.log(`${index + 1}. ${backup.file}`);
            console.log(`   📝 ${backup.description}`);
            console.log(`   📅 ${backup.timestamp}`);
            console.log(`   📦 ${(backup.size / 1024).toFixed(2)} KB`);
            console.log('');
        });
    } else if (command === 'restore') {
        const backupFile = process.argv[3];
        const isTest = process.argv[4] !== '--prod';
        
        if (!backupFile) {
            console.error('Usage: node safe-wrapper.js restore <backup-file> [--prod]');
            process.exit(1);
        }
        
        restoreFromBackup(backupFile, isTest)
            .then(() => console.log('✅ Restore completed'))
            .catch(err => console.error('❌ Restore failed:', err.message));
    } else {
        console.log(`
WebtoysOS Safe Wrapper Utility

Commands:
  node safe-wrapper.js list                    - List all backups
  node safe-wrapper.js restore <file> [--prod] - Restore from backup
  
In your scripts:
  import { safeUpdateDesktop } from './safe-wrapper.js';
  await safeUpdateDesktop(html, 'Description');
        `);
    }
}