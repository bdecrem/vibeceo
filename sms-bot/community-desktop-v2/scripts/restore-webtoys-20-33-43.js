#!/usr/bin/env node

/**
 * Restore WEBTOYS-OS from the older backup: 2025-08-23_20-33-43
 * Going back further to this version
 */

import { restoreWebtoysFromBackup } from './safe-webtoys-update-wrapper.js';
import * as path from 'path';
import * as fs from 'fs';

async function restoreWebtoys20_33_43() {
    try {
        const backupFile = path.join(process.cwd(), '..', 'backups', 'webtoys-os_2025-08-23_20-33-43.html');
        const metadataFile = path.join(process.cwd(), '..', 'backups', 'webtoys-os_2025-08-23_20-33-43.json');
        
        console.log('🔄 Restoring WEBTOYS-OS from older backup: 2025-08-23_20-33-43');
        
        // Read and display metadata
        if (fs.existsSync(metadataFile)) {
            const metadata = JSON.parse(fs.readFileSync(metadataFile, 'utf8'));
            console.log(`📋 Backup description: ${metadata.description}`);
            console.log(`📊 File size: ${metadata.file_size} characters`);
            console.log(`💾 Backed up at: ${metadata.backed_up_at}`);
        }
        
        console.log('📦 Loading backup file...');
        
        if (!fs.existsSync(backupFile)) {
            throw new Error(`Backup file not found: ${backupFile}`);
        }
        
        // Restore using the safe update wrapper
        await restoreWebtoysFromBackup(backupFile);
        
        console.log('✅ WEBTOYS-OS restored successfully from 20-33-43 backup!');
        console.log('🔗 Live at: https://webtoys.ai/public/webtoys-os');
        console.log('📝 This is the older version from 20:33:43');
        
    } catch (error) {
        console.error('❌ Error restoring from backup:', error.message);
        process.exit(1);
    }
}

// Run the restore
restoreWebtoys20_33_43();