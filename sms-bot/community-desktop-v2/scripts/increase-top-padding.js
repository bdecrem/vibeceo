#!/usr/bin/env node

import { fetchCurrentToyBoxOS, safeUpdateToyBoxOS } from './safe-update-wrapper.js';

async function increaseTopPadding() {
    try {
        console.log('📏 Increasing top padding for Clean Up function...');
        const current = await fetchCurrentToyBoxOS();
        let html = current.html_content;
        
        // Find and update the padding values in the cleanUpDesktop function
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
        
        console.log('✅ Updated Clean Up function with more top padding');
        
        // Safe update with automatic backup
        await safeUpdateToyBoxOS(html, 'Increased top padding for Clean Up function (80px top, 40px left)');
        
        console.log('🎉 Clean Up now uses more top padding!');
        console.log('📐 Top padding: 40px → 80px');
        console.log('📐 Left padding: 40px (unchanged)');
        
    } catch (error) {
        console.error('❌ Error increasing top padding:', error);
        process.exit(1);
    }
}

// Run the script
increaseTopPadding();