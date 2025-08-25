#!/usr/bin/env node

/**
 * ToyBox OS Windowed App Processor
 * Generates full windowed applications (paint, notepad, games, etc.)
 * Creates complete ZAD apps with save/load functionality
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local first, fallback to .env (use absolute paths)
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
}

const execAsync = promisify(exec);

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// App ID for windowed apps submissions
const WINDOWED_APPS_ID = 'toybox-windowed-apps';

/**
 * Load windowed app submissions
 */
async function loadWindowedAppSubmissions() {
  const { data, error } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('*')
    .eq('app_id', WINDOWED_APPS_ID)
    .eq('action_type', 'windowed_app')
    .filter('content_data->>status', 'eq', 'new');

  if (error) {
    console.error('Error loading submissions:', error);
    return [];
  }

  return data || [];
}

/**
 * Generate a complete windowed app using Claude
 */
async function generateWindowedApp(submission) {
  // Determine app template based on description
  let appTemplate = 'generic';
  const desc = submission.appFunction.toLowerCase();
  
  // Check if this is a Webtoys import
  // Also check if the description looks like just an app slug (wave-wood-deconstructing)
  const looksLikeSlug = desc.match(/^[a-z0-9-]+$/) && desc.includes('-');
  
  if (submission.appType === 'webtoys' || 
      desc.includes('import webtoys app:') ||
      (looksLikeSlug && desc.split('-').length >= 3)) {
    appTemplate = 'webtoys';
    console.log('🔄 Detected as Webtoys import based on slug pattern');
  } else if (desc.includes('paint') || desc.includes('draw') || desc.includes('sketch')) {
    appTemplate = 'paint';
  } else if (desc.includes('note') || desc.includes('text') || desc.includes('write')) {
    appTemplate = 'notepad';
  } else if (desc.includes('game') || desc.includes('play')) {
    appTemplate = 'game';
  } else if (desc.includes('music') || desc.includes('sound') || desc.includes('beat')) {
    appTemplate = 'music';
  } else if (desc.includes('chat') || desc.includes('message')) {
    appTemplate = 'chat';
  }

  // Special handling for Webtoys import
  if (appTemplate === 'webtoys') {
    console.log('🔄 Converting Webtoys app...');
    
    // Extract the app slug from the description
    let webtoysSlug = submission.appFunction.replace('import webtoys app:', '').trim();
    if (!webtoysSlug) {
      webtoysSlug = submission.appFunction.trim();
    }
    
    // Import the converter
    const { default: convertWebtoysApp } = await import('./convert-webtoys-app.js');
    
    // Convert the app
    const result = await convertWebtoysApp(webtoysSlug);
    
    if (result.success) {
      console.log(`✅ Successfully converted ${webtoysSlug} to ToyBox OS`);
      return {
        success: true,
        appId: result.toyboxSlug,
        appName: result.appTitle
      };
    } else {
      console.error(`❌ Failed to convert: ${result.error}`);
      return {
        success: false,
        error: result.error
      };
    }
  }
  
  // Use appSlug if provided, otherwise generate from appName
  const appId = submission.appSlug || generateAppId(submission.appName);
  
  const prompt = `Create a complete windowed desktop application for ToyBox OS.

User wants: "${submission.appName}"
Description: "${submission.appFunction}"
App Type Detected: ${appTemplate}
App ID: ${appId}

Generate a COMPLETE HTML application with:

1. STRUCTURE:
   - Full HTML document with <!DOCTYPE html>
   - Title: ${submission.appName}
   - Mobile viewport meta tag
   - Body tag MUST include: <body class="theme-system7 windowed-app">
   - Self-contained (no external dependencies)

2. STYLING (use theme classes, minimal inline styles):
   - Use class="window-content" for main area
   - Use class="toolbar" for top controls
   - Use class="status-bar" for bottom info
   - Use class="button" for all buttons
   - Theme will be applied separately

3. REQUIRED JAVASCRIPT:
   - window.APP_ID = '${appId}';
   - Include ZAD helper functions for save/load
   - Implement auto-save every 30 seconds if applicable

4. FUNCTIONALITY based on type "${appTemplate}":
${getTemplateInstructions(appTemplate)}

5. ZAD INTEGRATION:
   Include these exact helper functions:
   \`\`\`javascript
   async function save(dataType, data) {
     try {
       const response = await fetch('/api/zad/save', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           app_id: window.APP_ID,
           data_type: dataType,
           content_data: data,
           participant_id: localStorage.getItem(window.APP_ID + '_user') || 'anonymous',
           action_type: 'save'
         })
       });
       return await response.json();
     } catch (error) {
       console.error('Save error:', error);
       return null;
     }
   }

   async function load(dataType) {
     try {
       const response = await fetch('/api/zad/load', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           app_id: window.APP_ID,
           data_type: dataType
         })
       });
       const result = await response.json();
       return result.data || [];
     } catch (error) {
       console.error('Load error:', error);
       return [];
     }
   }
   \`\`\`

Return a JSON object with:
{
  "name": "${submission.appName}",
  "slug": "${generateSlug(submission.appName)}",
  "icon": "${submission.appIcon || getDefaultIcon(appTemplate)}",
  "html_content": "<!DOCTYPE html>...",
  "theme_id": "${getThemeForTemplate(appTemplate)}",
  "window_config": {
    "width": 800,
    "height": 600,
    "resizable": true
  }
}

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
    
    if (!appSpec.name || !appSpec.html_content) {
      throw new Error('Invalid app specification');
    }

    // Use appSlug if provided, otherwise generate from name
    const slug = submission.appSlug || generateSlug(appSpec.name);
    
    return {
      ...appSpec,
      slug: slug,  // Use the unique slug
      submitterId: submission.recordId || submission.id,
      submitterName: submission.submitterName,
      originalRequest: submission.appFunction,
      createdAt: new Date().toISOString()
    };

  } catch (error) {
    console.error('Error generating windowed app:', error);
    return null;
  }
}

/**
 * Get template-specific instructions
 */
function getTemplateInstructions(template) {
  const instructions = {
    paint: `
   - Canvas element for drawing (id="canvas")
   - Color picker and brush size controls in toolbar
   - Tools: Pencil, Eraser, Fill, Line, Rectangle, Circle
   - Clear canvas button
   - Save drawing to ZAD (as base64 image)
   - Load previous drawing on startup
   - Status bar shows current tool and color`,
    
    notepad: `
   - Textarea for text editing (id="editor")
   - Toolbar with: New, Open, Save buttons
   - Word count in status bar
   - Auto-save every 30 seconds
   - Load last document on startup
   - Simple and clean interface`,
    
    game: `
   - Canvas or div-based game area
   - Start/Pause/Reset buttons
   - Score display
   - High score saved to ZAD
   - Simple but fun gameplay
   - Keyboard or mouse controls`,
    
    music: `
   - Simple sound/music maker
   - Buttons or keys that play tones
   - Record/playback functionality
   - Save compositions to ZAD
   - Visual feedback for sounds`,
    
    chat: `
   - Message list area
   - Input field for new messages
   - Username setting
   - Messages saved to ZAD (shared with all users)
   - Auto-refresh every 5 seconds
   - Timestamp for each message`,
    
    generic: `
   - Implement the requested functionality as described
   - Include save/load if data persistence makes sense
   - Keep the interface simple and intuitive
   - Use buttons and inputs as needed`
  };

  return instructions[template] || instructions.generic;
}

/**
 * Generate app ID from name
 */
function generateAppId(name) {
  return 'toybox-' + name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30);
}

/**
 * Generate URL slug from name
 */
function generateSlug(name) {
  return name.toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 30);
}

/**
 * Get default icon for template
 */
function getDefaultIcon(template) {
  const icons = {
    paint: '🎨',
    notepad: '📝',
    game: '🎮',
    music: '🎵',
    chat: '💬',
    generic: '📱'
  };
  return icons[template] || '📱';
}

/**
 * Get appropriate theme for template
 */
function getThemeForTemplate(template) {
  // All windowed apps in ToyBox OS should use System 7 theme for authentic classic Mac look
  return '2ec89c02-d424-4cf6-81f1-371ca6b9afcf'; // System 7 theme ID
}

/**
 * Deploy windowed app to Supabase
 */
async function deployWindowedApp(appSpec) {
  try {
    // Check if app already exists
    const { data: existing } = await supabase
      .from('wtaf_content')
      .select('id')
      .eq('user_slug', 'community')
      .eq('app_slug', appSpec.slug)
      .single();

    if (existing) {
      console.log(`App ${appSpec.slug} already exists, skipping`);
      return false;
    }

    // Deploy the app
    const { error } = await supabase
      .from('wtaf_content')
      .insert({
        user_slug: 'community',
        app_slug: appSpec.slug,
        html_content: appSpec.html_content,
        theme_id: appSpec.theme_id,
        original_prompt: appSpec.originalRequest,
        type: 'ZAD',
        status: 'published',
        coach: 'ToyBox OS',
        created_at: new Date()
      });

    if (error) {
      console.error('Error deploying app:', error);
      return false;
    }

    console.log(`✅ Deployed ${appSpec.name} to /community/${appSpec.slug}`);
    return true;

  } catch (error) {
    console.error('Error in deployment:', error);
    return false;
  }
}

/**
 * Add app to ToyBox OS desktop
 */
async function addToDesktop(appSpec) {
  try {
    // Get current ToyBox OS
    const { data: desktopData, error: fetchError } = await supabase
      .from('wtaf_content')
      .select('html_content')
      .eq('user_slug', 'public')
      .eq('app_slug', 'toybox-os')
      .single();

    if (fetchError) {
      console.error('Error fetching ToyBox OS:', fetchError);
      return false;
    }

    let html = desktopData.html_content;

    // Add to windowedApps registry
    const appRegistration = `
        '${appSpec.slug}': {
            name: '${appSpec.name}',
            url: '/community/${appSpec.slug}',
            icon: '${appSpec.icon}',
            width: ${appSpec.window_config?.width || 800},
            height: ${appSpec.window_config?.height || 600}
        },`;

    // Find windowedApps object and add the new app
    const windowedAppsIndex = html.indexOf('window.windowedApps = {');
    if (windowedAppsIndex > -1) {
      const insertPoint = html.indexOf('{', windowedAppsIndex) + 1;
      html = html.slice(0, insertPoint) + '\n' + appRegistration + html.slice(insertPoint);
    }

    // Find a good position for the icon
    const iconPattern = /style="left:\s*(\d+)px;\s*top:\s*(\d+)px;"/g;
    const positions = [];
    let match;
    while ((match = iconPattern.exec(html)) !== null) {
      positions.push({ x: parseInt(match[1]), y: parseInt(match[2]) });
    }

    // Find empty grid position
    let position = { x: 220, y: 20 };
    for (let y = 20; y <= 420; y += 100) {
      for (let x = 20; x <= 720; x += 100) {
        const isFree = !positions.some(p => 
          Math.abs(p.x - x) < 80 && Math.abs(p.y - y) < 80
        );
        if (isFree) {
          position = { x, y };
          break;
        }
      }
      if (position.x !== 220 || position.y !== 20) break;
    }

    // Add desktop icon
    const iconHtml = `
    <!-- ${appSpec.name} by ${appSpec.submitterName} -->
    <div class="desktop-icon" 
         style="left: ${position.x}px; top: ${position.y}px;"
         onclick="openWindowedApp('${appSpec.slug}')"
         title="${appSpec.name}">
        <div class="icon">${appSpec.icon}</div>
        <div class="label">${appSpec.name}</div>
    </div>`;

    // Add before end of desktop - try multiple patterns
    const desktopEndPatterns = [
      '</div><!-- end desktop -->',
      '</div><!--end desktop-->',
      '</div> <!-- end desktop -->',
      '<div class="taskbar"'
    ];
    
    let inserted = false;
    for (const pattern of desktopEndPatterns) {
      if (html.includes(pattern)) {
        if (pattern.includes('taskbar')) {
          html = html.replace(pattern, iconHtml + '\n    ' + pattern);
        } else {
          html = html.replace(pattern, iconHtml + '\n    ' + pattern);
        }
        inserted = true;
        break;
      }
    }
    
    if (!inserted) {
      console.log('Warning: Could not find desktop end marker, appending to end');
      // Fallback: find the last desktop icon and add after it
      const lastIcon = html.lastIndexOf('</div>\n    </div>');
      if (lastIcon > -1) {
        const insertPoint = lastIcon + '</div>'.length;
        html = html.slice(0, insertPoint) + '\n' + iconHtml + html.slice(insertPoint);
        inserted = true;
      }
    }

    // Update ToyBox OS
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
      return false;
    }

    console.log(`✅ Added ${appSpec.name} to ToyBox OS desktop`);
    return true;

  } catch (error) {
    console.error('Error adding to desktop:', error);
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
 * Main processing function
 */
async function processWindowedApps() {
  console.log('\n=== ToyBox OS Windowed App Processor ===');
  console.log('Time:', new Date().toISOString());
  
  // Load submissions
  const submissions = await loadWindowedAppSubmissions();
  console.log(`Found ${submissions.length} windowed app submissions`);

  if (submissions.length === 0) {
    console.log('No new windowed app submissions to process');
    return;
  }

  for (const record of submissions) {
    const submission = { ...record.content_data, recordId: record.id };
    console.log(`\nProcessing: "${submission.appName}" by ${submission.submitterName}`);
    console.log(`Type: ${submission.appType}, Function: ${submission.appFunction}`);

    // Generate the windowed app
    const appSpec = await generateWindowedApp(submission);
    
    if (!appSpec) {
      console.log('→ Failed: Could not generate app');
      await updateSubmissionStatus(record.id, 'failed', {
        reason: 'Generation failed'
      });
      continue;
    }

    console.log(`→ Generated: ${appSpec.name} (${appSpec.slug})`);

    // Deploy the app
    const deployed = await deployWindowedApp(appSpec);
    if (!deployed) {
      console.log('→ Failed: Could not deploy app');
      await updateSubmissionStatus(record.id, 'failed', {
        reason: 'Deployment failed or app already exists',
        appSpec
      });
      continue;
    }

    // Add to desktop
    const addedToDesktop = await addToDesktop(appSpec);
    if (!addedToDesktop) {
      console.log('→ Warning: App deployed but not added to desktop');
    }

    // Update submission status
    await updateSubmissionStatus(record.id, 'processed', {
      appSpec,
      deployedUrl: `/community/${appSpec.slug}`,
      processedAt: new Date().toISOString()
    });

    console.log(`✅ Successfully created ${appSpec.name}`);
  }

  console.log('\n=== Processing Complete ===\n');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  processWindowedApps().catch(console.error);
}

export { processWindowedApps, generateWindowedApp };