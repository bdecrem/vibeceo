#!/usr/bin/env node

/**
 * Community Desktop App Injector
 * Takes processed app specifications and injects them into desktop.html
 * Runs every 2 minutes via cron
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Community desktop app ID
const DESKTOP_APP_ID = process.env.DESKTOP_APP_ID || 'community-desktop-apps';

/**
 * Load processed app submissions from ZAD
 */
async function loadProcessedApps() {
  const { data, error } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('*')
    .eq('app_id', DESKTOP_APP_ID)
    .eq('action_type', 'desktop_app');

  if (error) {
    console.error('Error loading processed apps:', error);
    return [];
  }

  // Filter for processed apps
  return data.filter(record => {
    const content = record.content_data || {};
    return content.status === 'processed' && content.appSpec;
  });
}

/**
 * Update app status in ZAD
 */
async function updateAppStatus(recordId, status, additionalData = {}) {
  const { data: current, error: fetchError } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('*')
    .eq('id', recordId)
    .single();

  if (fetchError) {
    console.error('Error fetching app:', fetchError);
    return false;
  }

  const updatedContent = {
    ...current.content_data,
    status: status,
    ...additionalData,
    updated_at: new Date().toISOString()
  };

  const { error: updateError } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .update({ 
      content_data: updatedContent,
      updated_at: new Date()
    })
    .eq('id', recordId);

  if (updateError) {
    console.error('Error updating app:', updateError);
    return false;
  }

  return true;
}

/**
 * Calculate position for new app icon to avoid overlaps
 */
function calculatePosition(existingApps) {
  const grid = { width: 100, height: 100 };
  const maxX = 800;
  const maxY = 500;
  
  // Try to find an empty grid position
  for (let y = 20; y < maxY; y += grid.height) {
    for (let x = 20; x < maxX; x += grid.width) {
      // Check if this position is taken
      const taken = existingApps.some(app => {
        const appX = parseInt(app.match(/left:\s*(\d+)px/)?.[1] || 0);
        const appY = parseInt(app.match(/top:\s*(\d+)px/)?.[1] || 0);
        return Math.abs(appX - x) < grid.width && Math.abs(appY - y) < grid.height;
      });
      
      if (!taken) {
        return { x, y };
      }
    }
  }
  
  // Fallback to random position if grid is full
  return {
    x: 20 + Math.floor(Math.random() * (maxX - 20)),
    y: 20 + Math.floor(Math.random() * (maxY - 20))
  };
}

/**
 * Inject app into desktop.html
 */
async function injectApp(appSpec) {
  const desktopPath = path.join(__dirname, 'desktop.html');
  
  try {
    // Read current desktop.html
    let html = await fs.readFile(desktopPath, 'utf-8');
    
    // Find existing apps between markers
    const startMarker = '<!-- COMMUNITY_APPS_START -->';
    const endMarker = '<!-- COMMUNITY_APPS_END -->';
    
    const startIdx = html.indexOf(startMarker);
    const endIdx = html.indexOf(endMarker);
    
    if (startIdx === -1 || endIdx === -1) {
      console.error('Could not find app injection markers in desktop.html');
      return false;
    }
    
    // Extract existing apps section
    const appsSection = html.substring(startIdx + startMarker.length, endIdx);
    const existingApps = appsSection.split('<div class="desktop-icon"').filter(s => s.trim());
    
    // Check if app already exists (by submitter ID)
    if (appsSection.includes(`data-submitter-id="${appSpec.submitterId}"`)) {
      console.log('App already exists on desktop');
      return true;
    }
    
    // Calculate position for new app
    const position = calculatePosition(existingApps);
    
    // Escape the code for HTML attribute
    const escapedCode = appSpec.code
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    // Create app HTML
    const appHtml = `
        <div class="desktop-icon" 
             style="left: ${position.x}px; top: ${position.y}px"
             data-submitter-id="${appSpec.submitterId}"
             title="${appSpec.tooltip || appSpec.name}"
             onclick="${escapedCode}">
            <div class="icon">${appSpec.icon}</div>
            <div class="label">${appSpec.name}</div>
        </div>`;
    
    // Insert the new app before the end marker
    const newHtml = html.substring(0, endIdx) + appHtml + '\n        ' + html.substring(endIdx);
    
    // Write updated HTML
    await fs.writeFile(desktopPath, newHtml);
    
    console.log(`✅ Added app "${appSpec.name}" to desktop at position (${position.x}, ${position.y})`);
    return true;
    
  } catch (error) {
    console.error('Error injecting app:', error);
    return false;
  }
}

/**
 * Main function to add apps to desktop
 */
async function addToDesktop() {
  console.log('\n=== Community Desktop App Injector ===');
  console.log('Time:', new Date().toISOString());
  
  // Check for STOP-AUTOFIX.txt (safety mechanism)
  try {
    await fs.access(path.join(__dirname, 'STOP-AUTOFIX.txt'));
    console.log('⛔ AUTOFIX IS DISABLED (STOP-AUTOFIX.txt exists)');
    return;
  } catch {
    // File doesn't exist, continue
  }
  
  // Load processed apps
  const apps = await loadProcessedApps();
  console.log(`Found ${apps.length} processed apps to add`);
  
  if (apps.length === 0) {
    console.log('No apps to add');
    return;
  }
  
  // Process each app
  for (const record of apps) {
    const appSpec = record.content_data.appSpec;
    console.log(`\nAdding: ${appSpec.name} ${appSpec.icon}`);
    
    // Inject into desktop.html
    const success = await injectApp(appSpec);
    
    if (success) {
      // Update status to 'added'
      await updateAppStatus(record.id, 'added', {
        addedAt: new Date().toISOString(),
        position: calculatePosition([]) // Store position for reference
      });
    } else {
      // Update status to 'failed'
      await updateAppStatus(record.id, 'add-failed', {
        failedAt: new Date().toISOString(),
        reason: 'Could not inject into desktop.html'
      });
    }
  }
  
  console.log('\n=== Injection Complete ===\n');
}

// Check if running directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  addToDesktop().catch(console.error);
}

export { addToDesktop, loadProcessedApps, injectApp };