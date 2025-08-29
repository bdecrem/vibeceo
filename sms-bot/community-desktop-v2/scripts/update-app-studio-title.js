#!/usr/bin/env node

/**
 * Update App Studio title bar - minimal surgical change
 * Removes blue gradient, makes it clean white with bold text
 */

import { fetchCurrentAppStudio, safeUpdateAppStudio } from './safe-update-wrapper.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function updateAppStudioTitle() {
    console.log('🎨 Updating App Studio title bar...');
    
    try {
        // Read the local updated version
        const localPath = path.join(__dirname, '../app-studio.html');
        const updatedHtml = fs.readFileSync(localPath, 'utf8');
        
        console.log('📝 Changes made:');
        console.log('  - Removed blue gradient background');
        console.log('  - Changed to clean white background');
        console.log('  - Made "App Studio" text larger (24px) and bold');
        console.log('  - Added subtle border at bottom');
        
        // Update on Supabase with backup
        await safeUpdateAppStudio(updatedHtml, 'Remove blue title bar, use clean bold text instead');
        
        console.log('✅ App Studio title updated successfully!');
        console.log('🔗 View at: https://webtoys.ai/community/app-studio');
        
    } catch (error) {
        console.error('❌ Error updating App Studio:', error.message);
        process.exit(1);
    }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    updateAppStudioTitle();
}

export { updateAppStudioTitle };