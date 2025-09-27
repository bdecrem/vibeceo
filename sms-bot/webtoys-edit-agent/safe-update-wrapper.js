#!/usr/bin/env node

/**
 * Safe Update Wrapper for Webtoys Edit Agent
 * 
 * This wrapper ensures ANY update to Webtoy apps:
 * 1. Backs up current version first
 * 2. Validates the update
 * 3. Applies the update to database
 * 4. Maintains backup history for rollback
 * 5. Can restore from any backup
 * 
 * Usage in scripts:
 *   import { safeUpdateApp } from './safe-update-wrapper.js';
 *   await safeUpdateApp('bart', 'my-app', modifiedHtml, 'Description of changes');
 * 
 * CLI usage:
 *   node safe-update-wrapper.js list [user/app]     # List backups
 *   node safe-update-wrapper.js backup bart/my-app  # Create backup only
 *   node safe-update-wrapper.js restore <backup-file> # Restore from backup
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') });
if (!process.env.SUPABASE_URL) {
    dotenv.config({ path: path.join(__dirname, '../.env') });
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Ensure backups directory exists
const backupDir = path.join(__dirname, 'backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

/**
 * Fetch current app HTML from database
 * @param {string} userSlug - User slug (e.g., 'bart')
 * @param {string} appSlug - App slug (e.g., 'my-app')
 */
export async function fetchCurrentApp(userSlug, appSlug) {
    const { data, error } = await supabase
        .from('wtaf_content')
        .select('id, html_content, updated_at, app_slug, user_slug')
        .eq('user_slug', userSlug)
        .eq('app_slug', appSlug)
        .single();
    
    if (error) {
        throw new Error(`Failed to fetch app: ${error.message}`);
    }
    
    if (!data) {
        throw new Error(`App not found: ${userSlug}/${appSlug}`);
    }
    
    return data;
}

/**
 * Create a backup of the current app
 */
export async function createBackup(htmlContent, userSlug, appSlug, appId, description = '') {
    const timestamp = new Date().toISOString()
        .replace(/:/g, '-')
        .replace(/\./g, '-')
        .replace('T', '_')
        .slice(0, -5);
    
    // Create subdirectory for user if needed
    const userBackupDir = path.join(backupDir, userSlug);
    if (!fs.existsSync(userBackupDir)) {
        fs.mkdirSync(userBackupDir, { recursive: true });
    }
    
    // Save HTML backup
    const backupFile = path.join(userBackupDir, `${appSlug}_${timestamp}.html`);
    fs.writeFileSync(backupFile, htmlContent);
    
    // Save metadata
    const metadataFile = path.join(userBackupDir, `${appSlug}_${timestamp}.json`);
    fs.writeFileSync(metadataFile, JSON.stringify({
        backed_up_at: new Date().toISOString(),
        description: description,
        file_size: htmlContent.length,
        backup_file: backupFile,
        user_slug: userSlug,
        app_slug: appSlug,
        app_id: appId,
        url: `https://webtoys.ai/${userSlug}/${appSlug}`
    }, null, 2));
    
    // Update latest backup for quick restore
    const latestBackup = path.join(userBackupDir, `${appSlug}_latest-backup.html`);
    fs.writeFileSync(latestBackup, htmlContent);
    
    console.log(`💾 Backup created: ${backupFile}`);
    
    return backupFile;
}

/**
 * Validate HTML content before updating
 */
export function validateHTML(html, appType = 'general') {
    const errors = [];
    const warnings = [];
    
    // Basic HTML structure
    if (!html.includes('<!DOCTYPE html>') && !html.includes('<!doctype html>')) {
        warnings.push('Missing DOCTYPE declaration');
    }
    
    if (!html.includes('<html') || !html.includes('</html>')) {
        errors.push('Invalid HTML structure - missing <html> tags');
    }
    
    if (!html.includes('<body') || !html.includes('</body>')) {
        errors.push('Invalid HTML structure - missing <body> tags');
    }
    
    // Check for malicious content
    if (html.includes('eval(') || html.includes('Function(')) {
        warnings.push('⚠️  Contains potentially dangerous eval() or Function()');
    }
    
    // Check for external scripts from untrusted sources
    const scriptPattern = /<script[^>]*src=["']([^"']+)["'][^>]*>/gi;
    let match;
    while ((match = scriptPattern.exec(html)) !== null) {
        const src = match[1];
        if (!src.includes('cdn.jsdelivr.net') && 
            !src.includes('unpkg.com') && 
            !src.includes('cdnjs.cloudflare.com') &&
            !src.includes('supabase') &&
            !src.includes('googleapis.com')) {
            warnings.push(`External script from potentially untrusted source: ${src}`);
        }
    }
    
    // App-specific validations
    if (appType === 'zad') {
        // Check for ZAD API endpoints
        if (!html.includes('/api/zad/save') || !html.includes('/api/zad/load')) {
            warnings.push('ZAD app missing API endpoints');
        }
        
        // Check for critical ZAD functions
        if (!html.includes('window.APP_ID') && !html.includes('getAppId')) {
            warnings.push('ZAD app missing APP_ID management');
        }
    }
    
    if (appType === 'game') {
        // Check for game loop
        if (!html.includes('requestAnimationFrame') && !html.includes('setInterval')) {
            warnings.push('Game app missing animation/game loop');
        }
        
        // Check for canvas
        if (!html.includes('<canvas') && !html.includes('createElement(\'canvas\'')) {
            warnings.push('Game app missing canvas element');
        }
    }
    
    return { errors, warnings };
}

