#!/usr/bin/env node

/**
 * WebtoysOS Edit Agent CLI - Improved Worker
 * Handles both app creation and app editing intelligently
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { createReadStream } from 'fs';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../../../.env.local') });
dotenv.config({ path: path.join(__dirname, '../../../.env.local') });
dotenv.config({ path: path.join(__dirname, '../../../.env') });

// Initialize Supabase
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const QUEUE_FILE = path.join(__dirname, '.edit-queue.json');

// Find Claude CLI
const CLAUDE_PATHS = [
    '/opt/homebrew/bin/claude',
    '/Users/bartdecrem/.local/bin/claude'
];

let CLAUDE_PATH = null;
for (const p of CLAUDE_PATHS) {
    try {
        await fs.access(p);
        CLAUDE_PATH = p;
        break;
    } catch {}
}

if (!CLAUDE_PATH) {
    console.error('❌ Claude CLI not found');
    process.exit(1);
}

console.log(`✅ Using Claude CLI at: ${CLAUDE_PATH}`);

/**
 * Detect if this is an app creation request vs an edit request
 */
function isAppCreationRequest(description, appSlug) {
    // If targeting the desktop and asking to create/make/add an app
    if (appSlug === 'toybox-os-v3-test') {
        const createPatterns = [
            /\b(create|make|build|add|develop)\s+.*\s+(app|application|game|tool|editor|calculator)/i,
            /\b(add|create|make)\s+(a|an)\s+\w+\s+(to|on|for)\s+(the\s+)?desktop/i,
            /\bmake\s+(a|an)\s+\w+\s+(app|game|tool)/i
        ];
        
        return createPatterns.some(pattern => pattern.test(description));
    }
    return false;
}

/**
 * Extract app name from creation request
 */
function extractAppName(description) {
    // Try various patterns to extract the app name
    const patterns = [
        /(?:create|make|build|add|develop)\s+(?:a|an)?\s*(?:simple|basic|new)?\s*(\w+(?:\s+\w+)?)\s+(?:app|application|game|tool|editor)/i,
        /(?:create|make|build|add)\s+(?:a|an)?\s*(?:app|application|game|tool|editor)\s+(?:called|named)\s+(\w+)/i,
        /(\w+(?:\s+\w+)?)\s+(?:app|application|game|tool|editor)/i
    ];
    
    for (const pattern of patterns) {
        const match = description.match(pattern);
        if (match && match[1]) {
            return match[1].trim();
        }
    }
    
    // Fallback: just grab the first noun-like word after "make/create"
    const fallbackMatch = description.match(/(?:make|create|add)\s+(?:a|an)?\s*(\w+)/i);
    return fallbackMatch ? fallbackMatch[1] : 'new-app';
}

/**
 * Process app creation request
 */
