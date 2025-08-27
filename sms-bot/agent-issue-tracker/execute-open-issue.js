#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import { exec, spawn } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config({ path: '../.env.local' });

const execAsync = promisify(exec);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const ISSUE_TRACKER_APP_ID = process.env.ISSUE_TRACKER_APP_ID || 'toybox-direct-updates';

// Helper to create a simple text editor app
async function createTextEditor(appName, description) {
    console.log(`📝 Creating ${appName} text editor...`);
    
    // Generate app slug
    const appSlug = `toybox-${appName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
    
    // Create HTML for the text editor
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${appName}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Courier New', Monaco, monospace;
            background: #ffffff;
            display: flex;
            flex-direction: column;
            height: 100vh;
        }
        .menu-bar {
            background: linear-gradient(to bottom, #f0f0f0, #e0e0e0);
            border-bottom: 1px solid #808080;
            display: flex;
            padding: 4px;
            font-size: 12px;
        }
        .menu-item {
            padding: 4px 12px;
            cursor: pointer;
            user-select: none;
        }
        .menu-item:hover {
            background: #e0e0e0;
            border: 1px solid #808080;
        }
        .toolbar {
            background: #f0f0f0;
            border-bottom: 1px solid #808080;
            padding: 4px;
            display: flex;
            gap: 8px;
        }
        .toolbar button {
            padding: 4px 12px;
            background: linear-gradient(to bottom, #ffffff, #e0e0e0);
            border: 1px solid #808080;
            cursor: pointer;
            font-size: 11px;
        }
        .toolbar button:active {
            background: linear-gradient(to bottom, #e0e0e0, #d0d0d0);
        }
        .editor-container {
            flex: 1;
            display: flex;
            overflow: hidden;
        }
        textarea {
            flex: 1;
            border: none;
            outline: none;
            padding: 8px;
            font-family: 'Courier New', Monaco, monospace;
            font-size: 13px;
            line-height: 1.5;
            resize: none;
        }
        .status-bar {
            background: #f0f0f0;
            border-top: 1px solid #808080;
            padding: 2px 8px;
            font-size: 11px;
            display: flex;
            justify-content: space-between;
        }
        .dialog {
            display: none;
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #c0c0c0;
            border: 2px solid #000000;
            padding: 8px;
            z-index: 1000;
            min-width: 300px;
            box-shadow: 4px 4px 0 rgba(0,0,0,0.5);
        }
        .dialog-title {
            background: linear-gradient(to right, #000080, #1084d0);
            color: white;
            padding: 2px 4px;
            margin: -8px -8px 8px -8px;
            font-weight: bold;
            font-size: 12px;
        }
        .dialog input {
            width: 100%;
            padding: 4px;
            margin: 8px 0;
            border: 1px solid #000000;
        }
        .dialog-buttons {
            display: flex;
            justify-content: flex-end;
            gap: 8px;
            margin-top: 8px;
        }
        .dialog button {
            padding: 4px 16px;
            background: linear-gradient(to bottom, #ffffff, #e0e0e0);
            border: 1px solid #000000;
            cursor: pointer;
        }
        .file-list {
            max-height: 200px;
            overflow-y: auto;
            border: 1px solid #808080;
            background: white;
            margin: 8px 0;
        }
        .file-item {
            padding: 4px;
            cursor: pointer;
            font-size: 12px;
        }
        .file-item:hover {
            background: #0066cc;
            color: white;
        }
        .file-item.selected {
            background: #0066cc;
            color: white;
        }
    </style>
</head>
<body>
    <div class="menu-bar">
        <div class="menu-item" onclick="newFile()">New</div>
        <div class="menu-item" onclick="showOpenDialog()">Open</div>
        <div class="menu-item" onclick="saveFile()">Save</div>
        <div class="menu-item" onclick="showSaveAsDialog()">Save As</div>
    </div>
    
    <div class="toolbar">
        <button onclick="newFile()">📄 New</button>
        <button onclick="showOpenDialog()">📂 Open</button>
        <button onclick="saveFile()">💾 Save</button>
        <button onclick="document.execCommand('cut')">✂️ Cut</button>
        <button onclick="document.execCommand('copy')">📋 Copy</button>
        <button onclick="document.execCommand('paste')">📌 Paste</button>
        <button onclick="document.execCommand('undo')">↶ Undo</button>
        <button onclick="document.execCommand('redo')">↷ Redo</button>
    </div>
    
    <div class="editor-container">
        <textarea id="editor" placeholder="Start typing..." spellcheck="false"></textarea>
    </div>
    
    <div class="status-bar">
        <div id="status">Ready</div>
        <div id="stats">Lines: 1 | Chars: 0</div>
        <div id="user-status">Not logged in</div>
    </div>
    
    <div id="saveDialog" class="dialog">
        <div class="dialog-title">Save As</div>
        <label>Filename:</label>
        <input type="text" id="saveFilename" placeholder="untitled.txt">
        <div class="dialog-buttons">
            <button onclick="closeSaveDialog()">Cancel</button>
            <button onclick="performSave()">Save</button>
        </div>
    </div>
    
    <div id="openDialog" class="dialog">
        <div class="dialog-title">Open File</div>
        <div class="file-list" id="fileList"></div>
        <div class="dialog-buttons">
            <button onclick="closeOpenDialog()">Cancel</button>
            <button onclick="performOpen()">Open</button>
        </div>
    </div>

    <script>
        window.APP_ID = '${appSlug}';
        let currentUser = null;
        let currentFile = null;
        let isDirty = false;
        let selectedFile = null;
        
        const editor = document.getElementById('editor');
        const statusEl = document.getElementById('status');
        const statsEl = document.getElementById('stats');
        const userStatusEl = document.getElementById('user-status');
        
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'TOYBOX_AUTH') {
                currentUser = event.data.user;
                updateUserStatus();
            }
        });
        
        function loadAuth() {
            const savedUser = localStorage.getItem('toybox_user');
            if (savedUser) {
                try {
                    currentUser = JSON.parse(savedUser);
                    updateUserStatus();
                } catch (e) {
                    console.error('Failed to parse saved user');
                }
            }
        }
        
        function updateUserStatus() {
            if (currentUser) {
                userStatusEl.textContent = 'User: ' + currentUser.handle;
            } else {
                userStatusEl.textContent = 'Not logged in';
            }
        }
        
        async function save(dataType, data) {
            try {
                const response = await fetch('/api/zad/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        app_id: window.APP_ID,
                        participant_id: currentUser?.handle || 'anonymous',
                        action_type: dataType,
                        content_data: data
                    })
                });
                return response.ok;
            } catch (error) {
                console.error('Save error:', error);
                return false;
            }
        }
        
        async function load(dataType) {
            try {
                const response = await fetch('/api/zad/load?app_id=' + window.APP_ID + '&action_type=' + dataType);
                const data = await response.json();
                return data || [];
            } catch (error) {
                console.error('Load error:', error);
                return [];
            }
        }
        
        function newFile() {
            if (isDirty && editor.value.trim()) {
                if (confirm('Save current file?')) {
                    saveFile();
                }
            }
            editor.value = '';
            currentFile = null;
            isDirty = false;
            updateStatus('New file created');
            updateStats();
        }
        
        async function saveFile() {
            if (!currentFile) {
                showSaveAsDialog();
                return;
            }
            
            const content = editor.value;
            const fileData = {
                filename: currentFile,
                content: content,
                author: currentUser?.handle || 'anonymous',
                timestamp: new Date().toISOString()
            };
            
            const success = await save('file', fileData);
            if (success) {
                isDirty = false;
                updateStatus('Saved: ' + currentFile);
            } else {
                updateStatus('Save failed');
            }
        }
        
        async function performSave() {
            const filename = document.getElementById('saveFilename').value.trim();
            if (!filename) {
                alert('Please enter a filename');
                return;
            }
            
            currentFile = filename;
            await saveFile();
            closeSaveDialog();
        }
        
        async function showOpenDialog() {
            const files = await load('file');
            const fileList = document.getElementById('fileList');
            fileList.innerHTML = '';
            
            const fileMap = {};
            files.forEach(file => {
                const data = file.content_data;
                if (!fileMap[data.filename] || new Date(data.timestamp) > new Date(fileMap[data.filename].timestamp)) {
                    fileMap[data.filename] = data;
                }
            });
            
            Object.keys(fileMap).sort().forEach(filename => {
                const div = document.createElement('div');
                div.className = 'file-item';
                div.textContent = filename;
                div.onclick = () => selectFile(filename, fileMap[filename]);
                fileList.appendChild(div);
            });
            
            document.getElementById('openDialog').style.display = 'block';
        }
        
        function selectFile(filename, data) {
            selectedFile = { filename, data };
            document.querySelectorAll('.file-item').forEach(item => {
                item.classList.remove('selected');
                if (item.textContent === filename) {
                    item.classList.add('selected');
                }
            });
        }
        
        function performOpen() {
            if (!selectedFile) {
                alert('Please select a file');
                return;
            }
            
            editor.value = selectedFile.data.content;
            currentFile = selectedFile.filename;
            isDirty = false;
            updateStatus('Opened: ' + currentFile);
            updateStats();
            closeOpenDialog();
        }
        
        function showSaveAsDialog() {
            document.getElementById('saveFilename').value = currentFile || 'untitled.txt';
            document.getElementById('saveDialog').style.display = 'block';
        }
        
        function closeSaveDialog() {
            document.getElementById('saveDialog').style.display = 'none';
        }
        
        function closeOpenDialog() {
            document.getElementById('openDialog').style.display = 'none';
            selectedFile = null;
        }
        
        function updateStatus(message) {
            statusEl.textContent = message;
        }
        
        function updateStats() {
            const text = editor.value;
            const lines = text.split('\\n').length;
            const chars = text.length;
            statsEl.textContent = 'Lines: ' + lines + ' | Chars: ' + chars;
        }
        
        editor.addEventListener('input', () => {
            isDirty = true;
            updateStats();
            updateStatus('Modified');
        });
        
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 's':
                        e.preventDefault();
                        saveFile();
                        break;
                    case 'n':
                        e.preventDefault();
                        newFile();
                        break;
                    case 'o':
                        e.preventDefault();
                        showOpenDialog();
                        break;
                }
            }
        });
        
        window.addEventListener('DOMContentLoaded', () => {
            loadAuth();
            updateStats();
            updateStatus('Ready');
            
            if (window.parent !== window) {
                window.parent.postMessage({ type: 'REQUEST_AUTH' }, '*');
            }
        });
    </script>
</body>
</html>`;

    // Deploy to database
    const { error: deployError } = await supabase
        .from('wtaf_content')
        .upsert({
            user_slug: 'public',
            app_slug: appSlug,
            html_content: html,
            original_prompt: description
        });
    
    if (deployError) {
        console.error('❌ Failed to deploy app:', deployError);
        return null;
    }
    
    console.log(`✅ Deployed ${appName} to /public/${appSlug}`);
    
    return {
        name: appName,
        slug: appSlug,
        icon: '📝'
    };
}

