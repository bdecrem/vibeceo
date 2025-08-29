#!/usr/bin/env node

/**
 * Fix: Update the correct emoji in the menu-logo (upper left corner)
 * The previous script changed the wrong emoji
 */

import { fetchCurrentDesktop, safeUpdateDesktop } from './safe-wrapper.js';

async function fixMenuEmoji() {
    try {
        console.log('📥 Fetching current desktop from database...');
        const current = await fetchCurrentDesktop(true);
        let html = current.html_content;
        
        console.log('🎮 Fixing menu-logo emoji to game controller...');
        
        // The correct target is: <span class="menu-logo">🌟 WebtoysOS</span>
        // Replace the star emoji with game controller
        html = html.replace(
            /<span class="menu-logo">🌟 WebtoysOS<\/span>/,
            '<span class="menu-logo">🎮 WebtoysOS</span>'
        );
        
        // Also revert the profile emoji back to the user icon if it was changed
        html = html.replace(
            /<span id="profile-emoji">🎮<\/span>/,
            '<span id="profile-emoji">👤</span>'
        );
        
        console.log('💾 Updating desktop with automatic backup...');
        await safeUpdateDesktop(
            html, 
            'Fixed: Changed menu-logo emoji (upper left) to game controller',
            true
        );
        
        console.log('✅ Fixed! The upper left corner now shows: 🎮 WebtoysOS');
        
    } catch (error) {
        console.error('❌ Failed to fix menu emoji:', error.message);
        process.exit(1);
    }
}

fixMenuEmoji();