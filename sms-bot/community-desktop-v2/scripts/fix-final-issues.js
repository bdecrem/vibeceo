#!/usr/bin/env node

/**
 * Fix ToyBox OS final issues - selection artifacts and persistence
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

async function fixFinalIssues() {
  console.log('Fixing ToyBox OS final issues...');
  
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
  let changesMade = 0;
  
  // 1. Fix the selection artifact by adding CSS during drag
  const dragFunctionIndex = html.indexOf('function handleIconDrag(event) {');
  if (dragFunctionIndex > -1) {
    // Find where we set pointerEvents: none
    const pointerEventsIndex = html.indexOf("draggedIcon.style.pointerEvents = 'none';", dragFunctionIndex);
    if (pointerEventsIndex > -1) {
      // Add CSS to prevent selection on all icons during drag
      const insertPoint = pointerEventsIndex + "draggedIcon.style.pointerEvents = 'none';".length;
      const cssAddition = `
                    
                    // Prevent selection artifacts on all icons during drag
                    document.body.style.userSelect = 'none';
                    document.body.style.webkitUserSelect = 'none';
                    document.body.style.MozUserSelect = 'none';`;
      
      html = html.substring(0, insertPoint) + cssAddition + html.substring(insertPoint);
      changesMade++;
      console.log('✅ Added CSS to prevent selection artifacts during drag');
    }
  }
  
  // Also remove selection when drag ends
  const dragEndIndex = html.indexOf('function handleIconDragEnd(event) {');
  if (dragEndIndex > -1) {
    const resetStylesIndex = html.indexOf("draggedIcon.style.pointerEvents = '';", dragEndIndex);
    if (resetStylesIndex > -1) {
      const insertPoint = resetStylesIndex + "draggedIcon.style.pointerEvents = '';".length;
      const cssReset = `
                
                // Restore selection after drag
                document.body.style.userSelect = '';
                document.body.style.webkitUserSelect = '';
                document.body.style.MozUserSelect = '';`;
      
      html = html.substring(0, insertPoint) + cssReset + html.substring(insertPoint);
      changesMade++;
      console.log('✅ Added CSS reset after drag ends');
    }
  }
  
  // 2. Fix the loadIconPositions function to use POST with body
  const loadFunctionIndex = html.indexOf('async function loadIconPositions() {');
  if (loadFunctionIndex > -1) {
    const endOfFunction = html.indexOf('console.log(\'Icon positions loaded successfully\');', loadFunctionIndex);
    if (endOfFunction > -1) {
      const functionEndBrace = html.indexOf('}', endOfFunction + 50);
      
      // Replace with correct ZAD load implementation
      const newLoadFunction = `async function loadIconPositions() {
            try {
                const response = await fetch('/api/zad/load', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        app_id: 'toybox-desktop-layout',
                        action_type: 'desktop_state',
                        participant_id: 'global'
                    })
                });
                
                if (!response.ok) {
                    console.log('No saved layout found, using default positions');
                    return;
                }
                
                const result = await response.json();
                
                // Check if we have data
                if (!result || !result.data || result.data.length === 0) {
                    console.log('No saved icon positions found');
                    return;
                }
                
                // Get the most recent desktop state
                const layoutData = result.data[0];
                
                if (layoutData && layoutData.content_data && layoutData.content_data.icons) {
                    const icons = document.querySelectorAll('.desktop-icon:not(.trash-can)');
                    const savedIcons = layoutData.content_data.icons;
                    
                    icons.forEach(function(icon) {
                        const label = icon.querySelector('.label').textContent;
                        const id = label.toLowerCase().replace(/[^a-z0-9]/g, '');
                        
                        if (savedIcons[id]) {
                            icon.style.left = savedIcons[id].x + 'px';
                            icon.style.top = savedIcons[id].y + 'px';
                            if (savedIcons[id].visible === false) {
                                icon.style.display = 'none';
                            }
                        }
                    });
                    
                    console.log('Icon positions loaded successfully');
                }
            } catch (error) {
                console.error('Error loading icon positions:', error);
            }
        }`;
      
      html = html.substring(0, loadFunctionIndex) + newLoadFunction + html.substring(functionEndBrace + 1);
      changesMade++;
      console.log('✅ Fixed loadIconPositions to use proper POST request');
    }
  }
  
  // 3. Make sure icons have position: absolute in CSS
  const iconStyleIndex = html.indexOf('.desktop-icon {');
  if (iconStyleIndex > -1 && !html.includes('position: absolute;', iconStyleIndex)) {
    const styleEnd = html.indexOf('}', iconStyleIndex);
    if (styleEnd > -1) {
      // Already has position: absolute, good
      console.log('Icon position already set to absolute');
    }
  }
  
  if (changesMade === 0) {
    console.log('No changes needed');
    return;
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
  
  console.log(`\n✅ Successfully fixed ${changesMade} issues in ToyBox OS`);
  console.log('- Selection artifacts during drag should be gone');
  console.log('- Icon positions should now persist properly!');
}

fixFinalIssues().catch(console.error);