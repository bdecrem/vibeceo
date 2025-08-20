#!/usr/bin/env node

import { fetchCurrentToyBoxOS, safeUpdateToyBoxOS } from './safe-update-wrapper.js';
import * as fs from 'fs';
import * as path from 'path';

async function applySystem7Theme() {
    try {
        console.log('🎨 Applying System 7 theme to ToyBox OS...');
        
        // Read theme CSS files
        const baseCSS = fs.readFileSync(path.join(process.cwd(), 'themes/base.css'), 'utf8');
        const system7CSS = fs.readFileSync(path.join(process.cwd(), 'themes/system7/system7.css'), 'utf8');
        
        // Fetch current HTML
        const current = await fetchCurrentToyBoxOS();
        let htmlContent = current.html_content;
        
        console.log('1️⃣  Adding theme class to body...');
        // Add theme class to body
        htmlContent = htmlContent.replace(
            '<body>',
            '<body class="theme-system7">'
        );
        
        console.log('2️⃣  Replacing inline styles with theme CSS...');
        // Replace the entire style section with our theme CSS
        htmlContent = htmlContent.replace(
            /<style>[\s\S]*?<\/style>/,
            `<style>
/* Base Theme */
${baseCSS}

/* System 7 Theme */
${system7CSS}
    </style>`
        );
        
        console.log('3️⃣  Converting taskbar to menu bar...');
        // Replace taskbar with menu bar structure
        const menuBarHTML = `
    <div class="menu-bar">
        <div class="menu-left">
            <div class="menu-title apple" onclick="alert('ToyBox OS System 7\\n\\nA collaborative desktop experiment\\n\\nBuilt with WEBTOYS')">🍎</div>
            <div class="menu-title">File</div>
            <div class="menu-title">Edit</div>
            <div class="menu-title">View</div>
            <div class="menu-title">Special</div>
        </div>
        <div class="menu-right">
            <div id="menu-clock" aria-label="Clock"></div>
        </div>
    </div>`;
        
        // Remove old taskbar
        htmlContent = htmlContent.replace(
            /<div class="taskbar">[\s\S]*?<\/div>\s*<\/div>/,
            menuBarHTML
        );
        
        console.log('4️⃣  Adding clock update script...');
        // Add clock update function if not present
        const clockScript = `
        // System 7 Menu Clock
        function updateMenuClock() {
            const clockEl = document.getElementById('menu-clock');
            if (clockEl) {
                const now = new Date();
                const hours = now.getHours() % 12 || 12;
                const minutes = now.getMinutes().toString().padStart(2, '0');
                const ampm = now.getHours() >= 12 ? 'PM' : 'AM';
                clockEl.textContent = hours + ':' + minutes + ' ' + ampm;
            }
        }
        setInterval(updateMenuClock, 1000);
        updateMenuClock(); // Initial call`;
        
        // Add clock script before closing script tag
        if (!htmlContent.includes('updateMenuClock')) {
            htmlContent = htmlContent.replace(
                '</script>',
                clockScript + '\n</script>'
            );
        }
        
        console.log('5️⃣  Adjusting window container position...');
        // Update window container to account for top menu bar
        htmlContent = htmlContent.replace(
            'bottom: 40px;',
            'top: 22px; bottom: 0;'
        );
        
        console.log('6️⃣  Cleaning up incompatible styles...');
        // Remove inline styles that conflict with theme
        htmlContent = htmlContent.replace(
            /style="[^"]*background:\s*#008080[^"]*"/g,
            ''
        );
        
        // Safe update with automatic backup
        await safeUpdateToyBoxOS(
            htmlContent, 
            'Applied System 7 theme with menu bar and clock'
        );
        
        console.log('\n✅ System 7 theme applied successfully!');
        console.log('   - Menu bar at top with Apple, File, Edit, View, Special');
        console.log('   - Working clock on right side');
        console.log('   - Pixelated gray desktop background');
        console.log('   - Classic Mac OS window styling');
        console.log('   - All functionality preserved');
        
    } catch (error) {
        console.error('❌ Failed to apply System 7 theme:', error.message);
        process.exit(1);
    }
}

// Run the theme application
applySystem7Theme();