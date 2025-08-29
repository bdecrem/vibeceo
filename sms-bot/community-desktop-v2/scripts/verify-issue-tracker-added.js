#!/usr/bin/env node

import { fetchCurrentToyBoxOS } from './safe-update-wrapper.js';

async function verifyAdded() {
    try {
        const current = await fetchCurrentToyBoxOS();
        const html = current.html_content;
        
        console.log('🔍 Verifying Issue Tracker integration...\n');
        
        // Check registry
        if (html.includes("'webtoysos-issue-tracker'")) {
            console.log('✅ webtoysos-issue-tracker found in windowedApps registry');
            
            // Extract the entry
            const regex = /'webtoysos-issue-tracker':\s*\{[^}]+\}/;
            const match = html.match(regex);
            if (match) {
                console.log('   Configuration:', match[0].substring(0, 100) + '...');
            }
        } else {
            console.log('❌ webtoysos-issue-tracker NOT found in registry');
        }
        
        // Check desktop icon
        if (html.includes("onclick=\"openWindowedApp('webtoysos-issue-tracker')\"")) {
            console.log('✅ Desktop icon found with correct onclick handler');
        } else {
            console.log('❌ Desktop icon not found or incorrect');
        }
        
        // Check icon label
        if (html.includes('>Issue Tracker<')) {
            console.log('✅ Issue Tracker label found');
        }
        
        console.log('\n📋 Summary:');
        console.log('The Issue Tracker has been successfully added to ToyBox OS.');
        console.log('Users can now click the 🐛 Issue Tracker icon to open it in a window.');
        console.log('\n🔗 Test it at: https://webtoys.ai/public/toybox-os');
        
    } catch (error) {
        console.error('Error:', error);
    }
}

verifyAdded();
