#!/usr/bin/env node

/**
 * Community Desktop App Processor
 * Reads app submissions from ZAD and transforms them into desktop app objects
 * Runs every 2 minutes via cron
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

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

// Community desktop app ID
const DESKTOP_APP_ID = process.env.DESKTOP_APP_ID || 'community-desktop-apps';

/**
 * Load app submissions from ZAD with specific status
 */
async function loadAppSubmissions(status = 'new') {
  const { data, error } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('*')
    .eq('app_id', DESKTOP_APP_ID)
    .eq('action_type', 'desktop_app');

  if (error) {
    console.error('Error loading app submissions:', error);
    return [];
  }

  // Filter by status in content_data
  return data.filter(record => {
    const content = record.content_data || {};
    return content.status === status || (!content.status && status === 'new');
  });
}

/**
 * Update an app submission in ZAD
 */
async function updateAppSubmission(recordId, updates) {
  // First get the current record
  const { data: current, error: fetchError } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .select('*')
    .eq('id', recordId)
    .single();

  if (fetchError) {
    console.error('Error fetching app submission:', fetchError);
    return false;
  }

  // Merge updates into content_data
  const updatedContent = {
    ...current.content_data,
    ...updates,
    updated_at: new Date().toISOString()
  };

  // Update the record
  const { error: updateError } = await supabase
    .from('wtaf_zero_admin_collaborative')
    .update({ 
      content_data: updatedContent,
      updated_at: new Date()
    })
    .eq('id', recordId);

  if (updateError) {
    console.error('Error updating app submission:', updateError);
    return false;
  }

  return true;
}

/**
 * Transform app submission into desktop app object using Claude
 */
async function transformToDesktopApp(submission) {
  const prompt = `Transform this user submission into a simple desktop app specification.

User wants an app called: "${submission.appName}"
It should: "${submission.appFunction}"
Submitted by: ${submission.submitterName || 'Anonymous'}

Generate a JSON object with:
1. name: A short, catchy name (max 12 chars)
2. icon: A single emoji that represents the app
3. code: Simple JavaScript code that runs when clicked. Use only:
   - alert() for messages
   - prompt() for input
   - confirm() for yes/no
   - Basic math and string operations
   - localStorage for simple persistence
   - document.body.style for visual changes
   Keep it VERY simple - one line if possible, max 3 lines
4. tooltip: A fun description (max 50 chars)

Examples of good code:
- "alert('You rolled: ' + Math.ceil(Math.random()*6))"
- "localStorage.petName = prompt('Name your pet:') || 'Rocky'; alert('Your pet ' + localStorage.petName + ' says hi!')"
- "document.body.style.filter = 'hue-rotate(' + Math.random()*360 + 'deg)'"

Respond with ONLY valid JSON, no explanation.`;

  try {
    // Use full path for cron compatibility
    const claudePath = '/Users/bartdecrem/.local/bin/claude';
    const { stdout } = await execAsync(`echo ${JSON.stringify(prompt)} | ${claudePath} --no-markdown`, {
      maxBuffer: 1024 * 1024 * 10 // 10MB buffer
    });

    // Parse the JSON response
    const appSpec = JSON.parse(stdout.trim());
    
    // Validate the response
    if (!appSpec.name || !appSpec.icon || !appSpec.code) {
      throw new Error('Invalid app specification');
    }

    return {
      ...appSpec,
      submitterId: submission.id,
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
 * Check if app name/concept is inappropriate
 */
function isInappropriate(submission) {
  const inappropriate = [
    'test', 'testing', 'asdf', 'xxx', 'fuck', 'shit', 
    'penis', 'vagina', 'nazi', 'hitler', 'nigger'
  ];
  
  const text = `${submission.appName} ${submission.appFunction}`.toLowerCase();
  return inappropriate.some(word => text.includes(word));
}

/**
 * Main processing function
 */
async function processApps() {
  console.log('\n=== Community Desktop App Processor ===');
  console.log('Time:', new Date().toISOString());
  
  // Load new submissions
  const submissions = await loadAppSubmissions('new');
  console.log(`Found ${submissions.length} new app submissions`);

  if (submissions.length === 0) {
    console.log('No new submissions to process');
    return;
  }

  // Process each submission
  for (const record of submissions) {
    const submission = record.content_data;
    console.log(`\nProcessing: "${submission.appName}" by ${submission.submitterName}`);

    // Check for inappropriate content
    if (isInappropriate(submission)) {
      console.log('→ Rejected: Inappropriate content');
      await updateAppSubmission(record.id, {
        status: 'rejected',
        reason: 'Inappropriate content'
      });
      continue;
    }

    // Transform to desktop app
    const appSpec = await transformToDesktopApp(submission);
    
    if (!appSpec) {
      console.log('→ Failed: Could not transform to app');
      await updateAppSubmission(record.id, {
        status: 'failed',
        reason: 'Transformation failed'
      });
      continue;
    }

    console.log(`→ Transformed: ${appSpec.name} ${appSpec.icon}`);

    // Update submission with app specification
    await updateAppSubmission(record.id, {
      status: 'processed',
      appSpec: appSpec,
      processedAt: new Date().toISOString()
    });
  }

  console.log('\n=== Processing Complete ===\n');
}

// Check if running directly (not imported)
if (import.meta.url === `file://${process.argv[1]}`) {
  processApps().catch(console.error);
}

export { processApps, loadAppSubmissions, updateAppSubmission };