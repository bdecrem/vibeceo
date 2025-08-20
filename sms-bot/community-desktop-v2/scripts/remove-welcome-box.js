#!/usr/bin/env node

import { fetchCurrentToyBoxOS, safeUpdateToyBoxOS } from './safe-update-wrapper.js';

async function removeWelcomeBox() {
    try {
        console.log('📦 Removing Welcome Box from ToyBox OS...');
        
        // Fetch current HTML
        const current = await fetchCurrentToyBoxOS();
        let htmlContent = current.html_content;
        
        // 1. Remove the Welcome Box HTML (lines ~259-271)
        console.log('1️⃣  Removing Welcome Box HTML...');
        const welcomeBoxPattern = /<!-- Welcome Box -->\s*<div class="welcome-box"[^>]*id="welcomeBox"[^>]*>[\s\S]*?<\/div>\s*(?=<!-- Windowed Apps -->|<div)/g;
        htmlContent = htmlContent.replace(welcomeBoxPattern, '');
        
        // 2. Remove the CSS for .welcome-box (lines ~116-153)
        console.log('2️⃣  Removing Welcome Box CSS...');
        const welcomeBoxCSSPattern = /\.welcome-box\s*\{[^}]*\}[\s\S]*?\.welcome-box\s+button:active\s*\{[^}]*\}/g;
        htmlContent = htmlContent.replace(welcomeBoxCSSPattern, '');
        
        // 3. Remove any code that closes the welcome box in openWindowedApp function
        console.log('3️⃣  Removing Welcome Box close logic...');
        const closeWelcomePattern = /\/\/ Close welcome box if open\s*const welcomeBox[\s\S]*?welcomeBox\.style\.display = 'none';\s*\}/g;
        htmlContent = htmlContent.replace(closeWelcomePattern, '');
        
        // 4. Remove the onclick handler from Get Started button references
        const getStartedPattern = /onclick="document\.getElementById\('welcomeBox'\)\.style\.display='none'"/g;
        htmlContent = htmlContent.replace(getStartedPattern, '');
        
        // 5. Clean up any remaining references to welcomeBox
        const welcomeBoxReferences = /document\.getElementById\('welcomeBox'\)[^;]*;/g;
        htmlContent = htmlContent.replace(welcomeBoxReferences, '');
        
        // Safe update with automatic backup
        await safeUpdateToyBoxOS(
            htmlContent, 
            'Removed Welcome Box entirely (HTML, CSS, and JavaScript)'
        );
        
        console.log('\n✅ Welcome Box removed successfully!');
        console.log('   - Removed HTML element');
        console.log('   - Removed CSS styles');
        console.log('   - Removed JavaScript references');
        
    } catch (error) {
        console.error('❌ Failed to remove Welcome Box:', error.message);
        process.exit(1);
    }
}

// Run the removal
removeWelcomeBox();