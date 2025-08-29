#!/usr/bin/env node

/**
 * Add New Folder Menu Item to WEBTOYS-OS
 * 
 * This script safely adds a "New Folder" menu item under File menu
 * that allows users to create folders on the desktop.
 * 
 * Uses safe backup system to ensure rollback capability.
 */

import { safeUpdateWebtoysOS, fetchCurrentWebtoysOS } from './scripts/safe-webtoys-update-wrapper.js';

async function addNewFolderMenuItem() {
    console.log('🗂️  Adding New Folder menu item to WEBTOYS-OS...');
    
    try {
        // Step 1: Get current HTML
        const current = await fetchCurrentWebtoysOS();
        let htmlContent = current.html_content;
        
        // Step 2: Add New Folder menu item after New App...
        const menuItemToAdd = `                    <div class="menu-item" onclick="newFolder(event)">New Folder</div>`;
        
        // Find the File menu New App item and add New Folder after it
        const newAppPattern = /(<div class="menu-item" onclick="newApp\(event\)">New App\.\.\.<\/div>)/;
        
        if (!newAppPattern.test(htmlContent)) {
            throw new Error('Could not find New App menu item to insert New Folder after');
        }
        
        htmlContent = htmlContent.replace(
            newAppPattern,
            `$1\n${menuItemToAdd}`
        );
        
        // Step 3: Add the newFolder JavaScript function
        const folderFunctionCode = `
        function newFolder(event) {
            event.stopPropagation();
            closeAllMenus();
            menuMode = false;
            
            // Prompt for folder name
            const folderName = prompt('Name for new folder:', 'Untitled Folder');
            if (!folderName) return;
            
            // Create folder on desktop
            createDesktopFolder(folderName);
        }
        
        let folderCounter = 1;
        
        function createDesktopFolder(name) {
            // Find available position on desktop
            const desktop = document.getElementById('desktop');
            const position = findAvailablePosition();
            
            // Create folder element
            const folderElement = document.createElement('div');
            folderElement.className = 'desktop-icon folder';
            folderElement.style.left = position.x + 'px';
            folderElement.style.top = position.y + 'px';
            folderElement.setAttribute('data-folder-name', name);
            
            folderElement.innerHTML = \`
                <div class="icon">📁</div>
                <div class="label">\${name}</div>
            \`;
            
            // Add double-click handler to open folder
            folderElement.addEventListener('dblclick', function(e) {
                e.stopPropagation();
                openFolder(name, folderElement);
            });
            
            // Add to desktop
            desktop.appendChild(folderElement);
            
            console.log(\`✅ Created folder: \${name}\`);
        }
        
        function findAvailablePosition() {
            const desktop = document.getElementById('desktop');
            const icons = desktop.querySelectorAll('.desktop-icon');
            const gridSize = 90; // Icon spacing
            const startX = 20;
            const startY = 20;
            const maxCols = Math.floor((window.innerWidth - 100) / gridSize);
            
            // Check each grid position
            for (let row = 0; row < 10; row++) {
                for (let col = 0; col < maxCols; col++) {
                    const x = startX + (col * gridSize);
                    const y = startY + (row * gridSize);
                    
                    // Check if position is free
                    let occupied = false;
                    for (let icon of icons) {
                        const iconX = parseInt(icon.style.left) || 0;
                        const iconY = parseInt(icon.style.top) || 0;
                        
                        if (Math.abs(iconX - x) < 50 && Math.abs(iconY - y) < 50) {
                            occupied = true;
                            break;
                        }
                    }
                    
                    if (!occupied) {
                        return { x, y };
                    }
                }
            }
            
            // Fallback: use counter-based positioning
            const fallbackX = startX + ((folderCounter % 5) * gridSize);
            const fallbackY = startY + (Math.floor(folderCounter / 5) * gridSize);
            folderCounter++;
            
            return { x: fallbackX, y: fallbackY };
        }
        
        function openFolder(folderName, folderElement) {
            alert(\`Opening folder: \${folderName}\\n\\n(Folder contents functionality coming soon!)\`);
        }`;
        
        // Find a good place to insert the folder functions (before the closing script tag)
        const scriptEndPattern = /(\s*<\/script>\s*<\/body>)/;
        
        if (!scriptEndPattern.test(htmlContent)) {
            throw new Error('Could not find location to insert folder JavaScript functions');
        }
        
        htmlContent = htmlContent.replace(
            scriptEndPattern,
            `\n${folderFunctionCode}\n$1`
        );
        
        // Step 4: Add CSS for folder styling
        const folderCSS = `
        .desktop-icon.folder .icon {
            font-size: 32px;
        }
        
        .desktop-icon.folder:hover .icon {
            filter: brightness(1.1);
        }
        
        .desktop-icon.folder.selected .label {
            background: #000080;
            color: white;
        }`;
        
        // Insert CSS before the closing </style> tag
        const styleEndPattern = /(\s*<\/style>)/;
        if (styleEndPattern.test(htmlContent)) {
            htmlContent = htmlContent.replace(
                styleEndPattern,
                `\n${folderCSS}\n$1`
            );
        }
        
        // Step 5: Apply the changes using safe update system
        await safeUpdateWebtoysOS(
            htmlContent, 
            'Added New Folder menu item with folder creation functionality'
        );
        
        console.log('🎉 New Folder menu item added successfully!');
        console.log('📁 Users can now create folders via File > New Folder');
        console.log('🔗 Test at: https://webtoys.ai/public/webtoys-os');
        
    } catch (error) {
        console.error('❌ Failed to add New Folder menu item:', error.message);
        throw error;
    }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
    addNewFolderMenuItem().catch(console.error);
}

export { addNewFolderMenuItem };