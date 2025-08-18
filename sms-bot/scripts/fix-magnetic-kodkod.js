#!/usr/bin/env node

/**
 * Fix for magnetic-kodkod-debugging mobile viewport issues
 * This script demonstrates the proper way to handle mobile canvas sizing
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';

// Load environment variables
dotenv.config({ path: '../.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixMobileViewport() {
  console.log('🔧 Fixing magnetic-kodkod-debugging mobile viewport issues...');
  
  // Get the current HTML
  const { data: content } = await supabase
    .from('wtaf_content')
    .select('id')
    .eq('app_slug', 'magnetic-kodkod-debugging')
    .single();
  
  if (!content) {
    console.error('App not found');
    return;
  }
  
  // Get the latest revision
  const { data: revision } = await supabase
    .from('wtaf_revisions')
    .select('html_content')
    .eq('content_id', content.id)
    .eq('revision_id', 4)
    .single();
  
  if (!revision) {
    console.error('Revision not found');
    return;
  }
  
  let html = revision.html_content;
  
  // Fix 1: Remove fixed canvas dimensions from HTML
  html = html.replace(
    '<canvas id="canvas" width="800" height="600"></canvas>',
    '<canvas id="canvas"></canvas>'
  );
  
  // Fix 2: Update CSS for proper mobile sizing
  html = html.replace(
    `#canvas {
            background: var(--canvas-bg);
            border: 2px solid var(--border);
            box-shadow: 3px 3px var(--shadow);
            cursor: crosshair;
            touch-action: none;
            position: relative;
            z-index: 1;
            display: block;
            width: calc(100vw - 20px);
            max-width: calc(100vw - 20px);
            height: auto;
        }`,
    `#canvas {
            background: var(--canvas-bg);
            border: 2px solid var(--border);
            box-shadow: 3px 3px var(--shadow);
            cursor: crosshair;
            touch-action: none;
            position: relative;
            z-index: 1;
            display: block;
            width: 100%;
            max-width: 100%;
            height: auto;
        }`
  );
  
  // Fix 3: Update the initCanvas function for proper responsive sizing
  const newInitCanvas = `        // Canvas functionality
        function initCanvas() {
            canvas = document.getElementById('canvas');
            ctx = canvas.getContext('2d');
            
            // Responsive canvas sizing
            function resizeCanvas() {
                const container = canvas.parentElement;
                const containerWidth = container.clientWidth;
                const padding = 20;
                
                // Calculate available space
                const maxWidth = Math.min(containerWidth - padding, 800);
                const maxHeight = Math.min(window.innerHeight - 300, 600); // Leave room for UI
                
                // Maintain aspect ratio
                const aspectRatio = 3/4; // 600/800
                let canvasWidth = maxWidth;
                let canvasHeight = canvasWidth * aspectRatio;
                
                // Adjust if height is too large
                if (canvasHeight > maxHeight) {
                    canvasHeight = maxHeight;
                    canvasWidth = canvasHeight / aspectRatio;
                }
                
                // Set both internal size and CSS size
                canvas.width = canvasWidth;
                canvas.height = canvasHeight;
                canvas.style.width = canvasWidth + 'px';
                canvas.style.height = canvasHeight + 'px';
                
                // Preserve existing content when resizing
                if (window.canvasContent) {
                    const img = new Image();
                    img.src = window.canvasContent;
                    img.onload = () => {
                        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    };
                } else {
                    // Initial white background
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                }
                
                console.log('Canvas resized:', { width: canvas.width, height: canvas.height });
            }
            
            // Initial resize
            resizeCanvas();
            
            // Save initial state
            saveState();

            // Event listeners for mouse
            canvas.addEventListener('mousedown', startDrawing);
            canvas.addEventListener('mousemove', draw);
            canvas.addEventListener('mouseup', stopDrawing);
            canvas.addEventListener('mouseout', stopDrawing);
            
            // Touch events
            canvas.addEventListener('touchstart', handleTouch, { passive: false });
            canvas.addEventListener('touchmove', handleTouch, { passive: false });
            canvas.addEventListener('touchend', stopDrawing, { passive: false });
            
            // Handle orientation changes and resize
            window.addEventListener('resize', () => {
                window.canvasContent = canvas.toDataURL();
                resizeCanvas();
            });
            
            console.log('🎨 Canvas initialized');
        }`;
  
  // Find and replace the initCanvas function
  const initCanvasStart = html.indexOf('// Canvas functionality');
  const initCanvasEnd = html.indexOf('function getCanvasCoordinates(e) {');
  
  if (initCanvasStart !== -1 && initCanvasEnd !== -1) {
    html = html.substring(0, initCanvasStart) + 
           newInitCanvas + '\n\n        ' +
           html.substring(initCanvasEnd);
  }
  
  // Fix 4: Update media query for better mobile support
  html = html.replace(
    `@media screen and (max-width: 430px) {
            body {
                padding: 5px;
            }
            
            h1 {
                font-size: 20px;
            }
            
            button {
                font-size: 12px;
                padding: 8px 12px;
                min-height: 40px;
            }
            
            .toolbar {
                padding: 5px;
                gap: 5px;
            }
            
            .paint-app {
                gap: 10px;
            }
            
            #canvas {
                width: calc(100vw - 10px) !important;
                max-width: calc(100vw - 10px) !important;
            }`,
    `@media screen and (max-width: 430px) {
            body {
                padding: 5px;
                max-width: 100vw;
                overflow-x: hidden;
            }
            
            h1 {
                font-size: 20px;
            }
            
            button {
                font-size: 12px;
                padding: 8px 12px;
                min-height: 40px;
            }
            
            .toolbar {
                padding: 5px;
                gap: 5px;
            }
            
            .paint-app {
                gap: 10px;
                width: 100%;
                max-width: 100%;
            }
            
            #canvas {
                width: 100% !important;
                max-width: 100% !important;
            }`
  );
  
  // Save the fixed HTML to a file for review
  await fs.writeFile('/tmp/magnetic-kodkod-fixed.html', html);
  console.log('✅ Fixed HTML saved to /tmp/magnetic-kodkod-fixed.html');
  
  // Create a new revision with the fix
  const { data: newRevision, error } = await supabase
    .from('wtaf_revisions')
    .insert({
      content_id: content.id,
      revision_id: 5,
      edit_request: 'SYSTEM FIX: Properly handle mobile viewport sizing with responsive canvas dimensions',
      html_content: html,
      status: 'completed',
      user_phone: '+14158001378', // Bart's phone
      processed_at: new Date().toISOString(),
      completed_at: new Date().toISOString(),
      ai_summary: 'Fixed mobile viewport issues: removed fixed canvas dimensions, made canvas properly responsive, improved coordinate mapping, and enhanced mobile CSS'
    });
  
  if (error) {
    console.error('Error creating revision:', error);
    return;
  }
  
  // Update the current revision pointer
  const { error: updateError } = await supabase
    .from('wtaf_content')
    .update({ current_revision: 5 })
    .eq('id', content.id);
  
  if (updateError) {
    console.error('Error updating current revision:', updateError);
    return;
  }
  
  console.log('✅ Successfully created revision 5 with mobile fixes');
  console.log('🌐 View at: https://webtoys.ai/bart/magnetic-kodkod-debugging');
}

// Run the fix
fixMobileViewport().catch(console.error);