async function processAppCreation(request) {
    console.log('  🎨 Detected app creation request');
    
    const appName = extractAppName(request.description);
    const appSlug = `toybox-${appName.toLowerCase().replace(/\s+/g, '-')}`;
    const appId = appName.toLowerCase().replace(/\s+/g, '-');
    
    console.log(`  📱 Creating app: ${appName} (${appSlug})`);
    
    // Build a prompt for creating the app HTML
    const prompt = `You are creating a new WebtoysOS application.

App Name: ${appName}
App Description: ${request.description}

Create a complete HTML file for this app that:
1. Is a self-contained, single-file HTML application
2. Works well in an iframe (will be opened in a window)
3. Uses a clean, modern design with the WebtoysOS aesthetic
4. Includes any necessary JavaScript inline
5. Has proper meta tags and viewport settings
6. For games: includes canvas with proper sizing
7. For tools: includes a functional UI

IMPORTANT WebtoysOS Requirements:
- Set window.APP_ID = '${appId}';
- Include auth listener for TOYBOX_AUTH messages
- Use ZAD API for data persistence (/api/zad/save and /api/zad/load)
- Include these helper functions:

\`\`\`javascript
window.APP_ID = '${appId}';
let currentUser = null;

// Listen for auth from desktop
window.addEventListener('message', function(event) {
    if (event.data && event.data.type === 'TOYBOX_AUTH') {
        currentUser = event.data.user;
        updateUI(); // Define this based on your app's needs
    }
});

// ZAD helpers
async function save(dataType, data) {
    const response = await fetch('/api/zad/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            app_id: window.APP_ID,
            participant_id: currentUser?.handle ? \`\${currentUser.handle.toUpperCase()}_\${currentUser.pin}\` : 'anonymous',
            action_type: dataType,
            content_data: data
        })
    });
    return response.ok;
}

async function load(dataType) {
    const response = await fetch(\`/api/zad/load?app_id=\${window.APP_ID}&action_type=\${dataType}\`);
    const data = await response.json();
    return data || [];
}
\`\`\`

Based on this request: "${request.description}"

Please create a complete, functional HTML application. Return ONLY the HTML code, starting with <!DOCTYPE html> and ending with </html>.`;

    // Save prompt to temp file
    const tempDir = os.tmpdir();
    const promptFile = path.join(tempDir, `create-app-${request.id}.md`);
    await fs.writeFile(promptFile, prompt, 'utf-8');
    
    console.log('  🤖 Calling Claude CLI to create app...');
    
    // Execute Claude CLI
    const result = await executeClaudeWithSpawn(promptFile, request.id);
    
    // Clean up temp file
    await fs.unlink(promptFile).catch(() => {});
    
    if (!result.success) {
        throw new Error(`Claude CLI failed: ${result.error}`);
    }
    
    // Extract HTML from Claude's response
    const appHtml = extractHtmlFromResponse(result.stdout);
    
    if (!appHtml || !validateHtml(appHtml)) {
        throw new Error('Failed to generate valid app HTML');
    }
    
    console.log(`  ✅ Generated ${appName} app (${appHtml.length} bytes)`);
    
    // Step 1: Deploy the app to Supabase
    console.log('  📤 Deploying app to Supabase...');
    
    const timestamp = new Date().toISOString();
    const { error: deployError } = await supabase
        .from('wtaf_content')
        .upsert({
            user_slug: 'public',
            app_slug: appSlug,
            html_content: appHtml,
            created_at: timestamp,
            updated_at: timestamp,
            original_prompt: `${appName} - Created by Edit Agent`
        });
    
    if (deployError) {
        throw new Error(`Failed to deploy app: ${deployError.message}`);
    }
    
    // Step 2: Register in desktop config
    console.log('  📋 Registering app in desktop...');
    
    // Get current desktop config
    const { data: configData, error: configError } = await supabase
        .from('wtaf_desktop_config')
        .select('*')
        .eq('desktop_version', 'webtoys-os-v3')
        .is('user_id', null)
        .single();
    
    if (configError) {
        throw new Error(`Failed to get desktop config: ${configError.message}`);
    }
    
    // Parse the app registry
    let appRegistry = configData.app_registry || [];
    
    // Check if app is already registered
    const existingIndex = appRegistry.findIndex(app => app.id === appId);
    
    // Guess an appropriate icon
    const appIcon = guessIcon(appName);
    
    const appEntry = {
        id: appId,
        name: appName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
        url: `/public/${appSlug}`,
        icon: appIcon,
        width: 800,
        height: 600,
        resizable: true
    };
    
    if (existingIndex >= 0) {
        appRegistry[existingIndex] = appEntry;
        console.log('  ♻️  Updated existing app registration');
    } else {
        appRegistry.push(appEntry);
        console.log('  ✅ Added new app to registry');
    }
    
    // Update the desktop config
    const { error: updateError } = await supabase
        .from('wtaf_desktop_config')
        .update({
            app_registry: appRegistry,
            updated_at: timestamp
        })
        .eq('id', configData.id);
    
    if (updateError) {
        throw new Error(`Failed to update desktop config: ${updateError.message}`);
    }
    
    console.log(`  🎉 Successfully created and registered ${appName}!`);
    
    return {
        success: true,
        summary: `Created ${appName} app and added to desktop`,
        appUrl: `https://webtoys.ai/public/${appSlug}`
    };
}

/**
 * Process regular edit request (existing function, unchanged)
 */
async function processEdit(request) {
    // Check if this is actually an app creation request
    if (isAppCreationRequest(request.description, request.appSlug)) {
        return await processAppCreation(request);
    }
    
    // Otherwise, proceed with normal edit flow
    console.log('  ✏️  Processing regular edit request');
    
    // [Rest of the original processEdit function remains the same]
    // ... (original code for editing existing apps)
}

/**
 * Helper function to guess icon based on app name
 */
function guessIcon(appName) {
    const icons = {
        'text': '📝', 'editor': '📝', 'notepad': '📝',
        'calc': '🧮', 'calculator': '🧮',
        'paint': '🎨', 'draw': '🎨', 'art': '🎨',
        'game': '🎮', 'play': '🎮',
        'music': '🎵', 'audio': '🔊', 'sound': '🔊',
        'chat': '💬', 'message': '💬',
        'file': '📁', 'folder': '📁',
        'terminal': '💻', 'console': '💻',
        'browser': '🌐', 'web': '🌐',
        'clock': '🕐', 'time': '⏰',
        'photo': '📷', 'camera': '📷', 'image': '🖼️',
        'video': '🎬', 'movie': '🎬',
        'settings': '⚙️', 'config': '⚙️',
        'sudoku': '🔢', 'puzzle': '🧩',
        'chess': '♟️', 'checkers': '🎯',
        'b3rt': '📝', 'bert': '📝'
    };
    
    const lower = appName.toLowerCase();
    for (const [key, icon] of Object.entries(icons)) {
        if (lower.includes(key)) {
            return icon;
        }
    }
    return '📱'; // default icon
}

// [Include all the other helper functions from the original worker.js]
// executeClaudeWithSpawn, extractHtmlFromResponse, validateHtml, etc.
// ... (copy these from the original file)

/**
 * Main processing loop
 */
async function processQueue() {
    console.log('🔄 Starting to process edit queue...');
    
    // ... (rest of the main loop remains the same)
}

// Start processing
processQueue().catch(console.error);