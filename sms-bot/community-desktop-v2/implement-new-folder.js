#!/usr/bin/env node

/**
 * Implement File > New Folder functionality for WEBTOYS-OS
 */

import { fetchCurrentWebtoysOS, safeUpdateWebtoysOS } from './scripts/safe-webtoys-update-wrapper.js';

async function implementNewFolderFunctionality() {
    try {
        console.log('🔍 Fetching current WEBTOYS-OS content...');
        const current = await fetchCurrentWebtoysOS();
        let htmlContent = current.html_content;

        // Find the File menu and ensure "New Folder" exists and is functional
        if (!htmlContent.includes('New Folder')) {
            console.log('❌ New Folder menu item not found in File menu');
            console.log('Adding New Folder to File menu...');
            
            // Add New Folder menu item if it doesn't exist
            const fileMenuMatch = htmlContent.match(/<div class="menu-dropdown"[^>]*id="fileMenu"[^>]*>(.*?)<\/div>/s);
            if (fileMenuMatch) {
                const currentFileMenu = fileMenuMatch[1];
                const newFileMenu = currentFileMenu.replace(
                    /(<div class="menu-item"[^>]*>New<\/div>)/,
                    '$1\n                    <div class="menu-item" onclick="createNewFolder()">New Folder</div>'
                );
                htmlContent = htmlContent.replace(fileMenuMatch[0], 
                    `<div class="menu-dropdown" id="fileMenu">${newFileMenu}</div>`
                );
            }
        }

        // Add folder creation functionality
        const newFolderJS = `
        // Folder creation functionality
        let folderCounter = 1;
        
        function createNewFolder() {
            console.log('Creating new folder...');
            
            // Hide any open menus first
            document.querySelectorAll('.menu-dropdown').forEach(menu => {
                menu.style.display = 'none';
            });
            
            // Find an available position on the desktop
            const desktop = document.getElementById('desktop');
            const existingIcons = Array.from(desktop.querySelectorAll('.desktop-icon, .folder-icon'));
            
            // Calculate grid positions (80px spacing)
            const iconSize = 80;
            const startX = 20;
            const startY = 60; // Below menubar
            const maxCols = Math.floor((window.innerWidth - 40) / iconSize);
            
            let position = findAvailablePosition(existingIcons, startX, startY, iconSize, maxCols);
            
            // Create folder element
            const folder = document.createElement('div');
            folder.className = 'folder-icon desktop-icon';
            folder.style.position = 'absolute';
            folder.style.left = position.x + 'px';
            folder.style.top = position.y + 'px';
            folder.style.width = '64px';
            folder.style.height = '80px';
            folder.style.textAlign = 'center';
            folder.style.cursor = 'pointer';
            folder.style.userSelect = 'none';
            folder.style.zIndex = '100';
            
            // Create folder name
            let folderName = 'New Folder';
            if (folderCounter > 1) {
                folderName = 'New Folder ' + folderCounter;
            }
            folderCounter++;
            
            // Folder HTML structure
            folder.innerHTML = \`
                <div style="width: 64px; height: 64px; background: #f0f0f0; border: 2px solid #999; border-radius: 4px; position: relative; margin-bottom: 4px; box-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
                    <div style="position: absolute; top: 5px; left: 5px; right: 5px; height: 20px; background: #ddd; border-radius: 2px;"></div>
                    <div style="position: absolute; top: 25px; left: 8px; right: 8px; bottom: 8px; background: #fff; border: 1px solid #999; border-radius: 2px;"></div>
                    <div style="position: absolute; top: 30px; left: 12px; right: 12px; height: 2px; background: #ccc;"></div>
                    <div style="position: absolute; top: 35px; left: 12px; right: 12px; height: 2px; background: #ccc;"></div>
                    <div style="position: absolute; top: 40px; left: 12px; right: 12px; height: 2px; background: #ccc;"></div>
                </div>
                <div class="icon-label" style="font-size: 10px; color: black; background: white; padding: 1px 2px; border-radius: 2px; display: inline-block; max-width: 64px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;">\${folderName}</div>
            \`;
            
            // Make folder draggable
            makeDraggable(folder);
            
            // Add double-click handler to open folder (placeholder)
            folder.addEventListener('dblclick', function() {
                alert('Folder "' + folderName + '" opened!\\n\\n(Folder contents functionality would go here)');
            });
            
            // Add to desktop
            desktop.appendChild(folder);
            
            console.log('New folder created:', folderName);
            
            // Flash effect to show it was created
            folder.style.background = 'rgba(255, 255, 0, 0.3)';
            setTimeout(() => {
                folder.style.background = '';
            }, 500);
        }
        
        function findAvailablePosition(existingIcons, startX, startY, iconSize, maxCols) {
            const occupiedPositions = new Set();
            
            // Track all occupied positions
            existingIcons.forEach(icon => {
                const rect = icon.getBoundingClientRect();
                const x = Math.round((rect.left - startX) / iconSize);
                const y = Math.round((rect.top - startY) / iconSize);
                occupiedPositions.add(\`\${x},\${y}\`);
            });
            
            // Find first available position
            for (let row = 0; row < 20; row++) { // Max 20 rows
                for (let col = 0; col < maxCols; col++) {
                    const posKey = \`\${col},\${row}\`;
                    if (!occupiedPositions.has(posKey)) {
                        return {
                            x: startX + (col * iconSize),
                            y: startY + (row * iconSize)
                        };
                    }
                }
            }
            
            // Fallback position if grid is full
            return { x: startX, y: startY };
        }`;

        // Insert the new folder JavaScript before the closing script tag
        const scriptEndIndex = htmlContent.lastIndexOf('</script>');
        if (scriptEndIndex !== -1) {
            htmlContent = htmlContent.substring(0, scriptEndIndex) + 
                         newFolderJS + 
                         '\n        ' + htmlContent.substring(scriptEndIndex);
        } else {
            // If no script tag found, add it before closing body
            const bodyEndIndex = htmlContent.lastIndexOf('</body>');
            if (bodyEndIndex !== -1) {
                htmlContent = htmlContent.substring(0, bodyEndIndex) + 
                             '<script>' + newFolderJS + '</script>\n' + 
                             htmlContent.substring(bodyEndIndex);
            }
        }

        // Ensure the File > New Folder menu item calls our function
        htmlContent = htmlContent.replace(
            /<div class="menu-item"[^>]*>New Folder<\/div>/g,
            '<div class="menu-item" onclick="createNewFolder()">New Folder</div>'
        );

        // Update WEBTOYS-OS with new functionality
        console.log('💾 Updating WEBTOYS-OS with New Folder functionality...');
        await safeUpdateWebtoysOS(htmlContent, 'Add File > New Folder functionality with smart positioning');
        
        console.log('✅ File > New Folder functionality implemented successfully!');
        console.log('🎯 Features added:');
        console.log('   • File > New Folder menu item now functional');
        console.log('   • Creates draggable folder icons on desktop');
        console.log('   • Smart positioning avoids overlapping existing icons');
        console.log('   • Folder icons have realistic folder appearance');
        console.log('   • Double-click placeholder functionality');
        console.log('   • Visual feedback when folder is created');
        
    } catch (error) {
        console.error('❌ Failed to implement New Folder functionality:', error.message);
        throw error;
    }
}

// Run the implementation
implementNewFolderFunctionality().catch(console.error);