// Deploy created HTML file to Supabase database
async function deployCreatedApp(parsed) {
    const appSlug = parsed.name.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const possibleFilenames = [
        `${appSlug}.html`,
        `${parsed.name.toLowerCase()}.html`,
        `${parsed.name}.html`
    ];
    
    console.log(`🔍 Looking for HTML files: ${possibleFilenames.join(', ')}`);
    
    // Try to find the HTML file Claude created
    let htmlFile = null;
    let htmlContent = null;
    
    for (const filename of possibleFilenames) {
        const filepath = path.join('/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/community-desktop-v2', filename);
        try {
            if (await fs.promises.access(filepath, fs.constants.F_OK).then(() => true).catch(() => false)) {
                htmlContent = await fs.promises.readFile(filepath, 'utf8');
                htmlFile = filename;
                console.log(`✅ Found ${filename} (${htmlContent.length} characters)`);
                break;
            }
        } catch (error) {
            // File doesn't exist, continue searching
        }
    }
    
    if (!htmlContent) {
        console.log('⚠️  No HTML file found to deploy');
        return false;
    }
    
    // Deploy to Supabase
    console.log(`📤 Deploying ${htmlFile} to /public/${appSlug}...`);
    
    const { data, error } = await supabase
        .from('wtaf_content')
        .upsert({
            user_slug: 'public',
            app_slug: appSlug,
            html_content: htmlContent,
            original_prompt: parsed.description,
            updated_at: new Date().toISOString(),
            created_at: new Date().toISOString()
        }, {
            onConflict: 'user_slug,app_slug'
        });
    
    if (error) {
        throw new Error(`Database deployment failed: ${error.message}`);
    }
    
    console.log(`✅ Deployed to https://webtoys.ai/public/${appSlug}`);
    return true;
}

