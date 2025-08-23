#!/usr/bin/env node

/**
 * Safe CSS Update Wrapper for System 7 WOS Theme
 * 
 * This wrapper ensures ANY update to the System 7 WOS theme CSS:
 * 1. Backs up current version first
 * 2. Applies the update
 * 3. Keeps backup history
 * 
 * Usage in your scripts:
 *   import { safeUpdateWOSThemeCSS, fetchCurrentWOSThemeCSS } from './safe-css-wrapper-wos.js';
 *   await safeUpdateWOSThemeCSS(modifiedCSS, 'Description of changes');
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
const WOS_THEME_ID = '3d8e10a1-4fd0-4dba-9e39-68db0e538ea4'; // System 7 WOS theme ID

// Ensure CSS backups directory exists
const cssBackupDir = path.join(process.cwd(), 'backups', 'css');
if (!fs.existsSync(cssBackupDir)) {
    fs.mkdirSync(cssBackupDir, { recursive: true });
}

export async function fetchCurrentWOSThemeCSS() {
    const { data, error } = await supabase
        .from('wtaf_themes')
        .select('css_content, updated_at, name, description')
        .eq('id', WOS_THEME_ID)
        .single();
        
    if (error) {
        throw new Error('Failed to fetch current System 7 WOS theme CSS: ' + error.message);
    }
    
    return data;
}

export async function safeUpdateWOSThemeCSS(newCSS, description = 'CSS update') {
    console.log('\n🔒 Safe System 7 WOS CSS Update Process Starting...');
    
    try {
        // Step 1: Backup current version
        console.log('1️⃣  Backing up current System 7 WOS CSS...');
        const current = await fetchCurrentWOSThemeCSS();
        
        console.log(`📋 Current theme: ${current.name}`);
        console.log(`📝 Description: ${current.description}`);
        
        const timestamp = new Date().toISOString()
            .replace(/T/, '_')
            .replace(/:/g, '-')
            .replace(/\..+/, '');
            
        const backupFilename = `system7-wos-theme_${timestamp}.css`;
        const backupPath = path.join(cssBackupDir, backupFilename);
        const metadataPath = path.join(cssBackupDir, `system7-wos-theme_${timestamp}.json`);
        
        // Save CSS backup
        fs.writeFileSync(backupPath, current.css_content);
        
        // Save metadata
        const metadata = {
            timestamp: new Date().toISOString(),
            description,
            original_updated_at: current.updated_at,
            backup_file: backupFilename,
            theme_id: WOS_THEME_ID,
            theme_name: current.name
        };
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
        
        // Create/update latest backup
        const latestBackupPath = path.join(cssBackupDir, 'system7-wos-theme_latest-backup.css');
        fs.writeFileSync(latestBackupPath, current.css_content);
        
        console.log(`💾 System 7 WOS CSS backup created: ${backupFilename}`);
        
        // Step 2: Apply update to Supabase
        console.log('2️⃣  Applying System 7 WOS CSS update to Supabase...');
        const { error: updateError } = await supabase
            .from('wtaf_themes')
            .update({ 
                css_content: newCSS,
                updated_at: new Date().toISOString(),
                version: '2.0' // Increment version for authentic System 7 update
            })
            .eq('id', WOS_THEME_ID);
            
        if (updateError) {
            throw new Error('Failed to update System 7 WOS theme CSS: ' + updateError.message);
        }
        
        // Step 3: Save new version locally
        console.log('3️⃣  Saving new System 7 WOS CSS version locally...');
        const currentCSSPath = path.join(process.cwd(), 'themes', 'system7-wos', 'system7-wos.css');
        
        // Create directory if it doesn't exist
        const themeDir = path.dirname(currentCSSPath);
        if (!fs.existsSync(themeDir)) {
            fs.mkdirSync(themeDir, { recursive: true });
        }
        
        fs.writeFileSync(currentCSSPath, newCSS);
        
        console.log('✅ System 7 WOS CSS update completed successfully!');
        console.log(`📄 Description: ${description}`);
        console.log('🔗 Live immediately for WEBTOYS-OS users');
        
        return {
            success: true,
            backup_file: backupFilename,
            backup_path: backupPath
        };
        
    } catch (error) {
        console.error('❌ System 7 WOS CSS update failed:', error.message);
        console.log('🔄 Your backup is safe in the backups/css/ folder');
        throw error;
    }
}

export async function restoreWOSThemeCSS(backupFile) {
    console.log(`🔄 Restoring System 7 WOS theme CSS from ${backupFile}...`);
    
    try {
        const backupPath = path.join(cssBackupDir, backupFile);
        
        if (!fs.existsSync(backupPath)) {
            throw new Error(`Backup file not found: ${backupPath}`);
        }
        
        const backupCSS = fs.readFileSync(backupPath, 'utf8');
        
        const { error } = await supabase
            .from('wtaf_themes')
            .update({ 
                css_content: backupCSS,
                updated_at: new Date().toISOString()
            })
            .eq('id', WOS_THEME_ID);
            
        if (error) {
            throw new Error('Failed to restore System 7 WOS theme CSS: ' + error.message);
        }
        
        // Update local file
        const currentCSSPath = path.join(process.cwd(), 'themes', 'system7-wos', 'system7-wos.css');
        fs.writeFileSync(currentCSSPath, backupCSS);
        
        console.log('✅ System 7 WOS theme CSS restored successfully!');
        return { success: true };
        
    } catch (error) {
        console.error('❌ System 7 WOS CSS restore failed:', error.message);
        throw error;
    }
}

export async function listWOSCSSBackups() {
    const backups = fs.readdirSync(cssBackupDir)
        .filter(file => file.includes('system7-wos-theme') && file.endsWith('.css'))
        .map(file => {
            const stats = fs.statSync(path.join(cssBackupDir, file));
            const metadataFile = file.replace('.css', '.json');
            const metadataPath = path.join(cssBackupDir, metadataFile);
            
            let metadata = {};
            if (fs.existsSync(metadataPath)) {
                metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));
            }
            
            return {
                filename: file,
                created: stats.birthtime,
                size: stats.size,
                description: metadata.description || 'No description'
            };
        })
        .sort((a, b) => b.created - a.created);
        
    return backups;
}

// Quick utility to check current WOS theme status
export async function checkWOSThemeStatus() {
    try {
        const theme = await fetchCurrentWOSThemeCSS();
        console.log('📋 System 7 WOS Theme Status:');
        console.log(`   Name: ${theme.name}`);
        console.log(`   Description: ${theme.description}`);
        console.log(`   Last Updated: ${theme.updated_at}`);
        console.log(`   CSS Size: ${theme.css_content.length} characters`);
        return theme;
    } catch (error) {
        console.error('❌ Failed to check theme status:', error.message);
        throw error;
    }
}