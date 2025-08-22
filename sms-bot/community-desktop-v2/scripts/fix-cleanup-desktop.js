#!/usr/bin/env node

import { fetchCurrentToyBoxOS, safeUpdateToyBoxOS } from './safe-update-wrapper.js';

async function fixCleanupDesktop() {
    console.log('🔧 Fixing Clean Up Desktop and removing duplicate elements...');
    
    try {
        // Get current HTML
        const data = await fetchCurrentToyBoxOS();
        let html = data.html_content;
        
        // 1. Remove any duplicate Apple menus (red apple)
        console.log('1️⃣ Checking for duplicate Apple menus...');
        // Remove red apple if it exists
        html = html.replace(/<div class="menu-title[^>]*>🍎<\/div>\s*<div class="menu-title[^>]*>🍎<\/div>/g, 
                          '<div class="menu-title apple">🍎</div>');
        
        // 2. Add Clean Up Desktop function if missing
        console.log('2️⃣ Adding Clean Up Desktop function...');
        if (!html.includes('function cleanUpDesktop')) {
            const cleanUpFunction = `
        function cleanUpDesktop() {
            const desktop = document.getElementById('desktop');
            const icons = desktop.querySelectorAll('.desktop-icon');
            let x = 20;
            let y = 20;
            const spacing = 100;
            
            icons.forEach((icon, index) => {
                // Skip trash can
                if (icon.classList.contains('trash-can')) return;
                
                icon.style.left = x + 'px';
                icon.style.top = y + 'px';
                
                y += spacing;
                if (y > 500) {
                    y = 20;
                    x += spacing;
                }
            });
            
            // Save positions to ZAD if available
            if (window.saveDesktopState) {
                window.saveDesktopState();
            }
        }`;
            
            // Add before closing script tag
            html = html.replace('</script>\n</body>', cleanUpFunction + '\n    </script>\n</body>');
        }
        
        // 3. Add Clean Up option to Special menu if missing
        console.log('3️⃣ Checking Special menu for Clean Up option...');
        if (!html.includes('onclick="cleanUpDesktop()"')) {
            // Find the Special menu dropdown
            const specialMenuPattern = /<div class="menu-title">Special<\/div>[\s\S]*?<div class="dropdown-menu[^>]*>[\s\S]*?<\/div>/;
            const specialMenuMatch = html.match(specialMenuPattern);
            
            if (specialMenuMatch) {
                // Add Clean Up Desktop to Special menu
                const updatedMenu = specialMenuMatch[0].replace(
                    '</div>',
                    `    <div class="menu-item" onclick="cleanUpDesktop()">Clean Up Desktop</div>
</div>`
                );
                html = html.replace(specialMenuMatch[0], updatedMenu);
            } else {
                // If no dropdown exists, add it
                html = html.replace(
                    '<div class="menu-title">Special</div>',
                    `<div class="menu-title">Special</div>
                <div class="dropdown-menu" style="display:none;">
                    <div class="menu-item" onclick="cleanUpDesktop()">Clean Up Desktop</div>
                </div>`
                );
            }
        }
        
        // 4. Ensure menus are horizontal (fix any vertical stacking)
        console.log('4️⃣ Ensuring menu bar is horizontal...');
        // Make sure menu-left has proper flex display
        if (!html.includes('.menu-left {') || !html.includes('display: flex')) {
            const menuStyle = `
    .menu-left {
        display: flex;
        align-items: center;
        gap: 0;
    }
    .menu-title {
        display: inline-block;
        padding: 0 14px;
    }`;
            html = html.replace('</style>', menuStyle + '\n    </style>');
        }
        
        // Apply the fix
        await safeUpdateToyBoxOS(html, 'Fix Clean Up Desktop and remove duplicate elements');
        
        console.log('✅ Fixed:');
        console.log('  • Clean Up Desktop function added/fixed');
        console.log('  • Any duplicate Apple menus removed');
        console.log('  • Menu bar ensured to be horizontal');
        console.log('  • Special menu has Clean Up option');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

fixCleanupDesktop();