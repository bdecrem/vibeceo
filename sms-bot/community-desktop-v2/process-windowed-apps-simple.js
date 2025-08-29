#!/usr/bin/env node

/**
 * Simplified ToyBox OS Windowed App Processor
 * Creates basic windowed text editor without using Claude CLI
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local first, fallback to .env (use absolute paths)
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: path.join(__dirname, '..', '.env') });
}

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// App ID for windowed apps submissions
const WINDOWED_APPS_ID = 'toybox-windowed-apps';

/**
 * Generate a simple text editor app
 */
function generateSimpleTextEditor(submission) {
  const appId = submission.appSlug || generateAppId(submission.appName);
  const slug = submission.appSlug || generateSlug(submission.appName);
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${submission.appName}</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: -apple-system, system-ui, 'Segoe UI', sans-serif;
            background: white;
            height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        .toolbar {
            background: #f0f0f0;
            border-bottom: 1px solid #ccc;
            padding: 8px;
            display: flex;
            gap: 8px;
        }
        
        .button {
            padding: 4px 12px;
            background: white;
            border: 1px solid #999;
            border-radius: 3px;
            cursor: pointer;
            font-size: 13px;
        }
        
        .button:hover {
            background: #e8e8e8;
        }
        
        .button:active {
            background: #d0d0d0;
        }
        
        .window-content {
            flex: 1;
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        #editor {
            flex: 1;
            padding: 12px;
            border: none;
            outline: none;
            font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
            font-size: 14px;
            line-height: 1.5;
            resize: none;
        }
        
        .status-bar {
            background: #f0f0f0;
            border-top: 1px solid #ccc;
            padding: 4px 12px;
            font-size: 12px;
            color: #666;
        }
    </style>
</head>
<body class="theme-system7 windowed-app">
    <div class="toolbar">
        <button class="button" onclick="newDocument()">New</button>
        <button class="button" onclick="saveDocument()">Save</button>
        <button class="button" onclick="loadDocument()">Load</button>
        <button class="button" onclick="clearEditor()">Clear</button>
    </div>
    
    <div class="window-content">
        <textarea id="editor" placeholder="Start typing..."></textarea>
    </div>
    
    <div class="status-bar">
        <span id="status">Ready</span> | 
        <span id="wordCount">0 words</span> | 
        <span id="charCount">0 characters</span>
    </div>
    
    <script>
        // App configuration
        window.APP_ID = '${appId}';
        
        // ZAD helper functions
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
        
        // Editor functionality
        const editor = document.getElementById('editor');
        const statusEl = document.getElementById('status');
        const wordCountEl = document.getElementById('wordCount');
        const charCountEl = document.getElementById('charCount');
        
        function updateStats() {
            const text = editor.value;
            const words = text.trim() ? text.trim().split(/\\s+/).length : 0;
            const chars = text.length;
            wordCountEl.textContent = words + ' words';
            charCountEl.textContent = chars + ' characters';
        }
        
        editor.addEventListener('input', updateStats);
        
        function newDocument() {
            if (editor.value && !confirm('Create new document? Unsaved changes will be lost.')) {
                return;
            }
            editor.value = '';
            updateStats();
            statusEl.textContent = 'New document created';
        }
        
        async function saveDocument() {
            const content = editor.value;
            const result = await save('document', {
                content: content,
                savedAt: new Date().toISOString()
            });
            
            if (result) {
                statusEl.textContent = 'Document saved';
                setTimeout(() => {
                    statusEl.textContent = 'Ready';
                }, 2000);
            } else {
                statusEl.textContent = 'Save failed';
            }
        }
        
        async function loadDocument() {
            const documents = await load('document');
            if (documents.length > 0) {
                // Load the most recent document
                const latest = documents[documents.length - 1];
                editor.value = latest.content || '';
                updateStats();
                statusEl.textContent = 'Document loaded';
                setTimeout(() => {
                    statusEl.textContent = 'Ready';
                }, 2000);
            } else {
                statusEl.textContent = 'No saved documents found';
            }
        }
        
        function clearEditor() {
            if (confirm('Clear the editor?')) {
                editor.value = '';
                updateStats();
                statusEl.textContent = 'Editor cleared';
            }
        }
        
        // Auto-save every 30 seconds
        let autoSaveInterval;
        function startAutoSave() {
            autoSaveInterval = setInterval(async () => {
                if (editor.value.trim()) {
                    await saveDocument();
                    statusEl.textContent = 'Auto-saved';
                    setTimeout(() => {
                        statusEl.textContent = 'Ready';
                    }, 1000);
                }
            }, 30000);
        }
        
        // Load last document on startup
        window.addEventListener('load', async () => {
            await loadDocument();
            startAutoSave();
        });
        
        // Clean up on unload
        window.addEventListener('beforeunload', () => {
            if (autoSaveInterval) {
                clearInterval(autoSaveInterval);
            }
        });
    </script>
</body>
</html>`;

  return {
    name: submission.appName,
    slug: slug,
    icon: submission.appIcon || '📝',
    html_content: html,
    theme_id: '2ec89c02-d424-4cf6-81f1-371ca6b9afcf', // System 7 theme
    window_config: {
      width: 800,
      height: 600,
      resizable: true
    },
    submitterId: submission.recordId || submission.id,
    submitterName: submission.submitterName,
    originalRequest: submission.appFunction,
    createdAt: new Date().toISOString()
  };
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
  console.log('\n=== ToyBox OS Windowed App Processor (Simple) ===');
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

    // Generate a simple text editor (for now)
    const appSpec = generateSimpleTextEditor(submission);
    
    console.log(`→ Generated: ${appSpec.name} (${appSpec.slug})`);

    // Deploy the app
    const deployed = await deployWindowedApp(appSpec);
    if (!deployed) {
      console.log('→ Failed: Could not deploy app (may already exist)');
      await updateSubmissionStatus(record.id, 'failed', {
        reason: 'Deployment failed or app already exists',
        appSpec
      });
      continue;
    }

    // Update submission status
    await updateSubmissionStatus(record.id, 'processed', {
      appSpec,
      deployedUrl: `/community/${appSpec.slug}`,
      processedAt: new Date().toISOString()
    });

    console.log(`✅ Successfully created ${appSpec.name}`);
    console.log(`   URL: https://webtoys.ai/community/${appSpec.slug}`);
  }

  console.log('\n=== Processing Complete ===\n');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  processWindowedApps().catch(console.error);
}

export { processWindowedApps, generateSimpleTextEditor };