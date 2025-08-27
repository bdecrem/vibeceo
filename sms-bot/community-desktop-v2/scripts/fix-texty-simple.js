#!/usr/bin/env node

/**
 * Simple fix for TEXTY - just add it to windowedApps and fix the onclick
 * More careful approach to avoid breaking JavaScript
 */

import { fetchCurrentToyBoxOS, safeUpdateToyBoxOS } from './safe-update-wrapper.js';

async function main() {
    try {
        console.log('🔧 Simple fix for TEXTY...');
        
        // Step 1: Get current HTML
        const current = await fetchCurrentToyBoxOS();
        let html = current.html_content;
        
        // Step 2: Check if TEXTY icon exists with window.open and fix it
        const windowOpenPattern = /onclick="window\.open\('\/public\/texty'[^"]*"\)/;
        if (html.match(windowOpenPattern)) {
            html = html.replace(windowOpenPattern, `onclick="openWindowedApp('texty')"`);
            console.log('✅ Fixed TEXTY icon onclick to use openWindowedApp');
        }
        
        // Step 3: Check if texty is already in windowedApps
        if (!html.includes("'texty'") && !html.includes('"texty"')) {
            // Find a good place to add it - after the last app entry
            const pattern = /(width: \d+,\s*height: \d+\s*}\s*)(};)/;
            const match = html.match(pattern);
            
            if (match) {
                const textyEntry = `,
            'texty': {
                name: 'TEXTY',
                url: '/public/texty',
                icon: '📄',
                width: 700,
                height: 500
            }`;
                
                const replacement = match[1] + textyEntry + '\n        ' + match[2];
                html = html.replace(pattern, replacement);
                console.log('✅ Added TEXTY to windowedApps registry');
            } else {
                console.log('❌ Could not find insertion point for TEXTY');
                return;
            }
        } else {
            console.log('ℹ️  TEXTY already exists in windowedApps');
        }
        
        // Step 4: Quick syntax validation
        const jsSection = html.substring(html.indexOf('window.windowedApps'), html.indexOf('};', html.indexOf('window.windowedApps')) + 2);
        
        // Count braces
        const openBraces = (jsSection.match(/{/g) || []).length;
        const closeBraces = (jsSection.match(/}/g) || []).length;
        
        if (openBraces !== closeBraces) {
            console.error('❌ Brace mismatch detected - aborting');
            console.log(`Open braces: ${openBraces}, Close braces: ${closeBraces}`);
            return;
        }
        
        // Step 5: Apply the update
        await safeUpdateToyBoxOS(html, 'Fixed TEXTY to work in virtual desktop');
        
        console.log('✅ TEXTY fixed successfully!');
        console.log('🔗 Test at: https://webtoys.ai/public/toybox-os');
        console.log('📄 TEXTY should now open in a desktop window');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

main();