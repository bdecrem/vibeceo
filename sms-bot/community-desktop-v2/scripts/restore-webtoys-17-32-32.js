#!/usr/bin/env node

/**
 * Restore WEBTOYS-OS from the backup: 2025-08-23_17-32-32
 * Going back even further to this version
 */

import { restoreWebtoysFromBackup } from './safe-webtoys-update-wrapper.js';
import * as path from 'path';
import * as fs from 'fs';

async function restoreWebtoys17_32_32() {
    try {
        const backupFile = path.join(process.cwd(), '..', 'backups', 'webtoys-os_2025-08-23_17-32-32.html');
        const metadataFile = path.join(process.cwd(), '..', 'backups', 'webtoys-os_2025-08-23_17-32-32.json');
        
        console.log('🔄 Restoring WEBTOYS-OS from backup: 2025-08-23_17-32-32');
        
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
        
        console.log('✅ WEBTOYS-OS restored successfully from 17-32-32 backup!');
        console.log('🔗 Live at: https://webtoys.ai/public/webtoys-os');
        console.log('📝 This is the version from 17:32:32');
        
    } catch (error) {
        console.error('❌ Error restoring from backup:', error.message);
        process.exit(1);
    }
}

// Run the restore
restoreWebtoys17_32_32();