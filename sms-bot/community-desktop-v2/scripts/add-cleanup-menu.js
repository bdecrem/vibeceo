#!/usr/bin/env node

import { fetchCurrentToyBoxOS, safeUpdateToyBoxOS } from './safe-update-wrapper.js';

async function addCleanupMenu() {
    try {
        console.log('🧹 Adding Clean Up menu item under Special...');
        const current = await fetchCurrentToyBoxOS();
        let html = current.html_content;
        
        // First, add the dropdown menu HTML structure for Special menu
        // Find the Special menu item and add dropdown functionality
        html = html.replace(
            /<div class="menu-title">Special<\/div>/,
            `<div class="menu-title" onclick="toggleSpecialMenu(event)">Special
                <div class="dropdown-menu" id="specialMenu" style="display: none;">
                    <div class="menu-item" onclick="cleanUpDesktop(event)">Clean Up</div>
                </div>
            </div>`
        );
        
        // Add the cleanup JavaScript function before the closing </script> tag
        const cleanupJS = `
        
        // Special menu dropdown functionality
        function toggleSpecialMenu(event) {
            event.stopPropagation();
            const menu = document.getElementById('specialMenu');
            const isVisible = menu.style.display !== 'none';
            
            // Close all other menus first
            document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
            
            menu.style.display = isVisible ? 'none' : 'block';
            
            // Close menu when clicking elsewhere
            if (!isVisible) {
                setTimeout(() => {
                    document.addEventListener('click', closeSpecialMenu, { once: true });
                }, 10);
            }
        }
        
        function closeSpecialMenu() {
            document.getElementById('specialMenu').style.display = 'none';
        }
        
        // Clean Up Desktop functionality
        async function cleanUpDesktop(event) {
            event.stopPropagation();
            closeSpecialMenu();
            
            console.log('🧹 Cleaning up desktop...');
            
            const icons = document.querySelectorAll('.desktop-icon:not(.trash-can)');
            const padding = 40; // Top and left padding
            const iconWidth = 75; // Width of each icon
            const iconHeight = 100; // Height including label
            const spacingX = 20; // Horizontal spacing between icons
            const spacingY = 20; // Vertical spacing between icons
            const iconsPerRow = 6; // Icons per row
            
            let currentRow = 0;
            let currentCol = 0;
            
            icons.forEach((icon, index) => {
                // Skip if icon is hidden
                if (icon.style.display === 'none') return;
                
                const x = padding + (currentCol * (iconWidth + spacingX));
                const y = padding + (currentRow * (iconHeight + spacingY));
                
                // Animate to new position
                icon.style.transition = 'all 0.3s ease-out';
                icon.style.left = x + 'px';
                icon.style.top = y + 'px';
                
                currentCol++;
                if (currentCol >= iconsPerRow) {
                    currentCol = 0;
                    currentRow++;
                }
            });
            
            // Remove transition after animation
            setTimeout(() => {
                icons.forEach(icon => {
                    icon.style.transition = '';
                });
            }, 300);
            
            // Save the new positions
            await saveIconPositions();
            
            console.log('✅ Desktop cleaned up!');
            
            // Show feedback
            showCleanupFeedback();
        }
        
        function showCleanupFeedback() {
            const feedback = document.createElement('div');
            feedback.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 15px 25px; border-radius: 8px; z-index: 10000; font-size: 16px; font-weight: bold;';
            feedback.textContent = 'Desktop cleaned up!';
            document.body.appendChild(feedback);
            
            setTimeout(() => {
                if (document.body.contains(feedback)) {
                    document.body.removeChild(feedback);
                }
            }, 2000);
        }`;
        
        // Insert the JavaScript before the closing </script> tag
        html = html.replace(/console\.log\('ToyBox OS Ready - Fixed Version'\);/, 
            `console.log('ToyBox OS Ready - Fixed Version');${cleanupJS}`);
        
        console.log('✅ Added Clean Up menu functionality');
        
        // Safe update with automatic backup
        await safeUpdateToyBoxOS(html, 'Added Clean Up menu item under Special with desktop icon arrangement');
        
        console.log('🎉 Clean Up menu added to ToyBox OS!');
        console.log('📋 Usage: Click Special → Clean Up to arrange icons neatly');
        
    } catch (error) {
        console.error('❌ Error adding Clean Up menu:', error);
        process.exit(1);
    }
}

// Run the script
addCleanupMenu();