#!/usr/bin/env node

/**
 * Fix WEBTOYS-OS Menu System
 * 
 * Problem: File, Edit, and View menus don't show dropdown items
 * Root Cause: Duplicate menu IDs in HTML - each menu appears multiple times
 * Solution: Make each menu ID unique and use the working Special menu pattern
 */

import { safeUpdateWebtoysOS } from './safe-webtoys-update-wrapper.js';
import * as fs from 'fs';

async function fixMenuSystem() {
    console.log('🔧 Fixing WEBTOYS-OS Menu System...\n');
    
    // Read current HTML
    const htmlPath = 'current-webtoys-os.html';
    let html = fs.readFileSync(htmlPath, 'utf8');
    
    console.log('📋 Issues found:');
    console.log('   - Multiple menus with same IDs (fileMenu, editMenu, viewMenu)');
    console.log('   - Only first occurrence accessible via document.getElementById()');
    console.log('   - Special menu works because it has unique handling\n');
    
    console.log('🛠️  Applying fixes...\n');
    
    // Step 1: Make menu IDs unique by adding suffixes
    // Track which occurrence we're on for each menu type
    let menuCounters = {
        fileMenu: 0,
        editMenu: 0,
        viewMenu: 0,
        specialMenu: 0,
        appleMenu: 0
    };
    
    // Function to replace menu IDs with unique ones
    function makeMenuIdsUnique(html) {
        // Reset counters
        for (let key in menuCounters) {
            menuCounters[key] = 0;
        }
        
        // Replace each occurrence of menu IDs with numbered versions
        return html.replace(/id="(fileMenu|editMenu|viewMenu|specialMenu|appleMenu)"/g, (match, menuType) => {
            menuCounters[menuType]++;
            if (menuCounters[menuType] === 1) {
                // Keep first occurrence as-is (this is what JavaScript currently targets)
                return match;
            } else {
                // Give subsequent occurrences unique IDs
                return `id="${menuType}${menuCounters[menuType]}"`;
            }
        });
    }
    
    // Step 2: Update the toggle functions to work like toggleSpecialMenu
    function updateToggleFunctions(html) {
        // Find where the toggle functions are defined and replace the generic ones
        // with dedicated functions like toggleSpecialMenu
        
        const newToggleFunctions = `
        function toggleAppleMenu(event) {
            event.stopPropagation();
            const menu = document.getElementById('appleMenu');
            const isVisible = menu.style.display !== 'none';
            
            // Close all other menus first
            document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
            
            menu.style.display = isVisible ? 'none' : 'block';
            
            // Close menu when clicking elsewhere
            if (!isVisible) {
                setTimeout(() => {
                    document.addEventListener('click', closeAppleMenu, { once: true });
                }, 10);
            }
        }

        function toggleFileMenu(event) {
            event.stopPropagation();
            const menu = document.getElementById('fileMenu');
            const isVisible = menu.style.display !== 'none';
            
            // Close all other menus first
            document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
            
            menu.style.display = isVisible ? 'none' : 'block';
            
            // Close menu when clicking elsewhere
            if (!isVisible) {
                setTimeout(() => {
                    document.addEventListener('click', closeFileMenu, { once: true });
                }, 10);
            }
        }

        function toggleEditMenu(event) {
            event.stopPropagation();
            const menu = document.getElementById('editMenu');
            const isVisible = menu.style.display !== 'none';
            
            // Close all other menus first
            document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
            
            menu.style.display = isVisible ? 'none' : 'block';
            
            // Close menu when clicking elsewhere
            if (!isVisible) {
                setTimeout(() => {
                    document.addEventListener('click', closeEditMenu, { once: true });
                }, 10);
            }
        }

        function toggleViewMenu(event) {
            event.stopPropagation();
            const menu = document.getElementById('viewMenu');
            const isVisible = menu.style.display !== 'none';
            
            // Close all other menus first
            document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
            
            menu.style.display = isVisible ? 'none' : 'block';
            
            // Close menu when clicking elsewhere
            if (!isVisible) {
                setTimeout(() => {
                    document.addEventListener('click', closeViewMenu, { once: true });
                }, 10);
            }
        }

        function closeAppleMenu() {
            document.getElementById('appleMenu').style.display = 'none';
        }
        
        function closeFileMenu() {
            document.getElementById('fileMenu').style.display = 'none';
        }
        
        function closeEditMenu() {
            document.getElementById('editMenu').style.display = 'none';
        }
        
        function closeViewMenu() {
            document.getElementById('viewMenu').style.display = 'none';
        }`;
        
        // Replace the existing toggle function definitions
        // First, remove the old generic ones
        html = html.replace(/function toggleAppleMenu\(event\) \{ toggleMenu\('appleMenu', event\); \}/g, '');
        html = html.replace(/function toggleFileMenu\(event\) \{ toggleMenu\('fileMenu', event\); \}/g, '');
        html = html.replace(/function toggleEditMenu\(event\) \{ toggleMenu\('editMenu', event\); \}/g, '');
        html = html.replace(/function toggleViewMenu\(event\) \{ toggleMenu\('viewMenu', event\); \}/g, '');
        
        // Find a good place to insert our new functions (after the first toggleSpecialMenu)
        const insertAfter = 'function closeSpecialMenu() {\n            document.getElementById(\'specialMenu\').style.display = \'none\';\n        }';
        html = html.replace(insertAfter, insertAfter + newToggleFunctions);
        
        return html;
    }
    
    // Apply the fixes
    console.log('1️⃣  Making menu IDs unique...');
    html = makeMenuIdsUnique(html);
    
    console.log('2️⃣  Updating toggle functions to use Special menu pattern...');
    html = updateToggleFunctions(html);
    
    console.log('3️⃣  Preserving New Folder functionality...');
    // Verify New Folder is still there (should be automatically preserved)
    if (html.includes('onclick="newFolder(event)"')) {
        console.log('   ✅ New Folder functionality preserved');
    } else {
        console.log('   ⚠️  Warning: New Folder functionality may need attention');
    }
    
    // Use safe backup system to apply the fix
    console.log('\n🔒 Applying fix using safe backup system...');
    await safeUpdateWebtoysOS(
        html, 
        'Fix menu system - make all menus work like Special menu, resolve duplicate ID issue'
    );
    
    console.log('\n✅ Menu system fix complete!');
    console.log('📋 What was fixed:');
    console.log('   - Made all menu IDs unique');
    console.log('   - Added dedicated toggle functions for each menu (like Special menu)');
    console.log('   - All menus should now show dropdown items when clicked');
    console.log('   - New Folder menu item should be visible and clickable');
    console.log('\n🔗 Test at: https://webtoys.ai/public/webtoys-os');
}

if (import.meta.url === `file://${process.argv[1]}`) {
    fixMenuSystem().catch(console.error);
}

export { fixMenuSystem };