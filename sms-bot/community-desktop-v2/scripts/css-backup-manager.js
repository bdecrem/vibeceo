#!/usr/bin/env node

/**
 * CSS Backup Manager for System 7 Theme
 * 
 * Utility script for managing CSS theme backups
 * 
 * Usage:
 *   node css-backup-manager.js backup "description"   # Create manual backup
 *   node css-backup-manager.js list                   # List all backups
 *   node css-backup-manager.js restore filename.css   # Restore from backup
 */

import { fetchCurrentThemeCSS, safeUpdateThemeCSS, restoreThemeCSS, listCSSBackups } from './safe-css-wrapper.js';

const command = process.argv[2];
const argument = process.argv[3];

async function main() {
    try {
        switch (command) {
            case 'backup':
                await createManualBackup(argument || 'Manual backup');
                break;
                
            case 'list':
                await listBackups();
                break;
                
            case 'restore':
                if (!argument) {
                    console.error('❌ Please specify backup filename to restore');
                    process.exit(1);
                }
                await restoreBackup(argument);
                break;
                
            default:
                showUsage();
                break;
        }
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

async function createManualBackup(description) {
    console.log('📦 Creating manual CSS backup...');
    const current = await fetchCurrentThemeCSS();
    await safeUpdateThemeCSS(current.css_content, description);
    console.log('✅ Manual backup created successfully!');
}

async function listBackups() {
    console.log('📋 Available CSS backups:');
    const backups = await listCSSBackups();
    
    if (backups.length === 0) {
        console.log('No backups found.');
        return;
    }
    
    console.log('\n' + '='.repeat(80));
    backups.forEach((backup, index) => {
        console.log(`${index + 1}. ${backup.filename}`);
        console.log(`   Created: ${backup.created.toLocaleString()}`);
        console.log(`   Size: ${backup.size} bytes`);
        console.log(`   Description: ${backup.description}`);
        console.log('   ' + '-'.repeat(60));
    });
}

async function restoreBackup(filename) {
    console.log(`🔄 Restoring CSS from backup: ${filename}`);
    await restoreThemeCSS(filename);
    console.log('✅ CSS restored successfully!');
}

function showUsage() {
    console.log('CSS Backup Manager for System 7 Theme');
    console.log('');
    console.log('Usage:');
    console.log('  node css-backup-manager.js backup "description"   # Create manual backup');
    console.log('  node css-backup-manager.js list                   # List all backups');
    console.log('  node css-backup-manager.js restore filename.css   # Restore from backup');
    console.log('');
    console.log('Examples:');
    console.log('  node css-backup-manager.js backup "Before major changes"');
    console.log('  node css-backup-manager.js restore system7-theme_2025-08-20_18-30-00.css');
}

// Run the script
main();