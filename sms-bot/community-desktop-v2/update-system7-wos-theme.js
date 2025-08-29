#!/usr/bin/env node

/**
 * System 7 WOS Theme Update Script
 * 
 * Uses the safe CSS wrapper to update the System 7 WOS theme
 * with automatic backups and rollback capability
 */

import { safeUpdateWOSThemeCSS, checkWOSThemeStatus } from './scripts/safe-css-wrapper-wos.js';

async function updateSystem7WOSTheme(newCSS, description) {
    try {
        console.log('🎨 System 7 WOS Theme Update Starting...');
        
        // Check current status
        await checkWOSThemeStatus();
        
        // Apply update with safe wrapper
        const result = await safeUpdateWOSThemeCSS(newCSS, description);
        
        console.log('🎉 Theme update completed successfully!');
        console.log(`💾 Backup available at: ${result.backup_file}`);
        
        return result;
        
    } catch (error) {
        console.error('❌ Theme update failed:', error.message);
        throw error;
    }
}

export { updateSystem7WOSTheme };