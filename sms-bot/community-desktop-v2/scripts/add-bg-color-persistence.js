#!/usr/bin/env node

import { fetchCurrentToyBoxOS, safeUpdateToyBoxOS } from './safe-update-wrapper.js';

async function addBgColorPersistence() {
    try {
        console.log('🎨 Adding background color persistence...');
        const current = await fetchCurrentToyBoxOS();
        let html = current.html_content;
        
        // Find the BG Color app and enhance it with persistence
        const oldBgColorApp = /onclick="document\.body\.style\.background='#'\+Math\.floor\(Math\.random\(\)\*16777215\)\.toString\(16\)"/;
        
        const newBgColorApp = `onclick="changeBgColor()"`;
        
        if (html.match(oldBgColorApp)) {
            html = html.replace(oldBgColorApp, newBgColorApp);
            console.log('✅ Updated BG Color app to use persistent function');
        } else {
            console.log('⚠️  BG Color app pattern not found - may already be updated');
        }
        
        // Add the persistent background color functions
        const bgColorFunctions = `
        
        // Persistent Background Color functionality
        async function changeBgColor() {
            // Generate random color
            const randomColor = '#' + Math.floor(Math.random() * 16777215).toString(16);
            
            // Apply to body
            document.body.style.background = randomColor;
            
            // Save to database using same ZAD system
            await saveBgColor(randomColor);
            
            console.log('🎨 Background color changed to:', randomColor);
        }
        
        async function saveBgColor(color) {
            try {
                const response = await fetch('/api/zad/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        app_id: 'toybox-desktop-layout',
                        participant_id: 'global',
                        action_type: 'bg_color',
                        content_data: {
                            backgroundColor: color,
                            lastModified: new Date().toISOString(),
                            modifiedBy: 'user'
                        }
                    })
                });
                
                if (response.ok) {
                    console.log('✅ Background color saved:', color);
                } else {
                    console.error('❌ Failed to save background color');
                }
            } catch (error) {
                console.error('❌ Error saving background color:', error);
            }
        }
        
        async function loadBgColor() {
            try {
                const response = await fetch('/api/zad/load?app_id=toybox-desktop-layout&action_type=bg_color&participant_id=global');
                
                if (!response.ok) {
                    console.log('No saved background color found, using default');
                    return;
                }
                
                const result = await response.json();
                const bgData = result && result.length > 0 ? result[0] : null;
                
                if (bgData && bgData.content_data && bgData.content_data.backgroundColor) {
                    const savedColor = bgData.content_data.backgroundColor;
                    document.body.style.background = savedColor;
                    console.log('✅ Background color restored:', savedColor);
                }
            } catch (error) {
                console.error('❌ Error loading background color:', error);
            }
        }`;
        
        // Add the functions before the existing restoration function
        html = html.replace(
            /\/\/ Function to restore hidden icons/,
            `${bgColorFunctions}
        
        // Function to restore hidden icons`
        );
        
        // Add loadBgColor to the initialization
        html = html.replace(
            /await loadIconPositions\(\);/,
            `await loadIconPositions();
                await loadBgColor();`
        );
        
        console.log('✅ Added background color persistence functions');
        console.log('✅ Added loadBgColor to initialization');
        
        // Safe update with automatic backup
        await safeUpdateToyBoxOS(html, 'Added background color persistence using ZAD system');
        
        console.log('🎉 Background color persistence added!');
        console.log('📋 How it works:');
        console.log('   - Click BG Color → Random color applied and saved');
        console.log('   - Uses same ZAD system (toybox-desktop-layout app_id)');
        console.log('   - Page reload → Saved background color restored');
        console.log('   - Shared for all users (global participant_id)');
        
    } catch (error) {
        console.error('❌ Error adding background color persistence:', error);
        process.exit(1);
    }
}

// Run the script
addBgColorPersistence();