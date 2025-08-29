#!/usr/bin/env node

/**
 * ToyBox OS Simple App Processor
 * Processes simple desktop apps (alerts, prompts, visual effects)
 * These are added directly to the ToyBox OS desktop HTML
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';

// Load .env.local first, fallback to .env  
dotenv.config({ path: '../.env.local' });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: '../.env' });
}

const execAsync = promisify(exec);

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// App ID for simple desktop apps
const SIMPLE_APPS_ID = 'toybox-desktop-apps';

// Get target desktop from command line argument (default to toybox-os)
const TARGET_DESKTOP = process.argv[2] || 'toybox-os';
console.log(`🎯 Target desktop: ${TARGET_DESKTOP}`);

/**
 * Load app submissions
 */
async function loadAppSubmissions() {
  const { data, error } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('*')
    .eq('app_id', SIMPLE_APPS_ID)
    .eq('action_type', 'desktop_app')
    .filter('content_data->>status', 'eq', 'new');

  if (error) {
    console.error('Error loading app submissions:', error);
    return [];
  }

  return data || [];
}

/**
 * Transform submission into desktop app using Claude
 */
async function transformToDesktopApp(submission) {
  const appTypeExamples = {
    simple: [
      "alert('You rolled: ' + Math.ceil(Math.random()*6))",
      "alert(new Date().toLocaleTimeString())",
      "alert(['Great job!', 'Awesome!', 'Nice!'][Math.floor(Math.random()*3)])"
    ],
    interactive: [
      "const name = prompt('What\\'s your name?'); if(name) alert('Hello ' + name + '!')",
      "const num = prompt('Pick a number'); alert('Your lucky number is ' + (parseInt(num) || 0) * 7)",
      "if(confirm('Ready for adventure?')) alert('Let\\'s go!'); else alert('Maybe next time!')"
    ],
    visual: [
      "document.body.style.filter = 'hue-rotate(' + Math.random()*360 + 'deg)'",
      "document.body.style.transform = 'rotate(' + (Math.random()*6-3) + 'deg)'",
      "document.getElementById('desktop').style.background = '#' + Math.floor(Math.random()*16777215).toString(16)"
    ]
  };

  const examples = appTypeExamples[submission.appType] || appTypeExamples.simple;

  const prompt = `Transform this user submission into a simple desktop app for ToyBox OS.

User wants: "${submission.appName}"
Description: "${submission.appFunction}"
Type: ${submission.appType || 'simple'}
Icon preference: ${submission.appIcon || 'auto-select'}

Generate a JSON object with:
1. name: A short, catchy name (max 15 chars)
2. icon: An emoji that represents the app (use suggested icon if provided and appropriate)
3. code: JavaScript code that runs when clicked. Based on the type "${submission.appType}":
   - For "simple": Show messages, random outputs, fun facts
   - For "interactive": Get user input, calculate things, make choices
   - For "visual": Change colors, animations, page effects
   
   Use only: alert(), prompt(), confirm(), basic math, string ops, localStorage, DOM style changes
   Keep it simple but creative! 1-3 lines max.
   
4. tooltip: A fun description (max 50 chars)
5. position: { x: number, y: number } - Random position between x: 100-800, y: 100-400

Examples for ${submission.appType} type:
${examples.map(ex => '- "' + ex + '"').join('\n')}

Important: Make the code match what the user asked for as closely as possible.
If they want a calculator, make it calculate. If they want jokes, show jokes.
Be creative but stay true to their request!

Respond with ONLY valid JSON, no explanation.`;

  try {
    const claudePath = '/Users/bartdecrem/.local/bin/claude';
    const { stdout } = await execAsync(`echo ${JSON.stringify(prompt)} | ${claudePath}`, {
      maxBuffer: 1024 * 1024 * 10
    });

    let jsonStr = stdout.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }
    
    const appSpec = JSON.parse(jsonStr);
    
    if (!appSpec.name || !appSpec.icon || !appSpec.code) {
      throw new Error('Invalid app specification');
    }

    // Ensure position is set
    if (!appSpec.position) {
      appSpec.position = {
        x: 100 + Math.floor(Math.random() * 700),
        y: 100 + Math.floor(Math.random() * 300)
      };
    }

    return {
      ...appSpec,
      submitterId: submission.recordId || submission.id,
      submitterName: submission.submitterName,
      originalRequest: submission.appFunction,
      createdAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error transforming app submission:', error);
    return null;
  }
}

/**
 * Find a good position for a new desktop icon
 */
function findEmptyPosition(html) {
  // Parse existing icon positions
  const iconPattern = /style="left:\s*(\d+)px;\s*top:\s*(\d+)px;"/g;
  const occupiedPositions = [];
  let match;
  
  while ((match = iconPattern.exec(html)) !== null) {
    occupiedPositions.push({
      x: parseInt(match[1]),
      y: parseInt(match[2])
    });
  }
  
  // Define a grid for icon placement (icons are ~75px wide, give 100px spacing)
  const gridSize = 100;
  const startX = 20;
  const startY = 100;
  const maxX = 800;
  const maxY = 500;
  
  // Try to find an empty grid position
  for (let y = startY; y <= maxY; y += gridSize) {
    for (let x = startX; x <= maxX; x += gridSize) {
      // Check if this position is too close to any existing icon
      const isFree = !occupiedPositions.some(pos => 
        Math.abs(pos.x - x) < 80 && Math.abs(pos.y - y) < 80
      );
      
      if (isFree) {
        // Add slight randomization within the grid cell (±10px)
        return {
          x: x + Math.floor(Math.random() * 20 - 10),
          y: y + Math.floor(Math.random() * 20 - 10)
        };
      }
    }
  }
  
  // If no empty position found, place it randomly in lower area
  return {
    x: startX + Math.floor(Math.random() * 700),
    y: 400 + Math.floor(Math.random() * 100)
  };
}

