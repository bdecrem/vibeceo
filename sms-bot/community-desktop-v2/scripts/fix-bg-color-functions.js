#!/usr/bin/env node

import { fetchCurrentToyBoxOS, safeUpdateToyBoxOS } from './safe-update-wrapper.js';

async function fixBgColorFunctions() {
    try {
        console.log('🔧 Adding the missing background color functions...');
        const current = await fetchCurrentToyBoxOS();
        let html = current.html_content;
        
        // Check if functions already exist
        if (html.includes('async function changeBgColor()')) {
            console.log('✅ Background color functions already exist');
            return;
        }
        
        // Add the background color functions before the Special menu functions
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
        }
        `;
        
        // Insert before the Special menu functions
        html = html.replace(
            /\/\/ Special menu dropdown functionality/,
            `${bgColorFunctions}
        
        // Special menu dropdown functionality`
        );
        
        console.log('✅ Added background color functions');
        
        // Safe update with automatic backup
        await safeUpdateToyBoxOS(html, 'Added missing background color functions');
        
        console.log('🎉 Background color functions added successfully!');
        
    } catch (error) {
        console.error('❌ Error adding background color functions:', error);
        process.exit(1);
    }
}

// Run the script
fixBgColorFunctions();