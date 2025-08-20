#!/usr/bin/env node

/**
 * Community Desktop Windowed App Processor
 * Processes more complex app requests that require windowed interfaces
 * Uses theme system for consistent styling
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

// Community desktop app ID for windowed apps
const WINDOWED_APPS_ID = process.env.WINDOWED_APPS_ID || 'community-windowed-apps';

/**
 * Generate a theme-aware windowed app using Claude
 */
async function generateWindowedApp(submission) {
  const prompt = `Create a windowed desktop application based on this request.

User wants: "${submission.appName}"
Description: "${submission.appFunction}"
Submitted by: ${submission.submitterName || 'Anonymous'}

Generate HTML for a complete windowed application that:
1. Uses semantic HTML with class names (NO inline styles except for layout)
2. Includes these theme-aware classes:
   - .window-content (main content area)
   - .toolbar (for top controls)
   - .status-bar (for bottom status)
   - .button, .input, .textarea (for controls)
   - .panel, .sidebar (for layout sections)

3. Must include window.APP_ID for ZAD data persistence
4. Use ZAD helper functions for any data storage:
   - save(dataType, data) 
   - load(dataType)

5. Specify which theme to use:
   - theme_id: "toybox-os" (for OS/system apps)
   - theme_id: "notepad" (for text/document apps)
   - theme_id: "default" (for general apps)
   - theme_id: "custom-[name]" (suggest new theme if needed)

6. If suggesting a custom theme, provide the CSS in a separate css_content field

Return a JSON object with:
{
  "name": "App Name",
  "slug": "app-slug",
  "icon": "emoji",
  "html_content": "<!DOCTYPE html>...",
  "theme_id": "toybox-os|notepad|default|custom-name",
  "css_override": "/* Optional app-specific CSS */",
  "css_content": "/* Only if creating new custom theme */",
  "window_config": {
    "width": 600,
    "height": 400,
    "resizable": true
  }
}

Example structure (DO NOT include styles in HTML):
<!DOCTYPE html>
<html>
<head>
  <title>App Name</title>
</head>
<body>
  <div class="window-content">
    <div class="toolbar">
      <button class="button">Action</button>
    </div>
    <div class="main-panel">
      <textarea class="textarea editor"></textarea>
    </div>
    <div class="status-bar">
      <span class="status-text">Ready</span>
    </div>
  </div>
  <script>
    window.APP_ID = 'unique-app-id';
    
    // ZAD helpers
    async function save(dataType, data) { /* ... */ }
    async function load(dataType) { /* ... */ }
    
    // App logic here
  </script>
</body>
</html>

Respond with ONLY valid JSON, no explanation.`;

  try {
    const claudePath = '/Users/bartdecrem/.local/bin/claude';
    const { stdout } = await execAsync(`echo ${JSON.stringify(prompt)} | ${claudePath}`, {
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });

    // Parse the JSON response
    let jsonStr = stdout.trim();
    if (jsonStr.startsWith('```json')) {
      jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/```\s*$/, '');
    } else if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```\s*/, '').replace(/```\s*$/, '');
    }
    
    const appSpec = JSON.parse(jsonStr);
    
    // Validate the response
    if (!appSpec.name || !appSpec.html_content || !appSpec.theme_id) {
      throw new Error('Invalid app specification');
    }

    return {
      ...appSpec,
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
 * Deploy windowed app to Supabase
 */
async function deployWindowedApp(appSpec) {
  try {
    // If there's a custom theme, create it first
    if (appSpec.theme_id?.startsWith('custom-') && appSpec.css_content) {
      const themeId = appSpec.theme_id;
      const { error: themeError } = await supabase
        .from('wtaf_themes')
        .insert({
          id: themeId,
          name: appSpec.name + ' Theme',
          description: `Custom theme for ${appSpec.name}`,
          css_content: appSpec.css_content,
          is_active: true,
          created_by: 'community-desktop'
        });

      if (themeError) {
        console.error('Error creating custom theme:', themeError);
        // Fall back to default theme
        appSpec.theme_id = 'default';
      }
    }

    // Deploy the app to wtaf_content
    const { data, error } = await supabase
      .from('wtaf_content')
      .insert({
        user_slug: 'community',
        app_slug: appSpec.slug,
        html_content: appSpec.html_content,
        theme_id: appSpec.theme_id,
        css_override: appSpec.css_override,
        original_prompt: appSpec.originalRequest,
        type: 'ZAD',
        status: 'published',
        coach: 'Community Desktop',
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
 * Update ToyBox OS with new windowed app
 */
async function addToDesktop(appSpec) {
  try {
    // Get current ToyBox OS HTML
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

    // Add app to windowedApps registry
    const appRegistration = `
    window.windowedApps['${appSpec.slug}'] = {
        name: '${appSpec.name}',
        url: '/community/${appSpec.slug}',
        icon: '${appSpec.icon}',
        width: ${appSpec.window_config?.width || 600},
        height: ${appSpec.window_config?.height || 400}
    };`;

    // Insert before the closing script tag of windowedApps definition
    html = html.replace(
      '// End of windowed apps',
      appRegistration + '\n    // End of windowed apps'
    );

    // Add desktop icon (find a good position)
    const iconHtml = `
    <div class="desktop-icon" style="left: ${100 + Math.random() * 200}px; top: ${100 + Math.random() * 200}px;" 
         onclick="openWindowedApp('${appSpec.slug}')">
        <div class="icon">${appSpec.icon}</div>
        <div class="label">${appSpec.name}</div>
    </div>`;

    // Insert before closing desktop div
    html = html.replace('</div><!-- end desktop -->', iconHtml + '\n</div><!-- end desktop -->');

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
 * Load app submissions that need windowed interfaces
 */
async function loadWindowedAppSubmissions() {
  const { data, error } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('*')
    .eq('app_id', WINDOWED_APPS_ID)
    .eq('action_type', 'windowed_app')
    .eq('content_data->>status', 'new');

  if (error) {
    console.error('Error loading windowed app submissions:', error);
    return [];
  }

  return data || [];
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
  console.log('\n=== Community Desktop Windowed App Processor ===');
  console.log('Time:', new Date().toISOString());
  
  // Load submissions
  const submissions = await loadWindowedAppSubmissions();
  console.log(`Found ${submissions.length} windowed app submissions`);

  if (submissions.length === 0) {
    console.log('No new windowed app submissions to process');
    return;
  }

  // Process each submission
  for (const record of submissions) {
    const submission = { ...record.content_data, recordId: record.id };
    console.log(`\nProcessing: "${submission.appName}" by ${submission.submitterName}`);

    // Generate the windowed app
    const appSpec = await generateWindowedApp(submission);
    
    if (!appSpec) {
      console.log('→ Failed: Could not generate app');
      await updateSubmissionStatus(record.id, 'failed', {
        reason: 'Generation failed'
      });
      continue;
    }

    console.log(`→ Generated: ${appSpec.name} with theme ${appSpec.theme_id}`);

    // Deploy the app
    const deployed = await deployWindowedApp(appSpec);
    if (!deployed) {
      console.log('→ Failed: Could not deploy app');
      await updateSubmissionStatus(record.id, 'failed', {
        reason: 'Deployment failed'
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

    console.log(`✅ Successfully processed ${appSpec.name}`);
  }

  console.log('\n=== Processing Complete ===\n');
}

// Check if running directly
if (import.meta.url === `file://${process.argv[1]}`) {
  processWindowedApps().catch(console.error);
}

export { processWindowedApps, generateWindowedApp, deployWindowedApp };