/**
 * Add app to ToyBox OS desktop
 */
async function addAppToDesktop(appSpec) {
  try {
    // Get current desktop
    console.log(`📱 Adding ${appSpec.name} to ${TARGET_DESKTOP}`);
    const { data: desktopData, error: fetchError } = await supabase
      .from('wtaf_content')
      .select('html_content')
      .eq('user_slug', 'public')
      .eq('app_slug', TARGET_DESKTOP)
      .single();

    if (fetchError) {
      console.error(`Error fetching ${TARGET_DESKTOP}:`, fetchError);
      return false;
    }

    let html = desktopData.html_content;
    
    // Find a good position for the new icon
    const position = findEmptyPosition(html);
    console.log(`Placing ${appSpec.name} at position (${position.x}, ${position.y})`);

    // Create the desktop icon HTML
    const iconHtml = `
    <!-- ${appSpec.name} by ${appSpec.submitterName} -->
    <div class="desktop-icon" 
         style="left: ${position.x}px; top: ${position.y}px;"
         onclick="${appSpec.code.replace(/"/g, '&quot;').replace(/'/g, '\\\'')}"
         title="${appSpec.tooltip}">
        <div class="icon">${appSpec.icon}</div>
        <div class="label">${appSpec.name}</div>
    </div>`;

    // Find the desktop div and add the icon before its closing tag
    const desktopEndMarker = '</div><!-- end desktop -->';
    if (html.includes(desktopEndMarker)) {
      html = html.replace(desktopEndMarker, iconHtml + '\n    ' + desktopEndMarker);
    } else {
      // Fallback: find any desktop div closing
      html = html.replace(/<\/div>\s*<div class="taskbar"/, iconHtml + '\n    </div>\n    <div class="taskbar"');
    }

    // Update desktop
    const { error: updateError } = await supabase
      .from('wtaf_content')
      .update({ 
        html_content: html,
        updated_at: new Date()
      })
      .eq('user_slug', 'public')
      .eq('app_slug', TARGET_DESKTOP);

    if (updateError) {
      console.error(`Error updating ${TARGET_DESKTOP}:`, updateError);
      return false;
    }

    console.log(`✅ Successfully added ${appSpec.name} to ${TARGET_DESKTOP} desktop`);
    return true;

  } catch (error) {
    console.error('Error adding app to desktop:', error);
    return false;
  }
}

/**
 * Update submission status
 */
async function updateSubmissionStatus(recordId, status, details = {}) {
  const { data: current } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('*')
    .eq('id', recordId)
    .single();

  if (!current) return false;

  const updatedContent = {
    ...current.content_data,
    status,
    ...details,
    updated_at: new Date().toISOString()
  };

  const { error } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .update({ 
      content_data: updatedContent,
      updated_at: new Date()
    })
    .eq('id', recordId);

  return !error;
}

/**
 * Check for inappropriate content
 */
function isInappropriate(submission) {
  const inappropriate = [
    'fuck', 'shit', 'ass', 'bitch', 'dick', 'cock', 'pussy',
    'nazi', 'hitler', 'nigger', 'faggot', 'rape', 'kill'
  ];
  
  const text = `${submission.appName} ${submission.appFunction}`.toLowerCase();
  return inappropriate.some(word => text.includes(word));
}

/**
 * Main processing function
 */
async function processToyBoxApps() {
  console.log('\n=== ToyBox OS Simple App Processor ===');
  console.log('Time:', new Date().toISOString());
  
  // Load submissions
  const submissions = await loadAppSubmissions();
  console.log(`Found ${submissions.length} new app submissions`);

  if (submissions.length === 0) {
    console.log('No new submissions to process');
    return;
  }

  let successCount = 0;
  let failCount = 0;

  // Process each submission
  for (const record of submissions) {
    const submission = { ...record.content_data, recordId: record.id };
    console.log(`\nProcessing: "${submission.appName}" by ${submission.submitterName}`);

    // Check for inappropriate content
    if (isInappropriate(submission)) {
      console.log('→ Rejected: Inappropriate content');
      await updateSubmissionStatus(record.id, 'rejected', {
        reason: 'Inappropriate content detected'
      });
      failCount++;
      continue;
    }

    // Transform to desktop app
    const appSpec = await transformToDesktopApp(submission);
    
    if (!appSpec) {
      console.log('→ Failed: Could not transform to app');
      await updateSubmissionStatus(record.id, 'failed', {
        reason: 'Transformation failed'
      });
      failCount++;
      continue;
    }

    console.log(`→ Generated: ${appSpec.name} ${appSpec.icon}`);

    // Add to desktop
    const added = await addAppToDesktop(appSpec);
    
    if (!added) {
      console.log('→ Failed: Could not add to desktop');
      await updateSubmissionStatus(record.id, 'failed', {
        reason: 'Failed to add to desktop',
        appSpec
      });
      failCount++;
      continue;
    }

    // Update submission status
    await updateSubmissionStatus(record.id, 'processed', {
      appSpec,
      processedAt: new Date().toISOString()
    });

    console.log(`✅ Successfully added ${appSpec.name} to ToyBox OS`);
    successCount++;
  }

  console.log(`\n=== Processing Complete ===`);
  console.log(`✅ Success: ${successCount}`);
  console.log(`❌ Failed: ${failCount}`);
  console.log('===========================\n');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  processToyBoxApps().catch(console.error);
}

export { processToyBoxApps, transformToDesktopApp };