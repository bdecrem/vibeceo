#!/usr/bin/env node

import { fetchCurrentToyBoxOS } from './safe-update-wrapper.js';

async function verifyBothFeatures() {
    try {
        console.log('🧪 Verifying both Clean Up and Persistent Trash features...');
        
        const current = await fetchCurrentToyBoxOS();
        const html = current.html_content;
        
        console.log('\n📋 CLEAN UP FUNCTIONALITY:');
        
        // Check Clean Up menu structure
        const hasSpecialMenu = html.includes('onclick="toggleSpecialMenu(event)">Special');
        const hasCleanUpItem = html.includes('onclick="cleanUpDesktop(event)">Clean Up');
        const hasDropdownMenu = html.includes('<div class="dropdown-menu" id="specialMenu"');
        
        console.log(`   Special menu: ${hasSpecialMenu ? '✅' : '❌'}`);
        console.log(`   Clean Up item: ${hasCleanUpItem ? '✅' : '❌'}`);
        console.log(`   Dropdown structure: ${hasDropdownMenu ? '✅' : '❌'}`);
        
        // Check Clean Up JavaScript functions
        const hasToggleFunction = html.includes('function toggleSpecialMenu(event)');
        const hasCleanupFunction = html.includes('async function cleanUpDesktop(event)');
        const hasTopPadding = html.includes('const paddingTop = 80');
        const hasSaveCall = html.includes('await saveIconPositions()');
        
        console.log(`   toggleSpecialMenu: ${hasToggleFunction ? '✅' : '❌'}`);
        console.log(`   cleanUpDesktop: ${hasCleanupFunction ? '✅' : '❌'}`);
        console.log(`   80px top padding: ${hasTopPadding ? '✅' : '❌'}`);
        console.log(`   Saves positions: ${hasSaveCall ? '✅' : '❌'}`);
        
        console.log('\n🗑️  PERSISTENT TRASH FUNCTIONALITY:');
        
        // Check persistent trash implementation
        const hasHideInsteadOfRemove = html.includes('draggedIcon.style.display = \'none\';');
        const hasHideMessage = html.includes('Hide "');
        const hasHiddenFeedback = html.includes('hidden from desktop');
        const hasTrashConfirm = html.includes('confirm(\'Hide "');
        
        console.log(`   Hides instead of removes: ${hasHideInsteadOfRemove ? '✅' : '❌'}`);
        console.log(`   "Hide" confirmation: ${hasHideMessage ? '✅' : '❌'}`);
        console.log(`   "Hidden" feedback: ${hasHiddenFeedback ? '✅' : '❌'}`);
        console.log(`   Proper confirmation: ${hasTrashConfirm ? '✅' : '❌'}`);
        
        console.log('\n⚙️  SHARED PERSISTENCE SYSTEM:');
        
        // Check shared persistence functions
        const hasSaveIconPositions = html.includes('async function saveIconPositions()');
        const hasLoadIconPositions = html.includes('async function loadIconPositions()');
        const hasVisibleProperty = html.includes('visible: icon.style.display !== \'none\'');
        const hasVisibleRestore = html.includes('icon.style.display = savedIcon.visible ? \'\' : \'none\'');
        
        console.log(`   saveIconPositions: ${hasSaveIconPositions ? '✅' : '❌'}`);
        console.log(`   loadIconPositions: ${hasLoadIconPositions ? '✅' : '❌'}`);
        console.log(`   Captures visible state: ${hasVisibleProperty ? '✅' : '❌'}`);
        console.log(`   Restores visible state: ${hasVisibleRestore ? '✅' : '❌'}`);
        
        // Overall status
        const cleanUpChecks = [hasSpecialMenu, hasCleanUpItem, hasDropdownMenu, hasToggleFunction, hasCleanupFunction, hasTopPadding];
        const trashChecks = [hasHideInsteadOfRemove, hasHideMessage, hasHiddenFeedback, hasTrashConfirm];
        const persistenceChecks = [hasSaveIconPositions, hasLoadIconPositions, hasVisibleProperty, hasVisibleRestore];
        
        const cleanUpPassed = cleanUpChecks.filter(check => check).length;
        const trashPassed = trashChecks.filter(check => check).length;
        const persistencePassed = persistenceChecks.filter(check => check).length;
        
        console.log('\n🏆 OVERALL STATUS:');
        console.log(`   Clean Up: ${cleanUpPassed}/${cleanUpChecks.length} checks passed`);
        console.log(`   Persistent Trash: ${trashPassed}/${trashChecks.length} checks passed`);
        console.log(`   Shared Persistence: ${persistencePassed}/${persistenceChecks.length} checks passed`);
        
        if (cleanUpPassed === cleanUpChecks.length && trashPassed === trashChecks.length && persistencePassed === persistenceChecks.length) {
            console.log('\n🎉 SUCCESS! Both features are fully implemented and should work perfectly!');
            console.log('\n📋 TEST PLAN:');
            console.log('   1. Go to https://webtoys.ai/public/toybox-os');
            console.log('   2. Test Clean Up: Special → Clean Up (icons arrange in grid)');
            console.log('   3. Test Persistent Trash: Drag icon to trash (hides persistently)');
            console.log('   4. Test Reload: Refresh page (hidden icons stay hidden)');
        } else {
            console.log('\n⚠️  Some features may not work correctly');
        }
        
    } catch (error) {
        console.error('❌ Error verifying features:', error);
        process.exit(1);
    }
}

// Run the script
verifyBothFeatures();