// Add app to windowedApps registry and desktop using proven 3-system approach
async function addToDesktop(app) {
    console.log(`🖥️ Adding ${app.name} to webtoys-os-v2 desktop using proven 3-system approach...`);
    
    try {
        // 1. Fetch webtoys-os-v2 desktop
        console.log('1️⃣ Fetching webtoys-os-v2...');
        const { data: desktop, error } = await supabase
            .from('wtaf_content')
            .select('*')
            .eq('user_slug', 'public')
            .eq('app_slug', 'webtoys-os-v2')
            .single();
        
        if (error || !desktop) {
            console.error('❌ Failed to fetch webtoys-os-v2:', error);
            return false;
        }
        
        let html = desktop.html_content;
        console.log('✅ Fetched webtoys-os-v2');
        
        // Define position variables at function scope
        const baseX = 520;
        const baseY = 280;
        const offset = Math.floor(Math.random() * 3) * 100; // 0, 100, or 200px offset
        const finalX = baseX + offset;
        const finalY = baseY + (offset / 2);
        
        // 2. Add to windowedApps registry
        console.log('2️⃣ Adding to windowedApps registry...');
        if (!html.includes(`'${app.slug}':`)) {
            const registryPattern = /(window\.windowedApps\s*=\s*\{[\s\S]*?)(\s*\};)/;
            const registryMatch = html.match(registryPattern);
            
            if (registryMatch) {
                const appEntry = `
            '${app.slug}': {
                name: '${app.name}',
                url: '/public/${app.slug}',
                icon: '${app.icon}',
                width: 700,
                height: 500
            },`;
                
                const newRegistry = registryMatch[1] + appEntry + registryMatch[2];
                html = html.replace(registryMatch[0], newRegistry);
                console.log('✅ Added to windowedApps registry');
            } else {
                console.error('❌ Could not find windowedApps registry');
                return false;
            }
        } else {
            console.log('⚠️  Already in windowedApps registry');
        }
        
        // 3. Add HTML desktop icon INSIDE #desktop div (critical fix from TEXTY debug)
        console.log('3️⃣ Adding desktop icon inside #desktop div...');
        if (!html.includes(`onclick="openWindowedApp('${app.slug}')">`)) {
            const desktopDivPattern = /<div id="desktop">\s*/;
            const desktopMatch = html.match(desktopDivPattern);
            
            if (desktopMatch) {
                const insertPoint = desktopMatch.index + desktopMatch[0].length;
                
                // Use pre-calculated position
                
                const iconHTML = `
    <!-- ${app.name} -->
    <div class="desktop-icon" 
         style="left: ${finalX}px; top: ${finalY}px;"
         onclick="openWindowedApp('${app.slug}')"
         title="${app.name}">
        <div class="icon">${app.icon}</div>
        <div class="label">${app.name}</div>
    </div>
`;
                
                html = html.slice(0, insertPoint) + iconHTML + html.slice(insertPoint);
                console.log(`✅ Added desktop icon inside #desktop div at (${finalX}, ${finalY})`);
            } else {
                console.error('❌ Could not find #desktop div');
                return false;
            }
        } else {
            console.log('⚠️  Desktop icon already exists');
        }
        
        // 4. Update database
        console.log('4️⃣ Updating webtoys-os-v2 in database...');
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({ html_content: html })
            .eq('user_slug', 'public')
            .eq('app_slug', 'webtoys-os-v2');
        
        if (updateError) {
            console.error('❌ Failed to update database:', updateError);
            return false;
        }
        console.log('✅ Updated HTML in database');
        
        // 5. Add to layout data system (critical for visibility)
        console.log('5️⃣ Adding to layout data system...');
        await updateDesktopLayout(app.name, finalX, finalY);
        
        console.log(`🎉 Successfully added ${app.name} to webtoys-os-v2 desktop!`);
        console.log(`🔗 Live at: https://webtoys.ai/public/webtoys-os-v2`);
        
        return true;
        
    } catch (error) {
        console.error('❌ Error in addToDesktop:', error);
        return false;
    }
}

