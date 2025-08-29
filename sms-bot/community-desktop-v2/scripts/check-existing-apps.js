#!/usr/bin/env node

import { fetchCurrentToyBoxOS } from './safe-update-wrapper.js';

async function checkExistingApps() {
    try {
        const current = await fetchCurrentToyBoxOS();
        const html = current.html_content;
        
        // Extract the windowedApps definition
        const startIdx = html.indexOf('windowedApps = {');
        const endIdx = html.indexOf('};', startIdx) + 2;
        
        if (startIdx > -1 && endIdx > startIdx) {
            const appsSection = html.substring(startIdx, endIdx);
            console.log('Current windowedApps definition:');
            console.log(appsSection);
            
            if (appsSection.includes('webtoysos-issue-tracker')) {
                console.log('\n✅ webtoysos-issue-tracker is already registered');
            } else {
                console.log('\n❌ webtoysos-issue-tracker is NOT registered yet');
            }
            
            if (appsSection.includes('toybox-issue-tracker')) {
                console.log('ℹ️ toybox-issue-tracker exists (different app)');
            }
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

checkExistingApps();
