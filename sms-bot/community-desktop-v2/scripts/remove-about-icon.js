#!/usr/bin/env node

import { fetchCurrentToyBoxOS, safeUpdateToyBoxOS } from './safe-update-wrapper.js';

async function removeAboutIcon() {
    try {
        console.log('📋 Fetching current ToyBox OS HTML...');
        const current = await fetchCurrentToyBoxOS();
        let html = current.html_content;
        
        // Pattern to match the About icon
        const aboutIconPattern = /<div class="desktop-icon" style="left: 20px; top: 220px" [\s\S]*?onclick="alert\('ToyBox OS v1\.0[\s\S]*?<\/div>/g;
        
        console.log('🔍 Looking for About icon...');
        
        // Check if the pattern exists
        if (aboutIconPattern.test(html)) {
            // Remove the About icon
            html = html.replace(aboutIconPattern, '');
            
            console.log('✅ About icon found and removed');
            
            // Safe update with automatic backup
            await safeUpdateToyBoxOS(html, 'Removed About icon from desktop');
            
            console.log('🎉 Successfully removed About icon from ToyBox OS desktop');
        } else {
            console.log('ℹ️  About icon not found in current HTML');
        }
        
    } catch (error) {
        console.error('❌ Error removing About icon:', error);
        process.exit(1);
    }
}

// Run the script
removeAboutIcon();