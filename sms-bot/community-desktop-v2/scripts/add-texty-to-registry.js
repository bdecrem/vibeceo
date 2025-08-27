#!/usr/bin/env node

/**
 * Add TEXTY to windowedApps registry only
 * The onclick is already correct, we just need the registry entry
 */

import { fetchCurrentToyBoxOS, safeUpdateToyBoxOS } from './safe-update-wrapper.js';

async function main() {
    try {
        console.log('➕ Adding TEXTY to windowedApps registry...');
        
        const current = await fetchCurrentToyBoxOS();
        let html = current.html_content;
        
        // Check if texty already exists
        if (html.includes("'texty'") || html.includes('"texty"')) {
            console.log('ℹ️  TEXTY already exists in windowedApps registry');
            return;
        }
        
        // Find the last complete app entry and add after it
        // Look for a pattern like: icon: '🎨', width: 800, height: 600 }
        const lastAppPattern = /(icon:\s*'[^']*',\s*width:\s*\d+,\s*height:\s*\d+\s*})/g;
        
        let lastMatch;
        let match;
        while ((match = lastAppPattern.exec(html)) !== null) {
            lastMatch = match;
        }
        
        if (lastMatch) {
            const insertionPoint = lastMatch.index + lastMatch[0].length;
            
            const textyEntry = `,
            'texty': {
                name: 'TEXTY',
                url: '/public/texty',
                icon: '📄',
                width: 700,
                height: 500
            }`;
            
            const before = html.substring(0, insertionPoint);
            const after = html.substring(insertionPoint);
            
            html = before + textyEntry + after;
            
            console.log('✅ Found insertion point and added TEXTY');
            
            // Apply the update
            await safeUpdateToyBoxOS(html, 'Added TEXTY to windowedApps registry');
            
            console.log('✅ TEXTY added to windowedApps registry!');
            console.log('🔗 Test at: https://webtoys.ai/public/toybox-os');
            console.log('📄 TEXTY should now open in desktop window');
            
        } else {
            console.error('❌ Could not find insertion point for TEXTY');
        }
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();