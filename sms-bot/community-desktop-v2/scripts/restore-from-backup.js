#!/usr/bin/env node

import { safeUpdateToyBoxOS } from './safe-update-wrapper.js';
import * as fs from 'fs';

async function restoreFromBackup() {
    try {
        const backupFile = 'toybox-os_2025-08-20_18-41-09.html';
        const backupPath = `/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot/community-desktop-v2/backups/${backupFile}`;
        
        console.log(`🔄 Restoring ToyBox OS from backup: ${backupFile}`);
        console.log('📋 This backup contains: Clean Up functionality with increased top padding');
        
        if (!fs.existsSync(backupPath)) {
            throw new Error(`Backup file not found: ${backupPath}`);
        }
        
        const backupHTML = fs.readFileSync(backupPath, 'utf8');
        
        console.log('📦 Backup file loaded successfully');
        console.log(`📊 File size: ${backupHTML.length} characters`);
        
        // Restore to Supabase with safe update
        await safeUpdateToyBoxOS(backupHTML, `Restored from backup: ${backupFile} (Clean Up functionality)`);
        
        console.log('✅ ToyBox OS restored successfully!');
        console.log('🔗 Live at: https://webtoys.ai/public/toybox-os');
        console.log('📋 Clean Up functionality should now be working under Special menu');
        
    } catch (error) {
        console.error('❌ Error restoring from backup:', error);
        process.exit(1);
    }
}

// Run the script
restoreFromBackup();