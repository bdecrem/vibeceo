#!/usr/bin/env node

import { fetchCurrentToyBoxOS, safeUpdateToyBoxOS } from './safe-update-wrapper.js';

async function fixAppleLogo() {
    try {
        console.log('🍎 Replacing emoji Apple with real Apple logo...');
        const current = await fetchCurrentToyBoxOS();
        let html = current.html_content;
        
        // Replace the emoji apple (🍎) with the classic Apple logo character
        // The Apple logo from classic Mac fonts is Unicode F8FF (private use area)
        // This is the actual Apple logo character used in System 7
        html = html.replace(
            /<div class="menu-title apple"[^>]*>🍎<\/div>/,
            '<div class="menu-title apple"></div>'
        );
        
        console.log('✅ Replaced emoji apple with classic Apple logo character');
        
        // Safe update with automatic backup
        await safeUpdateToyBoxOS(html, 'Replaced emoji apple with classic Apple logo character (U+F8FF)');
        
        console.log('🎉 Apple logo updated in ToyBox OS menu bar');
        console.log('📝 Note: The Apple logo character (U+F8FF) should display as  if the Chicago/Apple font is available');
        
    } catch (error) {
        console.error('❌ Error fixing Apple logo:', error);
        process.exit(1);
    }
}

// Run the script
fixAppleLogo();