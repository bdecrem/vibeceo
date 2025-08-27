#!/usr/bin/env node

import { fetchCurrentToyBoxOS } from './safe-update-wrapper.js';

async function checkStructure() {
    try {
        const current = await fetchCurrentToyBoxOS();
        const html = current.html_content;
        
        // Look for windowedApps pattern
        if (html.includes('window.windowedApps')) {
            console.log('✅ Found window.windowedApps');
            
            // Extract a portion to see the structure
            const startIdx = html.indexOf('window.windowedApps');
            const snippet = html.substring(startIdx, startIdx + 500);
            console.log('\nStructure preview:');
            console.log(snippet);
        } else if (html.includes('windowedApps')) {
            console.log('✅ Found windowedApps (without window.)');
            
            const startIdx = html.indexOf('windowedApps');
            const snippet = html.substring(startIdx, startIdx + 500);
            console.log('\nStructure preview:');
            console.log(snippet);
        } else {
            console.log('❌ No windowedApps found');
        }
        
        // Check for desktop icons
        if (html.includes('desktop-icon')) {
            console.log('\n✅ Found desktop-icon elements');
            
            // Find Community Notepad
            if (html.includes('community-notepad')) {
                console.log('✅ Found community-notepad reference');
            }
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

checkStructure();
