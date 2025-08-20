#!/usr/bin/env node

import { fetchCurrentToyBoxOS, safeUpdateToyBoxOS } from './safe-update-wrapper.js';

async function restoreTopPadding() {
    try {
        console.log('📏 Restoring 80px top padding for Clean Up function...');
        const current = await fetchCurrentToyBoxOS();
        let html = current.html_content;
        
        // Update the padding values in the cleanUpDesktop function
        html = html.replace(
            /const padding = 40; \/\/ Top and left padding/,
            'const paddingTop = 80; // Top padding\n            const paddingLeft = 40; // Left padding'
        );
        
        // Update the x and y calculation to use different padding values
        html = html.replace(
            /const x = padding \+ \(currentCol \* \(iconWidth \+ spacingX\)\);/,
            'const x = paddingLeft + (currentCol * (iconWidth + spacingX));'
        );
        
        html = html.replace(
            /const y = padding \+ \(currentRow \* \(iconHeight \+ spacingY\)\);/,
            'const y = paddingTop + (currentRow * (iconHeight + spacingY));'
        );
        
        console.log('✅ Updated Clean Up function with 80px top padding');
        
        // Safe update with automatic backup
        await safeUpdateToyBoxOS(html, 'Restored 80px top padding for Clean Up function');
        
        console.log('🎉 Top padding restored!');
        console.log('📐 Top padding: 40px → 80px');
        console.log('📐 Left padding: 40px (unchanged)');
        console.log('🔗 Live at: https://webtoys.ai/public/toybox-os');
        
    } catch (error) {
        console.error('❌ Error restoring top padding:', error);
        process.exit(1);
    }
}

// Run the script
restoreTopPadding();