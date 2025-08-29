#!/usr/bin/env node

/**
 * Fix duplicate kdfhgfdh entries in ToyBox OS
 * Remove all duplicates and keep only one in a proper position
 */

import { fetchCurrentToyBoxOS, safeUpdateToyBoxOS } from './safe-update-wrapper.js';
import fs from 'fs';
import path from 'path';

// Ensure we're in the right directory
process.chdir(path.dirname(process.argv[1]));

async function fixDuplicateKdfhgfdh() {
    console.log('🔧 Fixing duplicate kdfhgfdh entries in ToyBox OS...');
    
    try {
        // Get current HTML
        const data = await fetchCurrentToyBoxOS();
        let html = data.html_content;
        
        console.log('📊 Analyzing HTML for kdfhgfdh entries...');
        
        // Count current kdfhgfdh references
        const kdfhgfdhMatches = html.match(/kdfhgfdh/g);
        console.log(`Found ${kdfhgfdhMatches ? kdfhgfdhMatches.length : 0} total 'kdfhgfdh' references`);
        
        // Remove ALL kdfhgfdh desktop icons
        console.log('🧹 Removing all kdfhgfdh desktop icons...');
        
        // Remove desktop icon entries (both single line and multi-line variants)
        html = html.replace(/\s*<!-- kdfhgfdh by Anonymous -->\s*\n\s*<div class="desktop-icon"[^>]*onclick="openWindowedApp\('kdfhgfdh'\)"[^>]*>[\s\S]*?<\/div>\s*/g, '');
        
        // Also remove any stray kdfhgfdh icons that might not have the comment
        html = html.replace(/\s*<div class="desktop-icon"[^>]*onclick="openWindowedApp\('kdfhgfdh'\)"[^>]*>[\s\S]*?<\/div>\s*/g, '');
        
        // Clean up any broken HTML structure around where kdfhgfdh was
        html = html.replace(/(<\/div>\s*){2,}<!--\s*end desktop\s*-->/, '</div><!-- end desktop -->');
        
        // Find a good position for the ONE kdfhgfdh icon we want to keep
        console.log('📍 Finding optimal position for single kdfhgfdh icon...');
        
        // Extract all existing positions to avoid conflicts
        const iconPattern = /style="left:\s*(\d+)px;\s*top:\s*(\d+)px;"/g;
        const positions = [];
        let match;
        while ((match = iconPattern.exec(html)) !== null) {
            positions.push({ x: parseInt(match[1]), y: parseInt(match[2]) });
        }
        
        // Find an empty grid position (avoid overlaps)
        let newPosition = { x: 620, y: 20 }; // Default position
        
        // Check grid positions starting from top-left
        for (let y = 20; y <= 420; y += 100) {
            for (let x = 20; x <= 720; x += 100) {
                const isFree = !positions.some(p => 
                    Math.abs(p.x - x) < 80 && Math.abs(p.y - y) < 80
                );
                if (isFree) {
                    newPosition = { x, y };
                    break;
                }
            }
            if (newPosition.x !== 620 || newPosition.y !== 20) break;
        }
        
        console.log(`📍 Selected position: (${newPosition.x}, ${newPosition.y})`);
        
        // Add ONE clean kdfhgfdh icon at the optimal position
        const newIconHtml = `
    <!-- kdfhgfdh by Anonymous -->
    <div class="desktop-icon" 
         style="left: ${newPosition.x}px; top: ${newPosition.y}px;"
         onclick="openWindowedApp('kdfhgfdh')"
         title="kdfhgfdh">
        <div class="icon">😀</div>
        <div class="label">kdfhgfdh</div>
    </div>`;
        
        // Find the best place to insert - before end of desktop
        const desktopEndPattern = '</div><!-- end desktop -->';
        if (html.includes(desktopEndPattern)) {
            html = html.replace(desktopEndPattern, newIconHtml + '\n    ' + desktopEndPattern);
        } else {
            console.log('⚠️ Could not find desktop end marker, trying alternative...');
            // Try alternative patterns
            const altPattern = '</div>\n    \n    <div class="menu-bar">';
            if (html.includes(altPattern)) {
                html = html.replace(altPattern, newIconHtml + '\n    </div>\n    \n    <div class="menu-bar">');
            }
        }
        
        // Ensure the windowedApps registry has kdfhgfdh (keep only one entry)
        console.log('🔧 Cleaning up windowedApps registry...');
        
        // Remove any duplicate kdfhgfdh entries from windowedApps
        html = html.replace(/\s*'kdfhgfdh':\s*{[^}]*},?\s*/g, '');
        
        // Add ONE clean kdfhgfdh entry at the beginning of windowedApps
        const kdfhgfdhEntry = `
        'kdfhgfdh': {
            name: 'kdfhgfdh',
            url: '/community/kdfhgfdh',
            icon: '😀',
            width: 400,
            height: 300
        },`;
        
        const windowedAppsIndex = html.indexOf('window.windowedApps = {');
        if (windowedAppsIndex > -1) {
            const insertPoint = html.indexOf('{', windowedAppsIndex) + 1;
            html = html.slice(0, insertPoint) + kdfhgfdhEntry + html.slice(insertPoint);
        }
        
        // Fix any HTML structure issues
        console.log('🔧 Cleaning up HTML structure...');
        
        // Remove any orphaned closing divs
        html = html.replace(/\s*<\/div>\s*<\/div>\s*<\/div>\s*<!--\s*end desktop\s*-->/g, '\n    </div><!-- end desktop -->');
        
        // Fix any broken icon structures
        html = html.replace(/(<div class="desktop-icon"[^>]*>)\s*(<div class="icon">[^<]*<\/div>)\s*$/gm, '$1\n        $2\n        <div class="label">Untitled</div>\n    </div>');
        
        // Count final kdfhgfdh references
        const finalMatches = html.match(/kdfhgfdh/g);
        console.log(`📊 Final count: ${finalMatches ? finalMatches.length : 0} 'kdfhgfdh' references`);
        
        // Save locally for inspection
        fs.writeFileSync('fixed-toybox-os.html', html);
        console.log('💾 Saved preview to fixed-toybox-os.html');
        
        // Apply the fix
        console.log('🚀 Applying fix to ToyBox OS...');
        await safeUpdateToyBoxOS(html, 'Remove duplicate kdfhgfdh entries, keep only one at optimal position');
        
        console.log('✅ Successfully fixed duplicate kdfhgfdh entries!');
        console.log(`📍 Single kdfhgfdh icon positioned at (${newPosition.x}, ${newPosition.y})`);
        console.log('🔗 Check live result at: https://webtoys.ai/public/toybox-os');
        
    } catch (error) {
        console.error('❌ Error fixing duplicates:', error.message);
        process.exit(1);
    }
}

if (process.argv[1].endsWith('fix-duplicate-kdfhgfdh.js')) {
    fixDuplicateKdfhgfdh();
}

export { fixDuplicateKdfhgfdh };