#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { readFileSync, writeFileSync } from 'fs';

// Load environment variables
const result = dotenv.config({ path: '../.env.local' });
if (result.error) {
    console.error('Error loading .env.local:', result.error.message);
    process.exit(1);
}

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixToyBoxOS() {
    try {
        console.log('🔧 Reading current ToyBox OS HTML...');
        
        let html = readFileSync('current-toybox-os.html', 'utf8');
        
        console.log('🛠️ Fixing drag and click functionality...');
        
        // The main fix: Replace the broken JavaScript section with the corrected version
        // Find the start of the JavaScript section with the broken code
        const scriptStartPattern = /\/\/ Enhanced desktop icon dragging with trash functionality/;
        const scriptEndPattern = /console\.log\('ToyBox OS Ready - Restored Version'\);/;
        
        const startMatch = html.search(scriptStartPattern);
        const endMatch = html.search(scriptEndPattern);
        
        if (startMatch === -1 || endMatch === -1) {
            console.error('❌ Could not find the script section to replace');
            process.exit(1);
        }
        
        // Extract the ending position including the log statement
        const endPos = html.indexOf('\n', endMatch + scriptEndPattern.source.length - 2);
        
        const beforeScript = html.substring(0, startMatch);
        const afterScript = html.substring(endPos);
        
        // Create the fixed JavaScript section
        const fixedScript = `        // Enhanced desktop icon dragging with trash functionality
        let draggedIcon = null;
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };

        function setupDragForIcons() {
            const icons = document.querySelectorAll('.desktop-icon:not(.trash-can)');
            icons.forEach(function(icon) {
                icon.addEventListener('mousedown', handleIconMouseDown);
                icon.style.cursor = 'move';
                icon.style.position = 'absolute';
            });
            
            document.addEventListener('mousemove', handleIconDrag);
            document.addEventListener('mouseup', handleIconDragEnd);
        }

        function handleIconMouseDown(event) {
            const icon = event.currentTarget;
            if (icon.classList.contains('trash-can')) return;
            
            // Store the start position to detect if it's a drag or click
            const startX = event.clientX;
            const startY = event.clientY;
            let hasMoved = false;
            let dragStarted = false;
            
            // Prepare for potential drag
            draggedIcon = icon;
            const rect = icon.getBoundingClientRect();
            const desktop = document.querySelector('#desktop');
            const desktopRect = desktop.getBoundingClientRect();
            
            dragOffset.x = event.clientX - rect.left;
            dragOffset.y = event.clientY - rect.top;
            
            // Function to start dragging
            function startDrag(e) {
                const distance = Math.sqrt(
                    Math.pow(e.clientX - startX, 2) + 
                    Math.pow(e.clientY - startY, 2)
                );
                
                // Only start dragging if moved more than 5 pixels
                if (distance > 5 && !dragStarted) {
                    dragStarted = true;
                    isDragging = true;
                    hasMoved = true;
                    draggedIcon.style.opacity = '0.7';
                    draggedIcon.style.zIndex = '1000';
                    draggedIcon.style.pointerEvents = 'none';
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
            
            // Function to end drag
            function endDrag(e) {
                document.removeEventListener('mousemove', startDrag);
                document.removeEventListener('mouseup', endDrag);
                
                // If we didn't move, it's a click - don't prevent default, allow onclick to fire
                if (!hasMoved) {
                    draggedIcon = null;
                    return;
                }
                
                // Otherwise handle as drag end
                if (isDragging) {
                    handleIconDragEnd(e);
                }
            }
            
            document.addEventListener('mousemove', startDrag);
            document.addEventListener('mouseup', endDrag);
        }

        function handleIconDrag(event) {
            if (!isDragging || !draggedIcon) return;
            
            event.preventDefault();
            
            const desktop = document.querySelector('#desktop');
            const desktopRect = desktop.getBoundingClientRect();
            
            let x = event.clientX - desktopRect.left - dragOffset.x;
            let y = event.clientY - desktopRect.top - dragOffset.y;
            
            x = Math.max(0, Math.min(x, desktopRect.width - draggedIcon.offsetWidth));
            y = Math.max(0, Math.min(y, desktopRect.height - draggedIcon.offsetHeight - 50));
            
            draggedIcon.style.left = x + 'px';
            draggedIcon.style.top = y + 'px';
            
            // Check trash can highlighting
            const trash = document.getElementById('trashCan');
            if (trash) {
                const trashRect = trash.getBoundingClientRect();
                const iconRect = draggedIcon.getBoundingClientRect();
                
                const isOverTrash = (
                    iconRect.left < trashRect.right &&
                    iconRect.right > trashRect.left &&
                    iconRect.top < trashRect.bottom &&
                    iconRect.bottom > trashRect.top
                );
                
                highlightTrash(isOverTrash);
            }
        }

        async function handleIconDragEnd(event) {
            if (!isDragging || !draggedIcon) return;
            
            isDragging = false;
            
            // Check if dropped on trash
            const trash = document.getElementById('trashCan');
            if (trash) {
                const trashRect = trash.getBoundingClientRect();
                const iconRect = draggedIcon.getBoundingClientRect();
                
                const isOverTrash = (
                    iconRect.left < trashRect.right &&
                    iconRect.right > trashRect.left &&
                    iconRect.top < trashRect.bottom &&
                    iconRect.bottom > trashRect.top
                );
                
                if (isOverTrash) {
                    const iconName = draggedIcon.querySelector('.label').textContent;
                    if (confirm('Remove "' + iconName + '" from desktop?')) {
                        draggedIcon.remove();
                        await saveIconPositions(); // After deletion
                        showTrashFeedback(iconName);
                        draggedIcon = null;
                        highlightTrash(false);
                        return;
                    }
                }
                
                highlightTrash(false);
            }
            
            draggedIcon.style.opacity = '1';
            draggedIcon.style.zIndex = '';
            draggedIcon.style.pointerEvents = '';
            
            await saveIconPositions();
            draggedIcon = null;
        }

        function highlightTrash(highlight) {
            const trash = document.getElementById('trashCan');
            if (!trash) return;
            
            if (highlight) {
                trash.style.backgroundColor = 'rgba(255, 0, 0, 0.3)';
                trash.style.border = '3px dashed red';
                trash.style.transform = 'scale(1.1)';
            } else {
                trash.style.backgroundColor = '';
                trash.style.border = '';
                trash.style.transform = '';
            }
        }

        function showTrashFeedback(iconName) {
            const feedback = document.createElement('div');
            feedback.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.8); color: white; padding: 15px 25px; border-radius: 8px; z-index: 10000; font-size: 16px; font-weight: bold;';
            feedback.textContent = '"' + iconName + '" moved to trash';
            document.body.appendChild(feedback);
            
            setTimeout(function() {
                if (document.body.contains(feedback)) {
                    document.body.removeChild(feedback);
                }
            }, 2500);
        }

        async function loadIconPositions() {
            try {
                const response = await fetch('/api/zad/load?app_id=toybox-desktop-layout&action_type=desktop_state&participant_id=global');
                
                if (!response.ok) {
                    console.log('No saved layout found, using default positions');
                    return;
                }
                
                const result = await response.json();
                const layoutData = result && result.length > 0 ? result[0] : null;
                
                if (layoutData && layoutData.content_data && layoutData.content_data.icons) {
                    const icons = document.querySelectorAll('.desktop-icon:not(.trash-can)');
                    const savedIcons = layoutData.content_data.icons;
                    
                    icons.forEach(function(icon) {
                        const label = icon.querySelector('.label').textContent;
                        const id = label.toLowerCase().replace(/[^a-z0-9]/g, '');
                        
                        if (savedIcons[id]) {
                            const savedIcon = savedIcons[id];
                            icon.style.left = savedIcon.x + 'px';
                            icon.style.top = savedIcon.y + 'px';
                            icon.style.display = savedIcon.visible ? '' : 'none';
                        }
                    });
                    
                    console.log('✅ Desktop layout loaded from server');
                }
            } catch (error) {
                console.error('Error loading desktop layout:', error);
            }
        }
        
        // Initialize everything
        document.addEventListener('DOMContentLoaded', function() {
            window.windowManager.init();
            
            setTimeout(async function() {
                setupDragForIcons();
                await loadIconPositions();
            }, 100);
        });
        
        console.log('ToyBox OS Ready - Fixed Version');`;
        
        // Combine the fixed HTML
        const fixedHtml = beforeScript + fixedScript;
        
        // Now add the ZAD persistence functions after the main script
        const zadFunctions = `
// ZAD-based persistent desktop layout system
async function saveIconPositions() {
    const icons = document.querySelectorAll('.desktop-icon:not(.trash-can)');
    const iconData = {};
    
    icons.forEach(function(icon) {
        const label = icon.querySelector('.label').textContent;
        const id = label.toLowerCase().replace(/[^a-z0-9]/g, '');
        iconData[id] = {
            x: parseInt(icon.style.left) || 0,
            y: parseInt(icon.style.top) || 0,
            visible: icon.style.display !== 'none',
            label: label
        };
    });
    
    try {
        const response = await fetch('/api/zad/save', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                app_id: 'toybox-desktop-layout',
                participant_id: 'global',
                action_type: 'desktop_state',
                content_data: {
                    icons: iconData,
                    lastModified: new Date().toISOString(),
                    modifiedBy: 'user'
                }
            })
        });
        
        if (response.ok) {
            console.log('✅ Desktop layout saved for everyone');
        }
    } catch (error) {
        console.error('Error saving desktop layout:', error);
    }
}

async function deleteIconFromDesktop(iconElement) {
    const label = iconElement.querySelector('.label').textContent;
    iconElement.style.display = 'none';
    await saveIconPositions();
    console.log('🗑️ Deleted', label, 'from desktop for everyone');
}
</script>
</body>
</html>`;
        
        const finalHtml = fixedHtml + zadFunctions;
        
        // Save the fixed HTML to a file for review
        writeFileSync('fixed-toybox-os.html', finalHtml);
        console.log('✅ Fixed HTML saved to fixed-toybox-os.html');
        
        // Update the database
        console.log('📤 Updating ToyBox OS in Supabase...');
        
        const { error } = await supabase
            .from('wtaf_content')
            .update({ 
                html_content: finalHtml,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os');
        
        if (error) {
            console.error('❌ Error updating Supabase:', error.message);
            process.exit(1);
        }
        
        console.log('✅ ToyBox OS updated successfully in Supabase!');
        console.log('');
        console.log('🎯 FIXES APPLIED:');
        console.log('   1. ✅ Fixed handleIconMouseDown to distinguish clicks from drags');
        console.log('   2. ✅ Added proper setupDragForIcons() function');
        console.log('   3. ✅ Fixed function nesting and closure issues');
        console.log('   4. ✅ Ensured onclick handlers work when not dragging');
        console.log('   5. ✅ Fixed ZAD persistence integration');
        console.log('');
        console.log('🚀 Both clicking AND dragging should now work properly!');
        
    } catch (error) {
        console.error('❌ Error fixing ToyBox OS:', error.message);
        process.exit(1);
    }
}

// Run the fix
fixToyBoxOS();