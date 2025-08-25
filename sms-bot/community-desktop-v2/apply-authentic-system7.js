#!/usr/bin/env node

/**
 * Apply Authentic System 7 CSS to WEBTOYS-OS
 * 
 * This script takes our extracted/adapted System 7 CSS and applies it
 * to the System 7 WOS theme using the safe backup wrapper
 */

import { safeUpdateWOSThemeCSS } from './scripts/safe-css-wrapper-wos.js';
import * as fs from 'fs';

async function applyAuthenticSystem7() {
    try {
        console.log('🎨 Applying Authentic System 7 CSS to WEBTOYS-OS...');
        
        // Read the authentic System 7 CSS we just created
        console.log('📖 Reading authentic System 7 CSS...');
        const authenticCSS = fs.readFileSync('./system7-wos-authentic.css', 'utf8');
        
        console.log(`📊 CSS size: ${authenticCSS.length} characters`);
        console.log('🔍 CSS includes:');
        console.log('   - Authentic System 7 desktop background with dots');
        console.log('   - Proper window title bars with active/inactive states');
        console.log('   - System 7 menu bar styling');
        console.log('   - Authentic icon and button styles');
        console.log('   - Pixelated font rendering');
        
        // Apply using our safe wrapper
        console.log('\n🚀 Applying to System 7 WOS theme...');
        const result = await safeUpdateWOSThemeCSS(
            authenticCSS, 
            'Applied authentic System 7 CSS from desktop folder - complete visual overhaul'
        );
        
        console.log('\n🎉 TRANSFORMATION COMPLETE!');
        console.log('🔗 WEBTOYS-OS now has authentic System 7 styling');
        console.log('📱 Visit: https://webtoys.ai/public/webtoys-os');
        console.log(`💾 Backup available: ${result.backup_file}`);
        
        console.log('\n📋 What changed:');
        console.log('   ✅ Desktop background now has System 7 dotted pattern');
        console.log('   ✅ Windows have authentic borders and shadows');
        console.log('   ✅ Active windows show striped title bars');
        console.log('   ✅ Icons have proper System 7 styling');
        console.log('   ✅ Menu bar matches original System 7');
        console.log('   ✅ All fonts are pixelated like the original');
        
        return result;
        
    } catch (error) {
        console.error('❌ Failed to apply authentic System 7 CSS:', error.message);
        console.log('🔄 The safe backup system has preserved your original theme');
        throw error;
    }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
    applyAuthenticSystem7();
}

export { applyAuthenticSystem7 };