#!/usr/bin/env node

/**
 * Safe CSS Update Wrapper for System 7 Theme
 * 
 * This wrapper ensures ANY update to the System 7 theme CSS:
 * 1. Backs up current version first
 * 2. Applies the update
 * 3. Keeps backup history
 * 
 * Usage in your scripts:
 *   import { safeUpdateThemeCSS, fetchCurrentThemeCSS } from './safe-css-wrapper.js';
 *   await safeUpdateThemeCSS(modifiedCSS, 'Description of changes');
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
const THEME_ID = '2ec89c02-d424-4cf6-81f1-371ca6b9afcf'; // System 7 theme ID

// Ensure CSS backups directory exists
const cssBackupDir = path.join(process.cwd(), 'backups', 'css');
if (!fs.existsSync(cssBackupDir)) {
    fs.mkdirSync(cssBackupDir, { recursive: true });
}

export async function fetchCurrentThemeCSS() {
    const { data, error } = await supabase
        .from('wtaf_themes')
        .select('css_content, updated_at')
        .eq('id', THEME_ID)
        .single();
        
    if (error) {
        throw new Error('Failed to fetch current theme CSS: ' + error.message);
    }
    
    return data;
}

export async function safeUpdateThemeCSS(newCSS, description = 'CSS update') {
    console.log('\n🔒 Safe CSS Update Process Starting...');
    
    try {
        // Step 1: Backup current version
        console.log('1️⃣  Backing up current CSS...');
        const current = await fetchCurrentThemeCSS();
        
        const timestamp = new Date().toISOString()
            .replace(/T/, '_')
            .replace(/:/g, '-')
            .replace(/\..+/, '');
            
        const backupFilename = `system7-theme_${timestamp}.css`;
        const backupPath = path.join(cssBackupDir, backupFilename);
        const metadataPath = path.join(cssBackupDir, `system7-theme_${timestamp}.json`);
        
        // Save CSS backup
        fs.writeFileSync(backupPath, current.css_content);
        
        // Save metadata
        const metadata = {
            timestamp: new Date().toISOString(),
            description,
            original_updated_at: current.updated_at,
            backup_file: backupFilename,
            theme_id: THEME_ID
        };
        fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
        
        // Create/update latest backup
        const latestBackupPath = path.join(cssBackupDir, 'system7-theme_latest-backup.css');
        fs.writeFileSync(latestBackupPath, current.css_content);
        
        console.log(`💾 CSS backup created: ${backupFilename}`);
        
        // Step 2: Apply update to Supabase
        console.log('2️⃣  Applying CSS update to Supabase...');
        const { error: updateError } = await supabase
            .from('wtaf_themes')
            .update({ 
                css_content: newCSS,
                updated_at: new Date().toISOString()
            })
            .eq('id', THEME_ID);
            
        if (updateError) {
            throw new Error('Failed to update theme CSS: ' + updateError.message);
        }
        
        // Step 3: Save new version locally
        console.log('3️⃣  Saving new CSS version locally...');
        const currentCSSPath = path.join(process.cwd(), 'themes', 'system7', 'system7.css');
        fs.writeFileSync(currentCSSPath, newCSS);
        
        console.log('✅ CSS update completed successfully!');
        console.log(`📄 Description: ${description}`);
        console.log('🔗 Live at: https://webtoys.ai/public/toybox-os');
        
        return {
            success: true,
            backup_file: backupFilename,
            backup_path: backupPath
        };
        
    } catch (error) {
        console.error('❌ CSS update failed:', error.message);
        throw error;
    }
}

export async function restoreThemeCSS(backupFile) {
    console.log(`🔄 Restoring theme CSS from ${backupFile}...`);
    
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
            .eq('id', THEME_ID);
            
        if (error) {
            throw new Error('Failed to restore theme CSS: ' + error.message);
        }
        
        // Update local file
        const currentCSSPath = path.join(process.cwd(), 'themes', 'system7', 'system7.css');
        fs.writeFileSync(currentCSSPath, backupCSS);
        
        console.log('✅ Theme CSS restored successfully!');
        return { success: true };
        
    } catch (error) {
        console.error('❌ CSS restore failed:', error.message);
        throw error;
    }
}

export async function listCSSBackups() {
    const backups = fs.readdirSync(cssBackupDir)
        .filter(file => file.endsWith('.css'))
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