// Update desktop layout visibility (fixed to match HTML positioning)
async function updateDesktopLayout(appName, x, y) {
    console.log(`📐 Updating desktop layout for "${appName}" at position (${x}, ${y})...`);
    
    try {
        // Load current layout
        const { data: layoutData, error } = await supabase
            .from('wtaf_zero_admin_collaborative')
            .select('*')
            .eq('app_id', 'toybox-desktop-layout')
            .eq('action_type', 'desktop_state')
            .eq('participant_id', 'global')
            .order('created_at', { ascending: false })
            .limit(1);
        
        if (error || !layoutData || layoutData.length === 0) {
            console.log('⚠️ No desktop layout found, creating new one');
            const simpleName = appName.toLowerCase().replace(/[^a-z0-9]/g, '');
            const newLayout = {
                icons: {
                    [simpleName]: {
                        x: x,
                        y: y,
                        visible: true,
                        label: appName
                    }
                },
                lastModified: new Date().toISOString(),
                modifiedBy: 'auto-agent'
            };
            
            await supabase
                .from('wtaf_zero_admin_collaborative')
                .insert({
                    app_id: 'toybox-desktop-layout',
                    action_type: 'desktop_state',
                    participant_id: 'global',
                    content_data: newLayout
                });
            
            console.log('✅ Created new layout with icon visible');
            return;
        }
        
        // Update existing layout (use same approach as PAINTY)
        const currentLayout = layoutData[0];
        const icons = { ...currentLayout.content_data.icons };
        const simpleName = appName.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Add the app to layout data with matching HTML position
        icons[simpleName] = {
            x: x,
            y: y,
            visible: true,
            label: appName
        };
        
        const updatedContentData = {
            ...currentLayout.content_data,
            icons: icons,
            lastModified: new Date().toISOString(),
            modifiedBy: 'auto-agent'
        };
        
        // Insert new layout record (same as PAINTY approach)
        const { error: layoutError } = await supabase
            .from('wtaf_zero_admin_collaborative')
            .insert({
                app_id: 'toybox-desktop-layout',
                participant_id: 'global',
                action_type: 'desktop_state',
                content_data: updatedContentData
            });
        
        if (layoutError) {
            console.error('❌ Layout data update failed:', layoutError);
        } else {
            console.log(`✅ Added ${appName} to layout data at (${x}, ${y}) with visible: true`);
        }
        
    } catch (error) {
        console.error('❌ Error updating desktop layout:', error);
    }
}

