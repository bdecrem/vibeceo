#!/usr/bin/env node

/**
 * Add System 7 Interaction Enhancements to WEBTOYS-OS
 * 
 * This script adds the System 7 interaction JavaScript to the current WEBTOYS-OS HTML
 * while preserving all existing functionality
 */

import { safeUpdateWebtoysOS } from './scripts/safe-webtoys-update-wrapper.js';
import * as fs from 'fs';

async function addSystem7Interactions() {
    try {
        console.log('🎯 Adding System 7 interaction enhancements to WEBTOYS-OS...');
        
        // Read current WEBTOYS-OS HTML
        console.log('📖 Reading current WEBTOYS-OS HTML...');
        const currentHTML = fs.readFileSync('./current-webtoys-os.html', 'utf8');
        
        // Read System 7 interactions JavaScript
        console.log('📖 Reading System 7 interactions JavaScript...');
        const interactionsJS = fs.readFileSync('./system7-interactions.js', 'utf8');
        
        // Find the closing </body> tag to insert new script
        const bodyEndPattern = /<\/body>/;
        const match = currentHTML.match(bodyEndPattern);
        
        if (!match) {
            throw new Error('Could not find closing body tag to insert System 7 interactions');
        }
        
        // Insert System 7 interactions as a new script tag before </body>
        const insertionPoint = match.index;
        const beforeInsertion = currentHTML.substring(0, insertionPoint);
        const afterInsertion = currentHTML.substring(insertionPoint);
        
        const newHTML = beforeInsertion + 
            '\n    <script>\n' +
            '        // === SYSTEM 7 INTERACTION ENHANCEMENTS ===\n' +
            '        ' + interactionsJS.split('\n').join('\n        ') + '\n' +
            '    </script>\n' +
            afterInsertion;
        
        console.log('🔍 Integration details:');
        console.log('   ✅ Marquee desktop selection system');
        console.log('   ✅ Enhanced window focus management'); 
        console.log('   ✅ Improved icon selection with multi-select');
        console.log('   ✅ System 7 keyboard shortcuts (Cmd+A, Escape)');
        console.log('   ✅ Authentic menu bar hover behavior');
        console.log('   ✅ Window resize handles');
        
        // Apply update using safe wrapper
        console.log('\\n🚀 Applying System 7 interaction enhancements...');
        const result = await safeUpdateWebtoysOS(
            newHTML,
            'Added System 7 interaction enhancements - marquee selection, enhanced focus, keyboard shortcuts'
        );
        
        console.log('\\n🎉 SYSTEM 7 INTERACTIONS ADDED!');
        console.log('🔗 WEBTOYS-OS now has authentic System 7 behaviors');
        console.log('📱 Visit: https://webtoys.ai/public/webtoys-os');
        console.log(`💾 Backup available for rollback if needed`);
        
        console.log('\\n📋 New behaviors available:');
        console.log('   🖱️  Click and drag on desktop to select multiple icons');
        console.log('   ⌨️  Cmd+A to select all icons');
        console.log('   ⌨️  Escape to clear selections');
        console.log('   🪟 Click windows to see authentic active/inactive states');
        console.log('   📱 Improved icon selection and double-click behavior');
        console.log('   🎛️  Enhanced menu bar with proper hover behavior');
        
        return result;
        
    } catch (error) {
        console.error('❌ Failed to add System 7 interactions:', error.message);
        console.log('🔄 Safe backup system has preserved your original WEBTOYS-OS');
        throw error;
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    addSystem7Interactions();
}

export { addSystem7Interactions };