#!/usr/bin/env node

import { fetchCurrentToyBoxOS, safeUpdateToyBoxOS } from './safe-update-wrapper.js';

async function removePaintIcon() {
    try {
        console.log('🎨 Removing Paint icon from ToyBox OS desktop...');
        
        // Fetch current HTML
        const current = await fetchCurrentToyBoxOS();
        let htmlContent = current.html_content;
        
        // Find and remove the Paint icon (the one that says "Community Paint coming soon!")
        // This is around line 280-284 in the HTML
        const paintIconPattern = /<div class="desktop-icon"[^>]*>\s*<div class="icon">🎨<\/div>\s*<div class="label">Paint<\/div>\s*<\/div>/g;
        
        // Count how many Paint icons we're removing
        const matches = htmlContent.match(paintIconPattern);
        const matchCount = matches ? matches.length : 0;
        
        if (matchCount === 0) {
            console.log('⚠️ No Paint icon found to remove');
            return;
        }
        
        // Remove all Paint icons
        htmlContent = htmlContent.replace(paintIconPattern, '');
        
        console.log(`Found and removing ${matchCount} Paint icon(s)`);
        
        // Safe update with automatic backup
        await safeUpdateToyBoxOS(
            htmlContent, 
            `Removed ${matchCount} Paint icon(s) from desktop`
        );
        
        console.log('\n✅ Paint icon removed successfully!');
        
    } catch (error) {
        console.error('❌ Failed to remove Paint icon:', error.message);
        process.exit(1);
    }
}

// Run the removal
removePaintIcon();