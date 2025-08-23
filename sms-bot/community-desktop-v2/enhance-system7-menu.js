#!/usr/bin/env node

/**
 * Enhance System 7 Menu System for WEBTOYS-OS
 * 
 * This script adds authentic System 7 menu dropdowns and the correct Apple logo
 * based on the reference design in the desktop folder
 */

import { safeUpdateWebtoysOS } from './scripts/safe-webtoys-update-wrapper.js';
import * as fs from 'fs';

async function enhanceSystem7Menu() {
    try {
        console.log('🍎 Enhancing System 7 menu system with authentic Apple logo and dropdowns...');
        
        // Read current WEBTOYS-OS HTML and menu CSS
        console.log('📖 Reading current WEBTOYS-OS HTML...');
        const currentHTML = fs.readFileSync('./current-webtoys-os.html', 'utf8');
        
        console.log('📖 Reading System 7 menu enhancement CSS...');
        const menuCSS = fs.readFileSync('./system7-menu-enhancements.css', 'utf8');
        
        // Find the current menu bar and replace it with the enhanced version
        const menuBarPattern = /<div class="menu-bar">[\s\S]*?<\/div>/;
        const menuBarMatch = currentHTML.match(menuBarPattern);
        
        if (!menuBarMatch) {
            throw new Error('Could not find menu bar to enhance');
        }
        
        // Create the enhanced System 7 menu bar with Apple logo and dropdowns
        const enhancedMenuBar = `<div class="menu-bar">
        <div class="menu-left">
            <!-- Authentic System 7 Apple Logo -->
            <div class="menu-title apple-menu" onclick="toggleAppleMenu(event)">
                <span class="apple-logo"></span>
                <div class="dropdown-menu" id="appleMenu" style="display: none;">
                    <div class="menu-item" onclick="showAboutToyBox(event)">About ToyBox OS...</div>
                    <div class="menu-separator"></div>
                    <div class="menu-item disabled">Control Panels</div>
                    <div class="menu-item disabled">System Extensions</div>
                </div>
            </div>
            
            <!-- File Menu -->
            <div class="menu-title" onclick="toggleFileMenu(event)">File
                <div class="dropdown-menu" id="fileMenu" style="display: none;">
                    <div class="menu-item" onclick="newApp(event)">New App...</div>
                    <div class="menu-item" onclick="openApp(event)">Open...</div>
                    <div class="menu-separator"></div>
                    <div class="menu-item" onclick="closeActiveWindow(event)">Close</div>
                    <div class="menu-separator"></div>
                    <div class="menu-item disabled">Print...</div>
                    <div class="menu-separator"></div>
                    <div class="menu-item" onclick="restartDesktop(event)">Restart</div>
                </div>
            </div>
            
            <!-- Edit Menu -->
            <div class="menu-title" onclick="toggleEditMenu(event)">Edit
                <div class="dropdown-menu" id="editMenu" style="display: none;">
                    <div class="menu-item disabled">Undo</div>
                    <div class="menu-separator"></div>
                    <div class="menu-item disabled">Cut</div>
                    <div class="menu-item disabled">Copy</div>
                    <div class="menu-item disabled">Paste</div>
                    <div class="menu-item" onclick="selectAllIcons(event)">Select All</div>
                    <div class="menu-separator"></div>
                    <div class="menu-item" onclick="showPreferences(event)">Preferences...</div>
                </div>
            </div>
            
            <!-- View Menu -->
            <div class="menu-title" onclick="toggleViewMenu(event)">View
                <div class="dropdown-menu" id="viewMenu" style="display: none;">
                    <div class="menu-item" onclick="viewByIcon(event)">by Icon</div>
                    <div class="menu-item" onclick="viewByName(event)">by Name</div>
                    <div class="menu-item disabled">by Size</div>
                    <div class="menu-item disabled">by Date</div>
                    <div class="menu-separator"></div>
                    <div class="menu-item" onclick="changeBgColor(event)">Change Background...</div>
                </div>
            </div>
            
            <!-- Special Menu -->
            <div class="menu-title" onclick="toggleSpecialMenu(event)">Special
                <div class="dropdown-menu" id="specialMenu" style="display: none;">
                    <div class="menu-item" onclick="cleanUpDesktop(event)">Clean Up Desktop</div>
                    <div class="menu-item" onclick="emptyTrash(event)">Empty Trash...</div>
                    <div class="menu-separator"></div>
                    <div class="menu-item disabled">Eject Disk</div>
                    <div class="menu-separator"></div>
                    <div class="menu-item" onclick="restartDesktop(event)">Restart</div>
                    <div class="menu-item" onclick="shutDown(event)">Shut Down</div>
                </div>
            </div>
        </div>
        
        <div class="menu-right">
            <div id="profile-icon" onclick="toggleAuth(event)">
                <span id="profile-emoji">👤</span>
                <span id="username-display"></span>
            </div>
            <div id="menu-clock" aria-label="Clock"></div>
        </div>
    </div>`;
        
        // Replace the menu bar in the HTML
        let newHTML = currentHTML.replace(menuBarPattern, enhancedMenuBar);
        
        // Add the menu enhancement CSS to the existing styles
        const stylePattern = /(<\/style>\s*<\/head>)/;
        newHTML = newHTML.replace(stylePattern, '\n        ' + menuCSS + '\n    $1');
        
        // Add the menu functionality JavaScript
        const menuJavaScript = `
        
        // === ENHANCED SYSTEM 7 MENU SYSTEM ===
        let currentOpenMenu = null;
        let menuMode = false;
        
        // Generic menu toggle function
        function toggleMenu(menuId, event) {
            if (event) {
                event.preventDefault();
                event.stopPropagation();
            }
            
            const menu = document.getElementById(menuId);
            if (!menu) return;
            
            const isCurrentlyOpen = menu.style.display === 'block';
            
            // Close all menus first
            closeAllMenus();
            
            if (!isCurrentlyOpen) {
                menu.style.display = 'block';
                currentOpenMenu = menuId;
                menuMode = true;
                
                // Add hover behavior when in menu mode
                setupMenuModeHover();
            } else {
                menuMode = false;
                currentOpenMenu = null;
            }
        }
        
        function closeAllMenus() {
            document.querySelectorAll('.dropdown-menu').forEach(menu => {
                menu.style.display = 'none';
            });
            // Remove active states from menu titles
            document.querySelectorAll('.menu-title').forEach(title => {
                title.classList.remove('active');
            });
        }
        
        function setupMenuModeHover() {
            if (!menuMode) return;
            
            document.querySelectorAll('.menu-title').forEach(menuTitle => {
                menuTitle.onmouseenter = function() {
                    if (menuMode) {
                        closeAllMenus();
                        const dropdownMenu = this.querySelector('.dropdown-menu');
                        if (dropdownMenu) {
                            dropdownMenu.style.display = 'block';
                            currentOpenMenu = dropdownMenu.id;
                        }
                    }
                };
            });
        }
        
        // Individual menu toggle functions
        function toggleAppleMenu(event) { toggleMenu('appleMenu', event); }
        function toggleFileMenu(event) { toggleMenu('fileMenu', event); }
        function toggleEditMenu(event) { toggleMenu('editMenu', event); }
        function toggleViewMenu(event) { toggleMenu('viewMenu', event); }
        
        // Menu item actions
        function showAboutToyBox(event) {
            event.stopPropagation();
            closeAllMenus();
            menuMode = false;
            
            alert('ToyBox OS\\n\\nSystem Software 2.0\\n© WEBTOYS Community 2025\\n\\nA collaborative desktop environment\\nfor building and sharing web apps.');
        }
        
        function newApp(event) {
            event.stopPropagation();
            closeAllMenus();
            menuMode = false;
            
            // Try to open App Studio if available
            if (window.windowedApps && window.windowedApps['app-studio']) {
                openWindowedApp('app-studio');
            } else {
                alert('Create new apps at:\\nhttps://webtoys.ai');
            }
        }
        
        function openApp(event) {
            event.stopPropagation();
            closeAllMenus();
            menuMode = false;
            
            const appName = prompt('Enter app name to open:');
            if (appName && window.windowedApps[appName.toLowerCase()]) {
                openWindowedApp(appName.toLowerCase());
            } else if (appName) {
                alert('App "' + appName + '" not found');
            }
        }
        
        function closeActiveWindow(event) {
            event.stopPropagation();
            closeAllMenus();
            menuMode = false;
            
            if (window.windowManager && window.windowManager.activeWindow) {
                window.windowManager.closeWindow(window.windowManager.activeWindow);
            }
        }
        
        function selectAllIconsFromMenu(event) {
            event.stopPropagation();
            closeAllMenus();
            menuMode = false;
            
            if (window.selectAllIcons) {
                selectAllIcons();
            } else {
                // Fallback selection
                const icons = document.querySelectorAll('.desktop-icon:not(.trash-can)');
                icons.forEach(icon => icon.classList.add('selected'));
            }
        }
        
        function showPreferences(event) {
            event.stopPropagation();
            closeAllMenus();
            menuMode = false;
            
            alert('ToyBox OS Preferences\\n\\n• Theme: System 7\\n• Icons: Classic Style\\n• Background: Customizable\\n\\nMore preferences coming soon!');
        }
        
        function viewByIcon(event) {
            event.stopPropagation();
            closeAllMenus();
            menuMode = false;
            
            // Already in icon view - show feedback
            alert('Desktop is already in Icon view');
        }
        
        function viewByName(event) {
            event.stopPropagation();
            closeAllMenus();
            menuMode = false;
            
            alert('Name view not yet implemented.\\nCurrently in Icon view.');
        }
        
        function emptyTrash(event) {
            event.stopPropagation();
            closeAllMenus();
            menuMode = false;
            
            // Count hidden icons
            const hiddenIcons = document.querySelectorAll('.desktop-icon[style*="display: none"]').length;
            
            if (hiddenIcons === 0) {
                alert('Trash is already empty.');
            } else {
                if (confirm('Are you sure you want to permanently remove ' + hiddenIcons + ' item(s) from Trash?')) {
                    // Actually remove hidden icons from DOM
                    document.querySelectorAll('.desktop-icon[style*="display: none"]').forEach(icon => {
                        icon.remove();
                    });
                    alert('Trash emptied.');
                }
            }
        }
        
        function restartDesktop(event) {
            event.stopPropagation();
            closeAllMenus();
            menuMode = false;
            
            if (confirm('Restart ToyBox OS?\\n\\nThis will close all open windows and refresh the desktop.')) {
                // Close all windows
                if (window.windowManager) {
                    Array.from(window.windowManager.windows.keys()).forEach(windowId => {
                        window.windowManager.closeWindow(windowId);
                    });
                }
                
                // Refresh the page
                setTimeout(() => {
                    window.location.reload();
                }, 500);
            }
        }
        
        function shutDown(event) {
            event.stopPropagation();
            closeAllMenus();
            menuMode = false;
            
            if (confirm('Shut down ToyBox OS?\\n\\nThis will close all apps and return to the main site.')) {
                window.location.href = 'https://webtoys.ai';
            }
        }
        
        // Close menus when clicking outside
        document.addEventListener('click', function(event) {
            if (menuMode && !event.target.closest('.menu-bar')) {
                closeAllMenus();
                menuMode = false;
                currentOpenMenu = null;
            }
        });
        
        // Escape key closes menus
        document.addEventListener('keydown', function(event) {
            if (event.key === 'Escape' && menuMode) {
                closeAllMenus();
                menuMode = false;
                currentOpenMenu = null;
            }
        });
        
        console.log('🍎 System 7 menu system enhanced');`;
        
        // Insert the menu JavaScript before the closing script tag
        const scriptEndPattern = /(<\/script>\s*<\/body>)/;
        const finalHTML = newHTML.replace(scriptEndPattern, menuJavaScript + '\n        $1');
        
        console.log('🔍 Menu enhancement details:');
        console.log('   🍎 Authentic System 7 Apple logo');
        console.log('   📁 File menu with New App, Open, Close, Restart');
        console.log('   ✏️  Edit menu with Select All, Preferences');
        console.log('   👁️  View menu with icon/name options');
        console.log('   🔧 Special menu with Clean Up, Empty Trash, Shut Down');
        console.log('   ⌨️  Proper keyboard shortcuts (Escape to close)');
        console.log('   🖱️  Authentic hover and click behavior');
        
        // Apply update using safe wrapper
        console.log('\\n🚀 Applying System 7 menu enhancements...');
        const result = await safeUpdateWebtoysOS(
            finalHTML,
            'Enhanced System 7 menu system - added Apple logo, File/Edit/View/Special dropdowns with authentic behavior'
        );
        
        console.log('\\n🎉 SYSTEM 7 MENU ENHANCED!');
        console.log('🔗 WEBTOYS-OS now has authentic System 7 menu system');
        console.log('📱 Visit: https://webtoys.ai/public/webtoys-os');
        console.log(`💾 Backup available for rollback if needed`);
        
        console.log('\\n📋 New menu features:');
        console.log('   🍎 Click Apple logo for About ToyBox OS');
        console.log('   📁 File → New App (opens App Studio)');
        console.log('   📁 File → Open (prompt for app name)');
        console.log('   📁 File → Close (closes active window)');
        console.log('   ✏️  Edit → Select All (selects all icons)');
        console.log('   👁️  View → Change Background (color picker)');
        console.log('   🔧 Special → Clean Up Desktop (organizes icons)');
        console.log('   🔧 Special → Empty Trash (removes hidden icons)');
        console.log('   🔧 Special → Shut Down (returns to main site)');
        
        return result;
        
    } catch (error) {
        console.error('❌ Failed to enhance System 7 menu:', error.message);
        console.log('🔄 Safe backup system has preserved your original WEBTOYS-OS');
        throw error;
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    enhanceSystem7Menu();
}

export { enhanceSystem7Menu };