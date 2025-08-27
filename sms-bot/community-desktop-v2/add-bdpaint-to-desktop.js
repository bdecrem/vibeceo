#!/usr/bin/env node

/**
 * Add BDpaint to ToyBox OS Desktop
 * Safely adds the BDpaint app icon and registration to ToyBox OS
 */

import { fetchCurrentToyBoxOS, safeUpdateToyBoxOS } from './scripts/safe-update-wrapper.js';

async function addBDpaintToDesktop() {
    try {
        console.log('🎨 Adding BDpaint to ToyBox OS desktop...');
        
        // Fetch current ToyBox OS HTML
        const current = await fetchCurrentToyBoxOS();
        let html = current.html_content;
        
        // Step 1: Add BDpaint to windowedApps registry
        if (!html.includes("'bdpaint':")) {
            console.log('📱 Adding BDpaint to app registry...');
            
            const appRegistration = `            'bdpaint': {
                name: 'BDpaint',
                url: '/public/bdpaint',
                icon: '🎨',
                width: 700,
                height: 500
            },`;
            
            // Add after windowedApps declaration
            html = html.replace(
                'window.windowedApps = {',
                `window.windowedApps = {
${appRegistration}`
            );
            
            console.log('✅ Added BDpaint to app registry');
        } else {
            console.log('ℹ️  BDpaint already in app registry');
        }
        
        // Step 2: Add BDpaint desktop icon
        if (!html.includes('onclick="openWindowedApp(\'bdpaint\')"')) {
            console.log('🖼️  Adding BDpaint desktop icon...');
            
            // Find a good place to add the icon - after the Notepad icon
            const paintIcon = `            <div class="desktop-icon" onclick="openWindowedApp('bdpaint')">
                <div class="icon">🎨</div>
                <div class="label">BDpaint</div>
            </div>`;
            
            // Add after Notepad icon if it exists, or after other icons
            if (html.includes('Community Notepad')) {
                html = html.replace(
                    /<div class="desktop-icon"[^>]*>[\s\S]*?📝[\s\S]*?Community Notepad[\s\S]*?<\/div>\s*<\/div>/,
                    (match) => match + '\n\n' + paintIcon
                );
            } else if (html.includes('class="desktop-icon"')) {
                // Add after the first desktop icon we find
                html = html.replace(
                    /(<div class="desktop-icon"[^>]*>[\s\S]*?<\/div>\s*<\/div>)/,
                    '$1\n\n' + paintIcon
                );
            } else {
                // Add in the desktop area
                html = html.replace(
                    /<div class="desktop-area">/,
                    `<div class="desktop-area">
${paintIcon}`
                );
            }
            
            console.log('✅ Added BDpaint desktop icon');
        } else {
            console.log('ℹ️  BDpaint icon already exists');
        }
        
        // Step 3: Save the updated HTML
        await safeUpdateToyBoxOS(html, 'Added BDpaint application to desktop');
        
        console.log('\n🎉 SUCCESS! BDpaint has been added to ToyBox OS');
        console.log('📋 Features added:');
        console.log('  • Desktop icon with paint brush emoji 🎨');
        console.log('  • Opens in 700x500px window');
        console.log('  • Full paint functionality with colors, brush sizes');
        console.log('  • Save/Load paintings via ZAD system');
        console.log('  • Integrates with ToyBox OS authentication');
        
        console.log('\n🧪 To test:');
        console.log('  1. Refresh ToyBox OS at https://webtoys.ai/public/toybox-os');
        console.log('  2. Click the BDpaint (🎨) icon');
        console.log('  3. Start painting!');
        console.log('  4. Try Save/Load to test persistence');
        
    } catch (error) {
        console.error('❌ Failed to add BDpaint:', error.message);
        process.exit(1);
    }
}

// Run
addBDpaintToDesktop();