#!/usr/bin/env node

/**
 * Example: How to safely fix ToyBox OS with automatic backups
 * 
 * This shows the new pattern for making ANY changes to ToyBox OS
 */

import { fetchCurrentToyBoxOS, safeUpdateToyBoxOS } from './safe-update-wrapper.js';

async function exampleFix() {
    try {
        console.log('🔧 Example Fix: Changing background color...');
        
        // Fetch current HTML
        const current = await fetchCurrentToyBoxOS();
        let htmlContent = current.html_content;
        
        // Make your modifications
        htmlContent = htmlContent.replace(
            'background: #008080;',
            'background: #4a90e2;'  // Change to blue
        );
        
        // Safe update with automatic backup
        await safeUpdateToyBoxOS(
            htmlContent, 
            'Changed background from teal to blue'
        );
        
        console.log('\n✨ Fix applied successfully with backup!');
        
    } catch (error) {
        console.error('❌ Fix failed:', error.message);
        process.exit(1);
    }
}

// Uncomment to run:
// exampleFix();