#!/usr/bin/env node

/**
 * Add PAINTY paint app icon to WebtoysOS desktop
 */

import { fetchCurrentToyBoxOS, safeUpdateToyBoxOS } from './safe-update-wrapper.js';

async function addPaintyIcon() {
    try {
        console.log('🎨 Adding PAINTY icon to WebtoysOS desktop...');
        
        // Fetch current HTML
        const current = await fetchCurrentToyBoxOS();
        let html = current.html_content;
        
        // First, add PAINTY to the windowedApps registry
        const windowedAppsPattern = /(window\.windowedApps\s*=\s*\{[^}]*)(})/s;
        const windowedAppsMatch = html.match(windowedAppsPattern);
        
        if (windowedAppsMatch) {
            const newRegistryEntry = `    'painty': {
        name: 'PAINTY',
        url: '/public/painty',
        icon: '🎨',
        width: 700,
        height: 500
    },
`;
            const updatedRegistry = windowedAppsMatch[1] + newRegistryEntry + windowedAppsMatch[2];
            html = html.replace(windowedAppsPattern, updatedRegistry);
            console.log('✅ Added PAINTY to windowedApps registry');
        } else {
            console.log('❌ Could not find windowedApps registry');
            return;
        }
        
        // Now add the desktop icon
        const iconHtml = `            <div class="desktop-icon" onclick="openWindowedApp('painty')">
                <div class="icon">🎨</div>
                <div class="label">PAINTY</div>
            </div>
`;
        
        // Find where to insert the icon (after other app icons)
        const iconInsertPattern = /(            <div class="desktop-icon"[^>]*>\s*<div class="icon">[^<]*<\/div>\s*<div class="label">[^<]*<\/div>\s*<\/div>\s*)/g;
        
        // Find all existing icons
        const existingIcons = html.match(iconInsertPattern);
        if (existingIcons && existingIcons.length > 0) {
            // Insert after the last icon
            const lastIcon = existingIcons[existingIcons.length - 1];
            const insertAfterPattern = new RegExp(lastIcon.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
            html = html.replace(insertAfterPattern, lastIcon + '\n' + iconHtml);
            console.log('✅ Added PAINTY desktop icon');
        } else {
            console.log('❌ Could not find desktop icons area');
            return;
        }
        
        // Apply the update safely
        await safeUpdateToyBoxOS(html, 'Added PAINTY paint application icon to desktop');
        
        console.log('✅ PAINTY icon added successfully!');
        console.log('🌐 View at: https://webtoys.ai/public/toybox-os');
        console.log('🔧 Local test: http://localhost:3000/public/toybox-os');
        
    } catch (error) {
        console.error('❌ Failed to add PAINTY icon:', error);
        process.exit(1);
    }
}

addPaintyIcon();