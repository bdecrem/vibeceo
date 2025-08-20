#!/usr/bin/env node

/**
 * Fix ToyBox OS drag and double-click functionality
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load .env.local first, fallback to .env
dotenv.config({ path: '../.env.local' });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: '../.env' });
}

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixDragAndClick() {
  console.log('Fixing ToyBox OS drag and click functionality...');
  
  // Get current HTML
  const { data, error: fetchError } = await supabase
    .from('wtaf_content')
    .select('html_content')
    .eq('user_slug', 'public')
    .eq('app_slug', 'toybox-os')
    .single();

  if (fetchError) {
    console.error('Error fetching ToyBox OS:', fetchError);
    return;
  }

  let html = data.html_content;
  
  // Find the handleIconMouseDown function and fix it
  const handleIconMouseDownStart = html.indexOf('function handleIconMouseDown(event) {');
  if (handleIconMouseDownStart > -1) {
    // Find the end of the function
    const functionEnd = html.indexOf('draggedIcon.style.pointerEvents = \'none\';', handleIconMouseDownStart);
    
    if (functionEnd > -1) {
      // Replace the function to handle both click and drag properly
      const newFunction = `function handleIconMouseDown(event) {
            // Don't interfere with double-clicks for launching apps
            if (event.detail === 2) {
                return; // Let the onclick handler deal with it
            }
            
            const icon = event.currentTarget;
            if (icon.classList.contains('trash-can')) return;
            
            // Store the start position to detect if it's a drag or click
            const startX = event.clientX;
            const startY = event.clientY;
            let hasMoved = false;
            
            // Prepare for potential drag
            draggedIcon = icon;
            const rect = icon.getBoundingClientRect();
            const desktop = document.querySelector('#desktop');
            const desktopRect = desktop.getBoundingClientRect();
            
            dragOffset.x = event.clientX - rect.left;
            dragOffset.y = event.clientY - rect.top;
            
            // Don't start dragging immediately - wait for mouse move
            function startDrag(e) {
                const distance = Math.sqrt(
                    Math.pow(e.clientX - startX, 2) + 
                    Math.pow(e.clientY - startY, 2)
                );
                
                // Only start dragging if moved more than 5 pixels
                if (distance > 5 && !isDragging) {
                    isDragging = true;
                    hasMoved = true;
                    draggedIcon.style.opacity = '0.7';
                    draggedIcon.style.zIndex = '1000';
                    draggedIcon.style.pointerEvents = 'none';
                    event.preventDefault();
                    event.stopPropagation();
                }
            }
            
            function endDrag(e) {
                document.removeEventListener('mousemove', startDrag);
                document.removeEventListener('mouseup', endDrag);
                
                // If we didn't move, it's a click - don't prevent default
                if (!hasMoved) {
                    // Allow the click to propagate normally
                    return;
                }
                
                // Otherwise handle as drag end
                if (isDragging) {
                    handleIconDragEnd(e);
                }
            }
            
            document.addEventListener('mousemove', startDrag);
            document.addEventListener('mouseup', endDrag);`;
            
      // Find where to insert the new function
      const functionEndComplete = html.indexOf('}', functionEnd) + 1;
      html = html.substring(0, handleIconMouseDownStart) + newFunction + html.substring(functionEndComplete);
      
      console.log('✅ Fixed handleIconMouseDown to preserve click functionality');
    }
  }
  
  // Also ensure that icons have both onclick AND the drag setup
  // Check if the setupDragForIcons function needs updating
  const setupDragStart = html.indexOf('function setupDragForIcons() {');
  if (setupDragStart > -1) {
    const setupDragEnd = html.indexOf('document.addEventListener(\'mouseup\', handleIconDragEnd);', setupDragStart);
    if (setupDragEnd > -1) {
      const endOfFunction = html.indexOf('}', setupDragEnd);
      
      // Update the setup function to not interfere with onclick
      const newSetup = `function setupDragForIcons() {
            const icons = document.querySelectorAll('.desktop-icon:not(.trash-can)');
            icons.forEach(function(icon) {
                // Remove any existing listeners to avoid duplicates
                icon.removeEventListener('mousedown', handleIconMouseDown);
                
                // Add mouse down for dragging
                icon.addEventListener('mousedown', handleIconMouseDown);
                
                // Set cursor and position
                icon.style.cursor = 'pointer'; // Use pointer, not move
                icon.style.position = 'absolute';
            });
            
            // Global drag handlers remain the same
            document.addEventListener('mousemove', handleIconDrag);
            document.addEventListener('mouseup', handleIconDragEnd);`;
            
      html = html.substring(0, setupDragStart) + newSetup + html.substring(endOfFunction);
      console.log('✅ Fixed setupDragForIcons to use pointer cursor');
    }
  }
  
  // Update the database
  const { error: updateError } = await supabase
    .from('wtaf_content')
    .update({ 
      html_content: html,
      updated_at: new Date()
    })
    .eq('user_slug', 'public')
    .eq('app_slug', 'toybox-os');

  if (updateError) {
    console.error('Error updating ToyBox OS:', updateError);
    return;
  }
  
  console.log('\n✅ Successfully fixed drag and click functionality');
  console.log('Icons should now be draggable AND clickable/double-clickable!');
}

fixDragAndClick().catch(console.error);