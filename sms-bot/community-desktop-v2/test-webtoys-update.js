#!/usr/bin/env node

import { safeUpdateWebtoysOS } from './scripts/safe-webtoys-update-wrapper.js';
import * as fs from 'fs';

async function testUpdate() {
    try {
        // Read the modified HTML
        const modifiedHtml = fs.readFileSync('./current-webtoys-os.html', 'utf8');
        
        // Apply the safe update
        await safeUpdateWebtoysOS(modifiedHtml, 'Removed cleanup confirmation message');
        
        console.log('🎉 Test update completed successfully!');
        
    } catch (error) {
        console.error('❌ Test update failed:', error.message);
        process.exit(1);
    }
}

testUpdate();