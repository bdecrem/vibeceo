#!/usr/bin/env node

/**
 * Update the Issue Tracker name to "Fixit Board" in ToyBox OS
 */

import { fetchCurrentToyBoxOS, safeUpdateToyBoxOS } from './safe-update-wrapper.js';

async function updateName() {
    try {
        console.log('📥 Fetching current ToyBox OS...');
        const current = await fetchCurrentToyBoxOS();
        let html = current.html_content;
        
        console.log('🔍 Updating Issue Tracker name to Fixit Board...');
        
        // Update in windowedApps registry
        html = html.replace(
            "'webtoysos-issue-tracker': {\n                name: 'Issue Tracker (Bart)',",
            "'webtoysos-issue-tracker': {\n                name: 'Fixit Board',"
        );
        
        // Update desktop icon label
        html = html.replace(
            '<div class="label">Issue Tracker</div>',
            '<div class="label">Fixit Board</div>'
        );
        
        console.log('💾 Saving updated ToyBox OS...');
        await safeUpdateToyBoxOS(html, 'Updated Issue Tracker name to Fixit Board');
        
        console.log('✅ Successfully updated name to "Fixit Board"!');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

updateName();