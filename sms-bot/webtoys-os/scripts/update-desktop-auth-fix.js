#!/usr/bin/env node

/**
 * Fix: Update desktop-v3 to properly set participantId for ZAD API compatibility
 */

import { fetchCurrentDesktop, safeUpdateDesktop } from './safe-wrapper.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function updateDesktopAuth() {
    try {
        console.log('📥 Reading updated desktop-v3.html from local file...');
        const desktopPath = path.join(__dirname, '..', 'core', 'desktop-v3.html');
        const updatedHtml = fs.readFileSync(desktopPath, 'utf8');
        
        console.log('💾 Updating desktop with participantId fix...');
        await safeUpdateDesktop(
            updatedHtml, 
            'Fixed: Added participantId field for ZAD API compatibility',
            true  // Use test mode (toybox-os-v3-test)
        );
        
        console.log('✅ Desktop updated successfully!');
        console.log('🔧 Auth system now properly sets participantId for ZAD apps');
        console.log('📝 TextZ and other ZAD apps should now save data correctly');
        
    } catch (error) {
        console.error('❌ Failed to update desktop:', error.message);
        process.exit(1);
    }
}

updateDesktopAuth();