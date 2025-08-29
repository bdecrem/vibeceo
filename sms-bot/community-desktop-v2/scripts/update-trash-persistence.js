#!/usr/bin/env node

import { fetchCurrentToyBoxOS, safeUpdateToyBoxOS } from './safe-update-wrapper.js';

async function updateTrashPersistence() {
    try {
        console.log('🗑️ Updating trash behavior to use persistent hiding...');
        const current = await fetchCurrentToyBoxOS();
        let html = current.html_content;
        
        // Find and replace the handleIconDragEnd function to use persistent hiding
        const oldTrashHandler = /if \(isOverTrash\) \{[\s\S]*?await saveIconPositions\(\); \/\/ After deletion[\s\S]*?\}/;
        
        const newTrashHandler = `if (isOverTrash) {
                    const iconName = draggedIcon.querySelector('.label').textContent;
                    if (confirm('Hide "' + iconName + '" from desktop?')) {
                        // Hide the icon instead of removing it
                        draggedIcon.style.display = 'none';
                        
                        // Save the hidden state persistently
                        await saveIconPositions();
                        
                        showTrashFeedback(iconName + ' hidden');
                        draggedIcon = null;
                        highlightTrash(false);
                        return;
                    }
                }`;
        
        if (html.match(oldTrashHandler)) {
            html = html.replace(oldTrashHandler, newTrashHandler);
            console.log('✅ Updated trash handler to use persistent hiding');
        } else {
            console.log('ℹ️  Trash handler pattern not found, may already be updated');
        }
        
        // Add a function to restore hidden icons
        const restoreFunction = `
        
        // Function to restore hidden icons (for debugging/admin)
        async function restoreAllHiddenIcons() {
            console.log('🔄 Restoring all hidden icons...');
            const icons = document.querySelectorAll('.desktop-icon:not(.trash-can)');
            
            icons.forEach(icon => {
                icon.style.display = '';
            });
            
            await saveIconPositions();
            console.log('✅ All icons restored');
        }
        
        // Add to global scope for console access
        window.restoreAllHiddenIcons = restoreAllHiddenIcons;`;
        
        // Insert before the closing script tag
        html = html.replace(/(\s*)<\/script>(\s*)$/, `${restoreFunction}$1</script>$2`);
        
        console.log('✅ Added restore function for hidden icons');
        
        // Safe update with automatic backup
        await safeUpdateToyBoxOS(html, 'Updated trash behavior to use persistent hiding instead of removal');
        
        console.log('🎉 Trash persistence updated!');
        console.log('📋 How it works:');
        console.log('   - Drag to trash → Icon is hidden (display: none)');
        console.log('   - Hidden state is saved to database');
        console.log('   - Page reload → Hidden icons stay hidden');
        console.log('   - Restore: Run restoreAllHiddenIcons() in console');
        
    } catch (error) {
        console.error('❌ Error updating trash persistence:', error);
        process.exit(1);
    }
}

// Run the script
updateTrashPersistence();