// Get appropriate icon for app type
function getIconForAppType(type) {
    // Default icons for different app types
    const icons = {
        'text-editor': '📝',
        'paint': '🎨',
        'calculator': '🧮',
        'game': '🎮',
        'chat': '💬',
        'app': '📱'
    };
    return icons[type] || '📄';
}

// Parse issue description to understand what to create
function parseIssueDescription(description) {
    const lower = description.toLowerCase();
    
    // Check for text editor
    if (lower.includes('text editor') || lower.includes('notepad') || lower.includes('writer') || lower.includes('word processor')) {
        const nameMatch = description.match(/called\s+(\w+)|named\s+(\w+)|"([^"]+)"|'([^']+)'|\b(\w+)\s*$/);
        const appName = nameMatch ? (nameMatch[1] || nameMatch[2] || nameMatch[3] || nameMatch[4] || nameMatch[5]) : 'TextEdit';
        return { type: 'text-editor', name: appName, description: description };
    }
    
    // Check for paint/drawing apps
    if (lower.includes('paint') || lower.includes('draw') || lower.includes('sketch') || lower.includes('canvas') || lower.includes('art')) {
        const nameMatch = description.match(/called\s+(\w+)|named\s+(\w+)|"([^"]+)"|'([^']+)'|\b(\w+)\s*$/);
        const appName = nameMatch ? (nameMatch[1] || nameMatch[2] || nameMatch[3] || nameMatch[4] || nameMatch[5]) : 'Paint';
        return { type: 'paint', name: appName, description: description };
    }
    
    // Check for calculator
    if (lower.includes('calculator') || lower.includes('calc') || lower.includes('math')) {
        const nameMatch = description.match(/called\s+(\w+)|named\s+(\w+)|"([^"]+)"|'([^']+)'|\b(\w+)\s*$/);
        const appName = nameMatch ? (nameMatch[1] || nameMatch[2] || nameMatch[3] || nameMatch[4] || nameMatch[5]) : 'Calculator';
        return { type: 'calculator', name: appName, description: description };
    }
    
    // Check for game
    if (lower.includes('game') || lower.includes('play') || lower.includes('puzzle') || lower.includes('arcade')) {
        const nameMatch = description.match(/called\s+(\w+)|named\s+(\w+)|"([^"]+)"|'([^']+)'|\b(\w+)\s*$/);
        const appName = nameMatch ? (nameMatch[1] || nameMatch[2] || nameMatch[3] || nameMatch[4] || nameMatch[5]) : 'Game';
        return { type: 'game', name: appName, description: description };
    }
    
    // Check for chat/messaging
    if (lower.includes('chat') || lower.includes('message') || lower.includes('talk') || lower.includes('conversation')) {
        const nameMatch = description.match(/called\s+(\w+)|named\s+(\w+)|"([^"]+)"|'([^']+)'|\b(\w+)\s*$/);
        const appName = nameMatch ? (nameMatch[1] || nameMatch[2] || nameMatch[3] || nameMatch[4] || nameMatch[5]) : 'Chat';
        return { type: 'chat', name: appName, description: description };
    }
    
    // Check for generic "app" or "tool" creation
    if (lower.includes('create') && (lower.includes('app') || lower.includes('tool') || lower.includes('widget'))) {
        const nameMatch = description.match(/called\s+(\w+)|named\s+(\w+)|"([^"]+)"|'([^']+)'|\b(\w+)\s*$/);
        const appName = nameMatch ? (nameMatch[1] || nameMatch[2] || nameMatch[3] || nameMatch[4] || nameMatch[5]) : 'NewApp';
        return { type: 'app', name: appName, description: description };
    }
    
    return {
        type: 'unknown',
        description: description
    };
}

