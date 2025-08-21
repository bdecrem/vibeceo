#!/usr/bin/env node

/**
 * Update App Studio to use dropdown for app type selection
 * Replaces 4 card buttons with a single dropdown, defaulting to Windowed App
 */

import { fetchCurrentAppStudio, safeUpdateAppStudio } from './safe-update-wrapper.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function updateAppStudioDropdown() {
    console.log('📝 Updating App Studio with dropdown menu...');
    
    try {
        // Read the local updated version
        const localPath = path.join(__dirname, '../app-studio.html');
        const updatedHtml = fs.readFileSync(localPath, 'utf8');
        
        console.log('✅ Changes made:');
        console.log('  - Replaced 4 app type buttons with dropdown menu');
        console.log('  - Set default to "Windowed App"');
        console.log('  - Updated JavaScript to work with dropdown');
        console.log('  - Added initialization on page load');
        console.log('  - Preserved all other functionality');
        
        // Update on Supabase with automatic backup
        await safeUpdateAppStudio(updatedHtml, 'Replace app type buttons with dropdown, default to Windowed App');
        
        console.log('✅ App Studio updated successfully!');
        console.log('🔗 View at: https://webtoys.ai/community/app-studio');
        console.log('🧪 Test the dropdown to ensure it works correctly');
        
    } catch (error) {
        console.error('❌ Error updating App Studio:', error.message);
        process.exit(1);
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    updateAppStudioDropdown();
}

export { updateAppStudioDropdown };