/**
 * Detect app type from HTML content
 */
function detectAppType(html) {
    if (html.includes('/api/zad/save') && html.includes('/api/zad/load')) {
        return 'zad';
    }
    if (html.includes('requestAnimationFrame') || html.includes('<canvas')) {
        return 'game';
    }
    if (html.includes('<form') && (html.includes('submit') || html.includes('POST'))) {
        return 'form';
    }
    return 'general';
}

/**
 * Safe update app with automatic backup
 */
export async function safeUpdateApp(userSlug, appSlug, newHtml, description = 'Update') {
    try {
        console.log('\n🔒 Safe App Update Process Starting...');
        console.log(`📍 Target: ${userSlug}/${appSlug}`);
        
        // Step 1: Fetch current version
        console.log('1️⃣  Fetching current version...');
        const current = await fetchCurrentApp(userSlug, appSlug);
        
        // Step 2: Validate new HTML
        console.log('2️⃣  Validating new HTML...');
        const appType = detectAppType(newHtml);
        console.log(`   Detected app type: ${appType}`);
        
        const { errors, warnings } = validateHTML(newHtml, appType);
        
        if (errors.length > 0) {
            console.error('❌ Validation errors:');
            errors.forEach(err => console.error(`   - ${err}`));
            console.log('\n⛔ Update cancelled due to validation errors');
            return false;
        }
        
        if (warnings.length > 0) {
            console.warn('⚠️  Validation warnings:');
            warnings.forEach(warn => console.warn(`   - ${warn}`));
        }
        
        // Step 3: Create backup
        console.log('3️⃣  Creating backup of current version...');
        const backupFile = await createBackup(
            current.html_content, 
            userSlug, 
            appSlug, 
            current.id,
            `Before: ${description}`
        );
        
        // Step 4: Update in Supabase
        console.log('4️⃣  Applying update to Supabase...');
        const { error } = await supabase
            .from('wtaf_content')
            .update({ 
                html_content: newHtml,
                updated_at: new Date().toISOString()
            })
            .eq('id', current.id);
        
        if (error) {
            throw new Error(`Update failed: ${error.message}`);
        }
        
        // Step 5: Verify update
        console.log('5️⃣  Verifying update...');
        const { data: updated } = await supabase
            .from('wtaf_content')
            .select('updated_at')
            .eq('id', current.id)
            .single();
        
        if (updated) {
            console.log(`   ✓ Updated at: ${updated.updated_at}`);
        }
        
        console.log('\n✅ Update completed successfully!');
        console.log(`📄 Description: ${description}`);
        console.log(`🔗 Live at: https://webtoys.ai/${userSlug}/${appSlug}`);
        console.log(`💾 Backup saved: ${path.relative(process.cwd(), backupFile)}`);
        console.log('\n💡 To restore if needed:');
        console.log(`   node safe-update-wrapper.js restore ${path.basename(backupFile)}`);
        
        return true;
        
    } catch (error) {
        console.error('\n❌ Safe update failed:', error.message);
        console.log('🔄 Your backup is safe. To restore:');
        console.log(`   node safe-update-wrapper.js restore ${userSlug}/${appSlug}_latest-backup.html`);
        throw error;
    }
}

/**
 * Quick backup without updating
 */
export async function backupOnly(userSlug, appSlug, description = 'Manual backup') {
    try {
        console.log(`\n💾 Creating backup for ${userSlug}/${appSlug}...`);
        
        const current = await fetchCurrentApp(userSlug, appSlug);
        const backupFile = await createBackup(
            current.html_content,
            userSlug,
            appSlug,
            current.id,
            description
        );
        
        console.log('✅ Backup created successfully!');
        console.log(`📦 File: ${path.relative(process.cwd(), backupFile)}`);
        
        return backupFile;
        
    } catch (error) {
        console.error('❌ Backup failed:', error.message);
        throw error;
    }
}

/**
 * Restore from backup file
 */
