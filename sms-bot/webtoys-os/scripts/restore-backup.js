#!/usr/bin/env node

/**
 * Restore WebtoysOS from backup
 * 
 * Usage:
 *   node restore-backup.js                    - Restore from latest backup
 *   node restore-backup.js <filename>         - Restore from specific backup
 *   node restore-backup.js latest --prod      - Restore production from latest
 */

import { restoreFromBackup, listBackups } from './safe-wrapper.js';
import readline from 'readline';
import path from 'path';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Parse arguments
const backupArg = process.argv[2];
const isProd = process.argv.includes('--prod');
const isTest = !isProd;
const targetEnv = isProd ? 'PRODUCTION' : 'TEST';

async function main() {
    try {
        // Determine which backup to use
        let backupFile;
        
        if (!backupArg || backupArg === 'latest') {
            // Use latest backup
            const appSlug = isTest ? 'toybox-os-v3-test' : 'toybox-os-v3';
            backupFile = `${appSlug}_latest-backup.html`;
            console.log(`\n🔄 Restoring ${targetEnv} from latest backup...`);
        } else if (backupArg === 'list') {
            // List backups and let user choose
            const backups = listBackups();
            
            if (backups.length === 0) {
                console.log('❌ No backups found');
                process.exit(1);
            }
            
            console.log('\n📚 Available backups:\n');
            backups.forEach((backup, index) => {
                console.log(`${index + 1}. ${backup.file}`);
                console.log(`   ${backup.description}`);
                console.log(`   ${backup.timestamp}\n`);
            });
            
            const answer = await new Promise(resolve => {
                rl.question('Enter backup number to restore (or 0 to cancel): ', resolve);
            });
            
            const index = parseInt(answer) - 1;
            if (index < 0 || index >= backups.length) {
                console.log('❌ Cancelled');
                process.exit(0);
            }
            
            backupFile = backups[index].file;
            console.log(`\n🔄 Restoring ${targetEnv} from ${backupFile}...`);
        } else {
            // Use specified backup
            backupFile = backupArg;
            console.log(`\n🔄 Restoring ${targetEnv} from ${backupFile}...`);
        }
        
        // Confirm for production
        if (isProd) {
            console.warn('\n⚠️  WARNING: You are about to restore PRODUCTION WebtoysOS!');
            console.warn('   This will immediately affect all users.');
            
            const confirm = await new Promise(resolve => {
                rl.question('Type "yes" to continue: ', resolve);
            });
            
            if (confirm.toLowerCase() !== 'yes') {
                console.log('❌ Restore cancelled');
                process.exit(0);
            }
        }
        
        // Perform the restore
        await restoreFromBackup(backupFile, isTest);
        
        console.log('\n✅ Restore completed successfully!');
        const url = isTest 
            ? 'https://webtoys.ai/public/toybox-os-v3-test'
            : 'https://webtoys.ai/public/toybox-os-v3';
        console.log(`🌐 View at: ${url}`);
        
    } catch (error) {
        console.error('\n❌ Restore failed:', error.message);
        process.exit(1);
    } finally {
        rl.close();
    }
}

main();