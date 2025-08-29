#!/usr/bin/env node

/**
 * Final fix for kdfhgfdh - clean up remaining HTML structure issues
 */

import { fetchCurrentToyBoxOS, safeUpdateToyBoxOS } from './safe-update-wrapper.js';
import fs from 'fs';
import path from 'path';

// Ensure we're in the right directory
process.chdir(path.dirname(process.argv[1]));

async function fixKdfhgfdhFinal() {
    console.log('🔧 Final cleanup of kdfhgfdh HTML structure...');
    
    try {
        // Get current HTML
        const data = await fetchCurrentToyBoxOS();
        let html = data.html_content;
        
        // Count current issues
        const beforeMatches = html.match(/kdfhgfdh/g);
        console.log(`📊 Before: ${beforeMatches ? beforeMatches.length : 0} 'kdfhgfdh' references`);
        
        // 1. Fix broken HTML structure around kdfhgfdh
        console.log('🧹 Fixing broken HTML structures...');
        
        // Remove any broken or duplicate kdfhgfdh entries
        html = html.replace(/<\/div><div class="label">kdfhgfdh[\s\S]*?<\/div>/g, '');
        html = html.replace(/<div class="label">kdfhgfdh[\s\S]*?<\/div>/g, '');
        
        // Remove orphaned kdfhgfdh labels without proper structure
        html = html.replace(/\s*<\/div>\s*<div class="label">kdfhgfdh\s*/g, '');
        
        // Remove any existing kdfhgfdh desktop icons (we'll add one clean one)
        html = html.replace(/\s*<!-- kdfhgfdh by Anonymous -->\s*\n\s*<div class="desktop-icon"[\s\S]*?onclick="openWindowedApp\('kdfhgfdh'\)"[\s\S]*?<\/div>\s*/g, '');
        
        // 2. Find the best position (avoid conflicts)
        console.log('📍 Finding optimal position...');
        
        // Extract existing positions
        const iconPattern = /style="left:\s*(\d+)px;\s*top:\s*(\d+)px;"/g;
        const positions = [];
        let match;
        while ((match = iconPattern.exec(html)) !== null) {
            positions.push({ x: parseInt(match[1]), y: parseInt(match[2]) });
        }
        
        // Find first available 100px grid position
        let newPosition = { x: 620, y: 20 }; // Default fallback
        for (let y = 20; y <= 400; y += 100) {
            for (let x = 20; x <= 700; x += 100) {
                const isFree = !positions.some(p => 
                    Math.abs(p.x - x) < 90 && Math.abs(p.y - y) < 90
                );
                if (isFree) {
                    newPosition = { x, y };
                    break;
                }
            }
            if (newPosition.x !== 620 || newPosition.y !== 20) break;
        }
        
        console.log(`📍 Selected position: (${newPosition.x}, ${newPosition.y})`);
        
        // 3. Add ONE clean kdfhgfdh icon
        const cleanIconHtml = `
    <!-- kdfhgfdh by Anonymous -->
    <div class="desktop-icon" 
         style="left: ${newPosition.x}px; top: ${newPosition.y}px;"
         onclick="openWindowedApp('kdfhgfdh')"
         title="kdfhgfdh">
        <div class="icon">😀</div>
        <div class="label">kdfhgfdh</div>
    </div>`;
        
        // Insert before the menu bar
        const menuBarPattern = '</div><!-- end desktop -->';
        if (html.includes(menuBarPattern)) {
            html = html.replace(menuBarPattern, cleanIconHtml + '\n    ' + menuBarPattern);
        } else {
            console.log('⚠️ Could not find menu bar marker');
        }
        
        // 4. Ensure windowedApps registry is clean
        console.log('🔧 Cleaning windowedApps registry...');
        
        // Remove any duplicate kdfhgfdh entries
        html = html.replace(/\s*'kdfhgfdh':\s*{[^}]*},?\s*/g, '');
        
        // Add one clean entry at the beginning
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
        
        // 5. Final cleanup
        console.log('🧽 Final HTML cleanup...');
        
        // Fix any broken div structures
        html = html.replace(/(<\/div>)\s*(<\/div>)\s*<!--\s*end desktop\s*-->/g, '$1\n    $2<!-- end desktop -->');
        
        // Remove any orphaned closing divs before desktop end
        html = html.replace(/\s*<\/div>\s*<\/div>\s*<\/div>\s*<!--\s*end desktop\s*-->/g, '\n    </div><!-- end desktop -->');
        
        // Count final references
        const afterMatches = html.match(/kdfhgfdh/g);
        console.log(`📊 After: ${afterMatches ? afterMatches.length : 0} 'kdfhgfdh' references`);
        
        // Save preview
        fs.writeFileSync('kdfhgfdh-fixed-final.html', html);
        console.log('💾 Saved preview to kdfhgfdh-fixed-final.html');
        
        // Apply the fix
        console.log('🚀 Applying final fix...');
        await safeUpdateToyBoxOS(html, 'Final cleanup of kdfhgfdh HTML structure and positioning');
        
        console.log('✅ Final kdfhgfdh fix completed successfully!');
        console.log(`📍 kdfhgfdh positioned cleanly at (${newPosition.x}, ${newPosition.y})`);
        console.log('🔗 Check result at: https://webtoys.ai/public/toybox-os');
        
    } catch (error) {
        console.error('❌ Error in final fix:', error.message);
        process.exit(1);
    }
}

if (process.argv[1].endsWith('fix-kdfhgfdh-final.js')) {
    fixKdfhgfdhFinal();
}

export { fixKdfhgfdhFinal };