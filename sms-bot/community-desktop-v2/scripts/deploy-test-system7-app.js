#!/usr/bin/env node

/**
 * Deploy Test System 7 App
 * Manually creates and deploys a test app with System 7 theme
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load .env from the main SMS bot directory
dotenv.config({ path: '../../.env.local' });
if (!process.env.SUPABASE_URL) {
  dotenv.config({ path: '../../.env' });
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.error('Missing required environment variables');
  console.log('SUPABASE_URL:', !!process.env.SUPABASE_URL);
  console.log('SUPABASE_SERVICE_KEY:', !!process.env.SUPABASE_SERVICE_KEY);
  process.exit(1);
}

// Supabase client
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

const testAppHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>System 7 Notepad</title>
</head>
<body class="theme-system7 windowed-app">
    <div class="toolbar">
        <button onclick="clearEditor()">New</button>
        <button onclick="saveDocument()">Save</button>
        <button onclick="loadDocument()">Open</button>
    </div>
    
    <div class="window-content">
        <textarea id="editor" style="width: 100%; height: 400px; border: none; resize: none; outline: none; font-family: inherit; background: #FFFFFF; font-size: 12px; padding: 8px;" placeholder="Welcome to System 7!

We hope you will enjoy the many new features and power of System 7. To get an overview of the new features, look at the Before You Install HyperCard stack provided on a separate disk.

This is a test of the System 7 window theming for ToyBox OS windowed apps. The theme should provide:
- Horizontal line pattern in title bars
- Close box on the left side
- Classic scroll bars
- Pixelated System 7 appearance

Try typing some text and using the Save/Load buttons to test the functionality!"></textarea>
    </div>
    
    <div class="status-bar">
        <span id="status">Ready - System 7 Theme Active</span>
    </div>

    <script>
        window.APP_ID = 'system7-notepad-demo';

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

        function clearEditor() {
            document.getElementById('editor').value = '';
            updateStatus('Document cleared');
        }

        async function saveDocument() {
            const content = document.getElementById('editor').value;
            const result = await save('document', { text: content, timestamp: new Date().toISOString() });
            if (result) {
                updateStatus('Document saved to cloud');
            } else {
                // Fallback to localStorage
                localStorage.setItem(window.APP_ID + '_document', content);
                updateStatus('Document saved locally');
            }
        }

        async function loadDocument() {
            const cloudData = await load('document');
            if (cloudData && cloudData.length > 0) {
                const latest = cloudData[cloudData.length - 1];
                document.getElementById('editor').value = latest.content_data.text || '';
                updateStatus('Document loaded from cloud');
            } else {
                // Fallback to localStorage
                const content = localStorage.getItem(window.APP_ID + '_document');
                if (content) {
                    document.getElementById('editor').value = content;
                    updateStatus('Document loaded from local storage');
                } else {
                    updateStatus('No saved document found');
                }
            }
        }

        function updateStatus(message) {
            document.getElementById('status').textContent = message;
            setTimeout(() => {
                document.getElementById('status').textContent = 'Ready - System 7 Theme Active';
            }, 3000);
        }

        // Auto-save every 30 seconds
        setInterval(async () => {
            const content = document.getElementById('editor').value;
            if (content.trim()) {
                await save('autosave', { text: content, timestamp: new Date().toISOString() });
                updateStatus('Auto-saved');
            }
        }, 30000);

        // Load document on startup
        document.addEventListener('DOMContentLoaded', () => {
            loadDocument();
        });
    </script>
</body>
</html>`;

async function deployTestApp() {
  console.log('\n=== Deploying System 7 Test App ===');
  
  const appSlug = 'system7-notepad-demo';
  
  try {
    // Check if app already exists
    const { data: existing } = await supabase
      .from('wtaf_content')
      .select('id')
      .eq('user_slug', 'community')
      .eq('app_slug', appSlug)
      .single();

    if (existing) {
      console.log('Updating existing test app...');
      const { error } = await supabase
        .from('wtaf_content')
        .update({
          html_content: testAppHTML,
          theme_id: '2ec89c02-d424-4cf6-81f1-371ca6b9afcf', // System 7 theme ID
          updated_at: new Date()
        })
        .eq('id', existing.id);

      if (error) {
        console.error('❌ Error updating app:', error);
      } else {
        console.log(`✅ Test app updated: /community/${appSlug}`);
      }
    } else {
      console.log('Creating new test app...');
      const { error } = await supabase
        .from('wtaf_content')
        .insert({
          user_slug: 'community',
          app_slug: appSlug,
          html_content: testAppHTML,
          theme_id: '2ec89c02-d424-4cf6-81f1-371ca6b9afcf', // System 7 theme ID
          original_prompt: 'Test System 7 notepad app with proper windowed styling',
          type: 'ZAD',
          status: 'published',
          coach: 'System 7 Test',
          created_at: new Date()
        });

      if (error) {
        console.error('❌ Error creating app:', error);
      } else {
        console.log(`✅ Test app created: /community/${appSlug}`);
      }
    }

    console.log(`\n🌐 View the test app at: https://webtoys.ai/community/${appSlug}`);
    console.log('The app should display with authentic System 7 window styling including:');
    console.log('- Horizontal line pattern in title bar');
    console.log('- Close box on left side');
    console.log('- Classic System 7 scroll bars');
    console.log('- Pixelated/dithered appearance');
    console.log('- Chicago-style font rendering');
    
  } catch (error) {
    console.error('❌ Error deploying test app:', error);
  }
}

// Run the deployment
deployTestApp().catch(console.error);