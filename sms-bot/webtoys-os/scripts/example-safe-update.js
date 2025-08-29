#!/usr/bin/env node

/**
 * Example: How to safely update WebtoysOS desktop
 * 
 * This demonstrates the proper way to modify the desktop HTML
 * using the safe wrapper system.
 */

import { fetchCurrentDesktop, safeUpdateDesktop } from './safe-wrapper.js';

async function addNewIconToDesktop() {
    try {
        // Step 1: Fetch current desktop from database
        console.log('📥 Fetching current desktop from database...');
        const current = await fetchCurrentDesktop(true); // true = test version
        let html = current.html_content;
        
        // Step 2: Make your modifications
        console.log('✏️  Adding new icon to desktop...');
        
        // Find where icons are defined
        const iconContainerPattern = /<div id="desktop-icons"[^>]*>([\s\S]*?)<\/div>\s*<!--\s*end desktop-icons/;
        const match = html.match(iconContainerPattern);
        
        if (!match) {
            // Fallback: Add before closing body tag
            const newIcon = `
            <div class="desktop-icon" onclick="alert('Hello from new app!')">
                <span class="icon-image">🆕</span>
                <span class="icon-label">New App</span>
            </div>`;
            
            html = html.replace('</body>', `${newIcon}\n</body>`);
        } else {
            // Add icon to existing container
            const newIcon = `
                <div class="desktop-icon" onclick="alert('Hello from new app!')">
                    <span class="icon-image">🆕</span>
                    <span class="icon-label">New App</span>
                </div>`;
            
            const updatedIcons = match[1] + newIcon;
            html = html.replace(match[0], `<div id="desktop-icons">${updatedIcons}</div><!-- end desktop-icons`);
        }
        
        // Step 3: Use safe wrapper to update (automatic backup!)
        console.log('💾 Updating desktop with automatic backup...');
        await safeUpdateDesktop(
            html, 
            'Added New App icon to desktop',
            true  // true = update test version, false = production
        );
        
        console.log('✨ Done! Check the desktop to see your new icon.');
        
    } catch (error) {
        console.error('❌ Failed to update desktop:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    addNewIconToDesktop();
}

// Export for use in other scripts
export { addNewIconToDesktop };