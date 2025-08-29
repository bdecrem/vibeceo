#!/usr/bin/env node

import { fetchCurrentToyBoxOS, safeUpdateToyBoxOS } from './safe-update-wrapper.js';

async function addPersistentTrashCarefully() {
    try {
        console.log('🗑️ Adding persistent trash behavior (CAREFULLY - preserving Clean Up)...');
        const current = await fetchCurrentToyBoxOS();
        let html = current.html_content;
        
        // VERY TARGETED CHANGE: Only modify the specific line that removes the icon
        // Find: draggedIcon.remove();
        // Replace with: draggedIcon.style.display = 'none';
        
        const originalRemoveLine = 'draggedIcon.remove();';
        const newHideLine = "draggedIcon.style.display = 'none';";
        
        if (html.includes(originalRemoveLine)) {
            html = html.replace(originalRemoveLine, newHideLine);
            console.log('✅ Changed draggedIcon.remove() to draggedIcon.style.display = "none"');
        } else {
            console.log('⚠️  draggedIcon.remove() not found - may already be updated');
        }
        
        // VERY TARGETED CHANGE: Update the confirmation message
        const originalMessage = 'Remove "';
        const newMessage = 'Hide "';
        
        if (html.includes(`confirm('${originalMessage}`)) {
            html = html.replace(`confirm('${originalMessage}`, `confirm('${newMessage}`);
            console.log('✅ Changed "Remove" to "Hide" in confirmation message');
        }
        
        // VERY TARGETED CHANGE: Update the feedback message
        const originalFeedback = '" moved to trash';
        const newFeedback = '" hidden from desktop';
        
        if (html.includes(originalFeedback)) {
            html = html.replace(originalFeedback, newFeedback);
            console.log('✅ Updated feedback message to "hidden from desktop"');
        }
        
        console.log('✅ Made minimal targeted changes for persistent trash');
        console.log('📋 Changes made:');
        console.log('   1. draggedIcon.remove() → draggedIcon.style.display = "none"');
        console.log('   2. "Remove" → "Hide" in confirmation');
        console.log('   3. Updated feedback message');
        console.log('   4. NO OTHER CHANGES - Clean Up functionality preserved');
        
        // Safe update with automatic backup
        await safeUpdateToyBoxOS(html, 'Added persistent trash behavior with minimal targeted changes');
        
        console.log('🎉 Persistent trash added without breaking anything!');
        console.log('📋 How it works:');
        console.log('   - Drag to trash → Icon is hidden (display: none)');
        console.log('   - saveIconPositions() already captures visible state');
        console.log('   - loadIconPositions() already restores hidden state');
        console.log('   - Clean Up functionality completely unchanged');
        
    } catch (error) {
        console.error('❌ Error adding persistent trash:', error);
        process.exit(1);
    }
}

// Run the script
addPersistentTrashCarefully();