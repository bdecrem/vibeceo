#!/usr/bin/env node

/**
 * Test script to verify Clean Up functionality is working
 * This will check all the required components
 */

import { fetchCurrentToyBoxOS } from './safe-update-wrapper.js';

async function testCleanupFunctionality() {
    try {
        console.log('🧪 Testing Clean Up functionality...');
        
        const current = await fetchCurrentToyBoxOS();
        const html = current.html_content;
        
        // Check 1: HTML menu structure
        const hasSpecialMenu = html.includes('onclick="toggleSpecialMenu(event)">Special');
        const hasCleanUpItem = html.includes('onclick="cleanUpDesktop(event)">Clean Up');
        
        console.log(`\n📋 HTML Structure:`);
        console.log(`   Special menu: ${hasSpecialMenu ? '✅' : '❌'}`);
        console.log(`   Clean Up item: ${hasCleanUpItem ? '✅' : '❌'}`);
        
        // Check 2: JavaScript functions
        const hasToggleFunction = html.includes('function toggleSpecialMenu(event)');
        const hasCleanupFunction = html.includes('async function cleanUpDesktop(event)');
        const hasFeedbackFunction = html.includes('function showCleanupFeedback()');
        
        console.log(`\n🔧 JavaScript Functions:`);
        console.log(`   toggleSpecialMenu: ${hasToggleFunction ? '✅' : '❌'}`);
        console.log(`   cleanUpDesktop: ${hasCleanupFunction ? '✅' : '❌'}`);
        console.log(`   showCleanupFeedback: ${hasFeedbackFunction ? '✅' : '❌'}`);
        
        // Check 3: Key functionality
        const hasSaveIconPositions = html.includes('await saveIconPositions()');
        const hasGridLayout = html.includes('const iconsPerRow = 6');
        const hasPaddingVars = html.includes('const paddingTop = 80');
        
        console.log(`\n⚙️  Core Functionality:`);
        console.log(`   saveIconPositions: ${hasSaveIconPositions ? '✅' : '❌'}`);
        console.log(`   Grid layout (6 cols): ${hasGridLayout ? '✅' : '❌'}`);
        console.log(`   Top padding (80px): ${hasPaddingVars ? '✅' : '❌'}`);
        
        // Summary
        const allChecks = [
            hasSpecialMenu, hasCleanUpItem, hasToggleFunction, 
            hasCleanupFunction, hasFeedbackFunction, hasSaveIconPositions,
            hasGridLayout, hasPaddingVars
        ];
        
        const passed = allChecks.filter(check => check).length;
        const total = allChecks.length;
        
        console.log(`\n🏆 Overall Status: ${passed}/${total} checks passed`);
        
        if (passed === total) {
            console.log('✅ Clean Up functionality is fully implemented!');
            console.log('\n📋 To use:');
            console.log('   1. Go to https://webtoys.ai/public/toybox-os');
            console.log('   2. Click "Special" in the menu bar');
            console.log('   3. Click "Clean Up" in the dropdown');
            console.log('   4. Watch icons arrange in a neat grid!');
        } else {
            console.log('⚠️  Some components are missing - functionality may not work');
        }
        
    } catch (error) {
        console.error('❌ Error testing Clean Up functionality:', error);
        process.exit(1);
    }
}

// Run the script
testCleanupFunctionality();