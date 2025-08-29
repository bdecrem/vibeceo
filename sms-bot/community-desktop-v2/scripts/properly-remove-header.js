#!/usr/bin/env node

/**
 * PROPERLY remove title bar and header using safe-update-wrapper
 */

import { fetchCurrentToyBoxOS, safeUpdateToyBoxOS } from './safe-update-wrapper.js';

async function properlyRemoveHeader() {
    try {
        console.log('🧹 Properly removing title bar and System Status header...\n');
        
        // Get current HTML using the safe wrapper
        const current = await fetchCurrentToyBoxOS();
        let html = current.html_content;
        
        // 1. Remove the entire Classic Mac Title Bar section
        const titleBarPattern = /<!-- Classic Mac Title Bar -->[\s\S]*?<\/div>\s*(?=<div class="main-content">)/;
        html = html.replace(titleBarPattern, '');
        console.log('✓ Removing Classic Mac Title Bar');
        
        // 2. Remove the System Status header text
        html = html.replace('<div class="system-header">System Status</div>', '');
        console.log('✓ Removing System Status header');
        
        // 3. Also remove the entire header div with window controls if it exists
        const headerPattern = /<div class="header">[\s\S]*?<\/div>\s*(?=<div class="main-content">)/;
        html = html.replace(headerPattern, '');
        console.log('✓ Removing main header section');
        
        // Use the safe update wrapper to save (automatic backup!)
        await safeUpdateToyBoxOS(html, 'Removed title bar and System Status header, keeping issue count and login info');
        
        console.log('\n✅ PROPERLY removed using safe-update-wrapper!');
        console.log('Automatic backup was created');
        console.log('Kept: Issue count and login info');
        console.log('\nRefresh: https://webtoys.ai/public/toybox-issue-tracker');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

properlyRemoveHeader();