async function executeOpenIssue() {
    console.log('🔍 Looking for open issues...');
    
    // Fetch open issues
    const { data, error } = await supabase
        .from('wtaf_zero_admin_collaborative')
        .select('*')
        .eq('app_id', ISSUE_TRACKER_APP_ID)
        .eq('action_type', 'update_request')
        .order('created_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error('❌ Error:', error);
        return;
    }

    // Find the first open issue
    const openIssue = data.find(issue => {
        const content = typeof issue.content_data === 'string' 
            ? JSON.parse(issue.content_data) 
            : issue.content_data;
        return content.status === 'open';
    });

    if (!openIssue) {
        console.log('📭 No open issues found');
        return;
    }

    const content = typeof openIssue.content_data === 'string' 
        ? JSON.parse(openIssue.content_data) 
        : openIssue.content_data;

    console.log(`\n✅ Found open issue #${content.issueNumber}:`);
    console.log(`   Description: ${content.description}`);
    console.log(`   Submitted by: ${content.submittedBy}`);
    console.log(`   Priority: ${content.priority}`);
    
    // Update status to processing
    content.status = 'processing';
    content.processedAt = new Date().toISOString();
    
    await supabase
        .from('wtaf_zero_admin_collaborative')
        .update({ content_data: JSON.stringify(content) })
        .eq('id', openIssue.id);
    
    console.log('\n🤖 Executing issue with Claude...\n');
    
    // Create comprehensive prompt for Claude based on issue type
    const parsed = parseIssueDescription(content.description);
    let claudePrompt = '';
    
    if (parsed.type === 'app') {
        claudePrompt = `Create a web application based on this request: "${content.description}"

Please create a complete HTML file that includes:
1. A fully functional ${parsed.name} application
2. All necessary HTML, CSS, and JavaScript in a single file
3. Modern, clean UI design
4. Proper error handling and user feedback
5. Save the file as ${parsed.name.toLowerCase()}.html in the current directory

The application should be ready to deploy as a standalone web app.`;
    } else {
        // Fallback for unknown types - enhance the original description
        claudePrompt = `Please help with this request: "${content.description}"

If this involves creating an application or tool, please:
1. Create a complete HTML file with all necessary functionality
2. Use modern web technologies (HTML5, CSS3, ES6+)
3. Make it user-friendly with good UX
4. Save any files you create in the current directory

Please be specific and actionable in your response.`;
    }
    
    console.log('📋 Sending enhanced prompt to Claude:', claudePrompt.substring(0, 200) + '...');
    
    try {
        // Execute with Claude using proper CLI syntax (following fix-issues.js working pattern)
        const claudePath = '/Users/bartdecrem/.local/bin/claude';
        
        console.log('🚀 Executing Claude...');
        
        const PROJECT_ROOT = '/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/community-desktop-v2';
        
        // Write prompt to temp file to avoid shell escaping issues (same as fix-issues.js)
        const tempFile = path.join('/tmp', `execute-open-issue-${Date.now()}.txt`);
        await fs.promises.writeFile(tempFile, claudePrompt);
        
        // Use pipe to pass prompt (same pattern as working fix-issues.js)
        // Add --verbose flag for more output
        const command = `cd ${PROJECT_ROOT} && cat "${tempFile}" | ${claudePath} --print --verbose --dangerously-skip-permissions`;
        console.log('📋 Command:', command);
        console.log('⏳ This may take several minutes for complex tasks...');
        
        const startTime = Date.now();
        const { stdout, stderr } = await execAsync(command, {
            timeout: 300000, // 5 minute timeout
            maxBuffer: 1024 * 1024 * 50, // 50MB buffer (same as fix-issues.js)
            env: { ...process.env }
        });
        
        // Clean up temp file
        await fs.promises.unlink(tempFile).catch(() => {});
        
        const duration = Math.round((Date.now() - startTime) / 1000);
        console.log(`✅ Claude completed in ${duration} seconds`);
        
        if (stdout) {
            console.log('Claude output (first 500 chars):', stdout.substring(0, 500));
            console.log('Total output length:', stdout.length, 'chars');
        }
        if (stderr) {
            console.error('Claude stderr:', stderr);
        }
        
        // Update issue status to completed
        content.status = 'completed';
        content.completedAt = new Date().toISOString();
        content.resolution = 'Executed by Claude';
        
        await supabase
            .from('wtaf_zero_admin_collaborative')
            .update({ content_data: JSON.stringify(content) })
            .eq('id', openIssue.id);
        
        // Deploy any HTML files Claude created to Supabase
        if (parsed.type !== 'unknown') {
            console.log('\n📤 Deploying created app to Supabase...');
            try {
                const deployed = await deployCreatedApp(parsed);
                if (deployed) {
                    console.log('✅ App deployed successfully');
                } else {
                    console.log('⚠️  No HTML file found to deploy');
                }
            } catch (deployError) {
                console.error('❌ Deployment failed:', deployError.message);
                // Don't stop - continue with desktop integration attempt
            }
        }

        // Check if Claude created an app that needs desktop integration
        if (parsed.type !== 'unknown') {
            console.log('\n🖥️  Adding app to webtoys-os-v2 desktop...');
            try {
                // Create app object for desktop integration
                const appForDesktop = {
                    name: parsed.name,
                    slug: parsed.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                    icon: getIconForAppType(parsed.type)
                };
                await addToDesktop(appForDesktop);
                console.log('✅ App successfully added to desktop');
            } catch (desktopError) {
                console.error('⚠️  Desktop integration failed (but issue still completed):', desktopError.message);
            }
        }

        console.log('\n✅ Issue completed successfully!');
        
    } catch (error) {
        console.error('❌ Claude execution failed:', error);
        
        content.status = 'failed';
        content.error = error.message;
        
        await supabase
            .from('wtaf_zero_admin_collaborative')
            .update({ content_data: JSON.stringify(content) })
            .eq('id', openIssue.id);
    }
}

executeOpenIssue();