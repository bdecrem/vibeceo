#!/usr/bin/env node

import { fetchCurrentToyBoxOS } from './safe-update-wrapper.js';

async function findDefinition() {
    try {
        const current = await fetchCurrentToyBoxOS();
        const html = current.html_content;
        
        // Look for where windowedApps is defined/initialized
        const patterns = [
            'windowedApps = {',
            'windowedApps={',
            'const windowedApps',
            'let windowedApps',
            'var windowedApps',
            'window.windowedApps = {'
        ];
        
        for (const pattern of patterns) {
            if (html.includes(pattern)) {
                console.log(`✅ Found pattern: "${pattern}"`);
                const idx = html.indexOf(pattern);
                const endIdx = html.indexOf('};', idx) + 2;
                if (endIdx > idx) {
                    const definition = html.substring(idx, Math.min(endIdx, idx + 1000));
                    console.log('\nDefinition found:');
                    console.log(definition.substring(0, 500));
                    return;
                }
            }
        }
        
        // Maybe it's registered differently
        console.log('\n🔍 Searching for alternative patterns...');
        
        // Check if apps are registered individually
        if (html.includes("windowedApps['")) {
            console.log("✅ Found individual app registrations (windowedApps['...')");
            
            // Find all registrations
            const regex = /windowedApps\['([^']+)'\]\s*=\s*\{/g;
            let match;
            const apps = [];
            while ((match = regex.exec(html)) !== null) {
                apps.push(match[1]);
            }
            
            if (apps.length > 0) {
                console.log('\nRegistered apps:', apps);
            }
        }
        
        // Check if there's an initialization
        if (!html.includes('windowedApps')) {
            console.log('❌ No windowedApps found at all in the HTML');
        } else {
            console.log('\n⚠️ windowedApps is referenced but definition pattern not found');
            console.log('Might need to initialize it first');
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

findDefinition();
