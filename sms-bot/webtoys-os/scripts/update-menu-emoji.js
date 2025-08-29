#!/usr/bin/env node

/**
 * Update the emoji in the upper left corner of the desktop menu bar
 * Using the safe wrapper system for automatic backup
 */

import { fetchCurrentDesktop, safeUpdateDesktop } from './safe-wrapper.js';

async function updateMenuEmoji() {
    try {
        // Step 1: Fetch current desktop from database
        console.log('📥 Fetching current desktop from database...');
        const current = await fetchCurrentDesktop(true); // true = test version
        let html = current.html_content;
        
        // Step 2: Find and replace the emoji in the menu bar
        console.log('🎮 Changing menu emoji to game controller...');
        
        // The current emoji appears to be in the menu-left section
        // Looking for patterns like: <span id="menu-emoji">🌟</span> or similar
        
        // First, try to find the current emoji pattern
        const emojiPatterns = [
            /<span id="menu-emoji">.*?<\/span>/,
            /<div id="menu-left">.*?<span[^>]*>(.)<\/span>/,
            /<div class="menu-left">.*?<span[^>]*>(.)<\/span>/,
            /<div id="menu-emoji"[^>]*>.*?<\/div>/
        ];
        
        let replaced = false;
        
        // Try specific ID-based replacement first
        if (html.includes('id="menu-emoji"')) {
            html = html.replace(/<span id="menu-emoji">.*?<\/span>/, '<span id="menu-emoji">🎮</span>');
            replaced = true;
            console.log('✅ Found and replaced emoji by ID');
        } 
        // Try menu-left section
        else if (html.includes('menu-left')) {
            // More targeted replacement in menu-left section
            const menuLeftPattern = /(<div[^>]*(?:id|class)="menu-left"[^>]*>[\s\S]*?<span[^>]*>)([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|🌟|⭐|✨)(<\/span>)/u;
            const match = html.match(menuLeftPattern);
            
            if (match) {
                html = html.replace(menuLeftPattern, '$1🎮$3');
                replaced = true;
                console.log('✅ Found and replaced emoji in menu-left section');
            }
        }
        
        // Fallback: Look for any emoji in the first part of the menu bar
        if (!replaced) {
            // Find the menu bar section and look for emojis
            const menuBarMatch = html.match(/<div[^>]*class="menu-bar"[^>]*>([\s\S]*?)<\/div>/);
            if (menuBarMatch) {
                const menuContent = menuBarMatch[1];
                // Find first emoji-like character
                const emojiMatch = menuContent.match(/([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|🌟|⭐|✨)/u);
                if (emojiMatch) {
                    html = html.replace(emojiMatch[0], '🎮');
                    replaced = true;
                    console.log('✅ Found and replaced emoji in menu bar');
                }
            }
        }
        
        if (!replaced) {
            console.log('⚠️  Could not find emoji to replace. Searching for alternative patterns...');
            
            // Last resort: Replace the first emoji we find in the menu area
            const beforeBody = html.substring(0, html.indexOf('<body') + 1000);
            const firstEmojiMatch = beforeBody.match(/([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}])/u);
            
            if (firstEmojiMatch) {
                html = html.replace(firstEmojiMatch[0], '🎮');
                console.log('✅ Replaced first emoji found in header area');
            } else {
                console.error('❌ No emoji found to replace');
                return;
            }
        }
        
        // Step 3: Use safe wrapper to update (automatic backup!)
        console.log('💾 Updating desktop with automatic backup...');
        await safeUpdateDesktop(
            html, 
            'Changed menu bar emoji to game controller 🎮',
            true  // true = update test version
        );
        
        console.log('✨ Done! The menu bar now shows a game controller emoji.');
        
    } catch (error) {
        console.error('❌ Failed to update menu emoji:', error.message);
        process.exit(1);
    }
}

// Run the update
updateMenuEmoji();