#!/usr/bin/env node

/**
 * Backup current desktop before applying Modern Playground theme
 */

import { fetchCurrentDesktop, createBackup } from './safe-wrapper.js';

async function backupDesktop() {
    try {
        console.log('🎨 Preparing to transform desktop to Modern Playground theme...');
        console.log('📥 First, creating backup of current desktop...');
        
        const current = await fetchCurrentDesktop(true); // true = test version
        const backupPath = await createBackup(
            current.html_content, 
            'toybox-os-v3-test',
            'Before Modern Playground theme transformation'
        );
        
        console.log('✅ Backup created successfully!');
        console.log(`📁 Backup location: ${backupPath}`);
        console.log('🎨 Safe to proceed with Modern Playground transformation');
        
    } catch (error) {
        console.error('❌ Failed to create backup:', error.message);
        console.error('⚠️  DO NOT PROCEED without a backup!');
        process.exit(1);
    }
}

backupDesktop();