export async function restoreFromBackup(backupFile) {
    try {
        // Find the backup file
        if (!fs.existsSync(backupFile)) {
            // Try relative to backups directory
            const possiblePaths = [
                path.join(backupDir, backupFile),
                path.join(backupDir, '*', backupFile),
            ];
            
            for (const pattern of possiblePaths) {
                const files = fs.readdirSync(path.dirname(pattern))
                    .filter(f => f.includes(path.basename(backupFile)));
                if (files.length > 0) {
                    backupFile = path.join(path.dirname(pattern), files[0]);
                    break;
                }
            }
            
            if (!fs.existsSync(backupFile)) {
                throw new Error(`Backup file not found: ${backupFile}`);
            }
        }
        
        // Find metadata
        const metadataFile = backupFile.replace('.html', '.json');
        if (!fs.existsSync(metadataFile)) {
            throw new Error('Backup metadata not found. Cannot determine app details.');
        }
        
        const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
        const htmlContent = fs.readFileSync(backupFile, 'utf8');
        
        console.log(`\n🔄 Restoring ${metadata.user_slug}/${metadata.app_slug}...`);
        console.log(`   From backup: ${metadata.backed_up_at}`);
        console.log(`   Description: ${metadata.description}`);
        
        await safeUpdateApp(
            metadata.user_slug,
            metadata.app_slug,
            htmlContent,
            `Restored from: ${path.basename(backupFile)}`
        );
        
        console.log('\n✅ Restore completed successfully!');
        
    } catch (error) {
        console.error('❌ Restore failed:', error.message);
        throw error;
    }
}

/**
 * List available backups
 */
export function listBackups(filter = null) {
    if (!fs.existsSync(backupDir)) {
        console.log('No backups found');
        return [];
    }
    
    const backups = [];
    
    // Read all user directories
    const userDirs = fs.readdirSync(backupDir)
        .filter(f => fs.statSync(path.join(backupDir, f)).isDirectory());
    
    for (const userDir of userDirs) {
        const userBackupDir = path.join(backupDir, userDir);
        const files = fs.readdirSync(userBackupDir)
            .filter(f => f.endsWith('.html') && !f.includes('latest'));
        
        for (const file of files) {
            const metadataFile = file.replace('.html', '.json');
            const metadataPath = path.join(userBackupDir, metadataFile);
            
            let metadata = {};
            if (fs.existsSync(metadataPath)) {
                try {
                    metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
                } catch (e) {
                    // Ignore metadata errors
                }
            }
            
            // Apply filter if provided
            if (filter) {
                const [filterUser, filterApp] = filter.split('/');
                if (filterUser && userDir !== filterUser) continue;
                if (filterApp && !file.startsWith(filterApp)) continue;
            }
            
            backups.push({
                file: path.join(userDir, file),
                path: path.join(userBackupDir, file),
                timestamp: metadata.backed_up_at || 'Unknown',
                description: metadata.description || 'No description',
                size: metadata.file_size || fs.statSync(path.join(userBackupDir, file)).size,
                user: metadata.user_slug || userDir,
                app: metadata.app_slug || file.split('_')[0],
                url: metadata.url
            });
        }
    }
    
    return backups.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
    const command = process.argv[2];
    
    if (command === 'list') {
        const filter = process.argv[3]; // Optional: user/app filter
        console.log('\n📚 Available backups:\n');
        const backups = listBackups(filter);
        
        if (backups.length === 0) {
            console.log('No backups found');
        } else {
            backups.forEach((backup, index) => {
                console.log(`${index + 1}. ${backup.file}`);
                console.log(`   📝 ${backup.description}`);
                console.log(`   📅 ${backup.timestamp}`);
                console.log(`   📦 ${(backup.size / 1024).toFixed(2)} KB`);
                if (backup.url) {
                    console.log(`   🔗 ${backup.url}`);
                }
                console.log('');
            });
        }
        
    } else if (command === 'backup') {
        const target = process.argv[3]; // Format: user/app
        if (!target || !target.includes('/')) {
            console.error('Usage: node safe-update-wrapper.js backup user/app-slug');
            process.exit(1);
        }
        
        const [user, app] = target.split('/');
        const description = process.argv[4] || 'Manual backup';
        
        backupOnly(user, app, description)
            .then(() => console.log('✅ Backup completed'))
            .catch(err => console.error('❌ Backup failed:', err.message));
            
    } else if (command === 'restore') {
        const backupFile = process.argv[3];
        
        if (!backupFile) {
            console.error('Usage: node safe-update-wrapper.js restore <backup-file>');
            process.exit(1);
        }
        
        restoreFromBackup(backupFile)
            .catch(err => console.error('❌ Restore failed:', err.message));
            
    } else {
        console.log(`
Webtoys Safe Update Wrapper

Commands:
  node safe-update-wrapper.js list [user/app]      - List backups (optional filter)
  node safe-update-wrapper.js backup user/app [desc] - Create backup only
  node safe-update-wrapper.js restore <file>       - Restore from backup
  
In your scripts:
  import { safeUpdateApp } from './safe-update-wrapper.js';
  await safeUpdateApp('bart', 'my-app', html, 'Fixed edit functionality');
  
Example:
  node safe-update-wrapper.js backup bart/tide-worm-speaking "Before major update"
  node safe-update-wrapper.js list bart/
  node safe-update-wrapper.js restore bart/tide-worm-speaking_2025-01-25_18-30-00.html
        `);
    }
}