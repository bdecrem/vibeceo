#!/usr/bin/env node

/**
 * Customize ToyBox Issue Tracker to directly update apps with safety backups
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });
if (!process.env.SUPABASE_URL) {
    dotenv.config({ path: path.join(__dirname, '../../.env') });
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function customizeIssueTracker() {
    try {
        console.log('🛠️ Customizing ToyBox Issue Tracker for direct updates...');
        
        // Fetch current ToyBox Issue Tracker
        const { data } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        if (!data) {
            console.error('❌ ToyBox Issue Tracker not found');
            return;
        }
        
        // Backup current version
        const backupPath = path.join(__dirname, '..', 'backups', `toybox-issue-tracker_before_custom_${Date.now()}.html`);
        await fs.writeFile(backupPath, data.html_content);
        console.log(`💾 Backed up current version`);
        
        // Create the customized HTML
        const customHTML = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ToyBox OS Direct Updates</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            padding: 20px;
            min-height: 100vh;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
        }
        
        h1 {
            font-size: 28px;
            margin-bottom: 10px;
        }
        
        .subtitle {
            font-size: 14px;
            opacity: 0.9;
        }
        
        .warning-banner {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px;
            border-radius: 4px;
        }
        
        .warning-banner strong {
            color: #856404;
        }
        
        .form-section {
            padding: 30px;
        }
        
        .form-group {
            margin-bottom: 25px;
        }
        
        label {
            display: block;
            font-weight: 600;
            margin-bottom: 8px;
            color: #333;
        }
        
        input, select, textarea {
            width: 100%;
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.3s;
        }
        
        input:focus, select:focus, textarea:focus {
            outline: none;
            border-color: #667eea;
        }
        
        textarea {
            min-height: 120px;
            resize: vertical;
        }
        
        .action-type {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 10px;
            margin-top: 8px;
        }
        
        .action-option {
            padding: 12px;
            border: 2px solid #e0e0e0;
            border-radius: 8px;
            text-align: center;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .action-option:hover {
            border-color: #667eea;
            background: #f5f5ff;
        }
        
        .action-option.selected {
            border-color: #667eea;
            background: #667eea;
            color: white;
        }
        
        .safety-info {
            background: #e8f5e9;
            border-left: 4px solid #4caf50;
            padding: 15px;
            margin: 20px 0;
            border-radius: 4px;
        }
        
        .safety-info h3 {
            color: #2e7d32;
            margin-bottom: 8px;
        }
        
        .submit-btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 15px 40px;
            border-radius: 8px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            width: 100%;
            transition: transform 0.2s;
        }
        
        .submit-btn:hover {
            transform: translateY(-2px);
        }
        
        .submit-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        
        .issues-list {
            padding: 20px;
            border-top: 1px solid #e0e0e0;
        }
        
        .issue-item {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 10px;
        }
        
        .issue-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        
        .issue-type {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
        
        .type-fix { background: #ffebee; color: #c62828; }
        .type-feature { background: #e3f2fd; color: #1565c0; }
        .type-update { background: #fff3e0; color: #e65100; }
        .type-rollback { background: #f3e5f5; color: #6a1b9a; }
        
        .issue-description {
            color: #666;
            font-size: 14px;
        }
        
        .issue-status {
            margin-top: 8px;
            font-size: 12px;
            color: #666;
        }
        
        .status-completed { color: #4caf50; }
        .status-failed { color: #f44336; }
        .status-pending { color: #ff9800; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 ToyBox OS Direct Updates</h1>
            <div class="subtitle">Submit fixes and updates that are applied immediately with automatic backups</div>
        </div>
        
        <div class="warning-banner">
            <strong>⚠️ Direct Action Mode:</strong> Changes are applied immediately to ToyBox OS. All changes are backed up and can be rolled back if needed.
        </div>
        
        <div class="form-section">
            <form id="issueForm">
                <div class="form-group">
                    <label for="actionType">What needs to be done?</label>
                    <div class="action-type">
                        <div class="action-option" data-type="fix">
                            🔧 Fix Bug
                        </div>
                        <div class="action-option" data-type="feature">
                            ✨ Add Feature
                        </div>
                        <div class="action-option" data-type="update">
                            📝 Update App
                        </div>
                        <div class="action-option" data-type="rollback">
                            ↩️ Rollback Change
                        </div>
                    </div>
                    <input type="hidden" id="actionType" name="actionType" required>
                </div>
                
                <div class="form-group">
                    <label for="target">Which app/component?</label>
                    <select id="target" name="target" required>
                        <option value="">Select target...</option>
                        <option value="toybox-os">ToyBox OS Desktop</option>
                        <option value="app-studio">App Studio</option>
                        <option value="toybox-issue-tracker">Issue Tracker (this app)</option>
                        <option value="community-notepad">Community Notepad</option>
                        <option value="toybox-macword">MacWord</option>
                        <option value="toybox-chat">Chat</option>
                        <option value="toybox-lightning-puma-parasailing">Sudoku</option>
                        <option value="wave-wood-deconstructing">Paint</option>
                        <option value="other">Other (specify in description)</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label for="description">Describe the change:</label>
                    <textarea id="description" name="description" required 
                        placeholder="Be specific: 'Make the Sudoku hint button green' or 'Add a calculator app to the desktop' or 'Fix the chat message overflow issue'"></textarea>
                </div>
                
                <div class="form-group">
                    <label for="priority">Priority:</label>
                    <select id="priority" name="priority" required>
                        <option value="low">Low - Nice to have</option>
                        <option value="medium" selected>Medium - Should be done soon</option>
                        <option value="high">High - Breaking something</option>
                        <option value="critical">Critical - System unusable</option>
                    </select>
                </div>
                
                <div class="safety-info">
                    <h3>🛡️ Safety Guarantee</h3>
                    <ul style="margin-left: 20px; margin-top: 8px;">
                        <li>Every change creates a backup using safe-wrapper</li>
                        <li>File changes are committed to git</li>
                        <li>All actions can be rolled back</li>
                        <li>Backup locations are logged for easy recovery</li>
                    </ul>
                </div>
                
                <button type="submit" class="submit-btn" id="submitBtn">
                    Execute Update with Backup
                </button>
            </form>
        </div>
        
        <div class="issues-list" id="issuesList">
            <h3 style="margin-bottom: 15px;">Recent Updates</h3>
            <div id="issuesContainer">
                <p style="color: #666;">No recent updates yet.</p>
            </div>
        </div>
    </div>
    
    <script>
        // ToyBox OS compatibility
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'TOYBOX_AUTH') {
                window.toyboxUser = event.data.user;
                console.log('ToyBox OS authenticated');
            }
        });
        
        // App configuration
        window.APP_ID = 'toybox-direct-updates';
        
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
                        participant_id: window.toyboxUser?.username || 'anonymous',
                        action_type: 'update_request'
                    })
                });
                return response.ok;
            } catch (error) {
                console.error('Save failed:', error);
                return false;
            }
        }
        
        async function load(dataType) {
            try {
                const response = await fetch(\`/api/zad/load?app_id=\${window.APP_ID}&data_type=\${dataType}\`);
                if (response.ok) {
                    const data = await response.json();
                    return data;
                }
            } catch (error) {
                console.error('Load failed:', error);
            }
            return [];
        }
        
        // Action type selection
        document.querySelectorAll('.action-option').forEach(option => {
            option.addEventListener('click', () => {
                document.querySelectorAll('.action-option').forEach(o => o.classList.remove('selected'));
                option.classList.add('selected');
                document.getElementById('actionType').value = option.dataset.type;
            });
        });
        
        // Form submission
        document.getElementById('issueForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const submitBtn = document.getElementById('submitBtn');
            submitBtn.disabled = true;
            submitBtn.textContent = 'Processing...';
            
            const formData = {
                actionType: document.getElementById('actionType').value,
                target: document.getElementById('target').value,
                description: document.getElementById('description').value,
                priority: document.getElementById('priority').value,
                timestamp: new Date().toISOString(),
                status: 'pending'
            };
            
            // Save to ZAD
            const saved = await save('update_request', formData);
            
            if (saved) {
                // Trigger the webhook for immediate action
                try {
                    const webhookResponse = await fetch('/api/webhook/toybox-direct-update', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            ...formData,
                            safety_mode: 'always_backup',
                            execution_mode: 'immediate'
                        })
                    });
                    
                    if (webhookResponse.ok) {
                        alert('✅ Update request submitted! The change will be applied with automatic backup.');
                        document.getElementById('issueForm').reset();
                        document.querySelectorAll('.action-option').forEach(o => o.classList.remove('selected'));
                        loadRecentUpdates();
                    } else {
                        alert('⚠️ Update saved but webhook failed. It will be processed later.');
                    }
                } catch (error) {
                    console.error('Webhook error:', error);
                    alert('⚠️ Update saved but webhook unreachable. It will be processed later.');
                }
            } else {
                alert('❌ Failed to save update request. Please try again.');
            }
            
            submitBtn.disabled = false;
            submitBtn.textContent = 'Execute Update with Backup';
        });
        
        // Load recent updates
        async function loadRecentUpdates() {
            const updates = await load('update_request');
            const container = document.getElementById('issuesContainer');
            
            if (updates && updates.length > 0) {
                // Sort by timestamp, newest first
                updates.sort((a, b) => new Date(b.content_data.timestamp) - new Date(a.content_data.timestamp));
                
                // Take last 10
                const recent = updates.slice(0, 10);
                
                container.innerHTML = recent.map(update => {
                    const data = update.content_data;
                    const date = new Date(data.timestamp);
                    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                    
                    return \`
                        <div class="issue-item">
                            <div class="issue-header">
                                <span class="issue-type type-\${data.actionType}">\${data.actionType}</span>
                                <span style="font-size: 12px; color: #666;">\${dateStr}</span>
                            </div>
                            <div style="font-weight: 600; margin-bottom: 4px;">\${data.target}</div>
                            <div class="issue-description">\${data.description}</div>
                            <div class="issue-status status-\${data.status || 'pending'}">
                                Status: \${data.status || 'pending'}
                            </div>
                        </div>
                    \`;
                }).join('');
            } else {
                container.innerHTML = '<p style="color: #666;">No recent updates yet.</p>';
            }
        }
        
        // Load on startup
        loadRecentUpdates();
        
        // Refresh every 30 seconds
        setInterval(loadRecentUpdates, 30000);
        
        // Instructions for the webhook handler
        console.log(\`
        ============================================
        TOYBOX DIRECT UPDATE SYSTEM
        ============================================
        
        This app sends requests to: /api/webhook/toybox-direct-update
        
        The webhook handler should:
        1. ALWAYS use safe-wrapper for Supabase updates
        2. ALWAYS commit file changes to git
        3. Log backup locations for rollback
        4. Update the request status in ZAD
        
        Safety rules:
        - Never modify without backup
        - Always test changes locally first
        - Keep audit trail of all changes
        
        Rollback process:
        - Check backups/ folder for timestamped files
        - Use git log to find commits
        - Restore from backup or git revert
        
        ============================================
        \`);
    </script>
</body>
</html>`;
        
        // Update in Supabase
        const { error } = await supabase
            .from('wtaf_content')
            .update({
                html_content: customHTML,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker');
        
        if (error) {
            console.error('❌ Failed to update:', error);
            return;
        }
        
        console.log('✅ ToyBox Issue Tracker customized!');
        console.log('\n🚀 New Direct Update System:');
        console.log('  • Takes immediate action (no PRs)');
        console.log('  • ALWAYS creates backups via safe-wrapper');
        console.log('  • Git commits for file changes');
        console.log('  • Full rollback capability');
        console.log('  • Tracks all updates in ZAD');
        console.log('\n🛡️ Safety Features:');
        console.log('  • Every Supabase update → backup in backups/ folder');
        console.log('  • Every file change → git commit');
        console.log('  • Rollback option in the UI');
        console.log('  • Audit trail of all changes');
        console.log('\n⚠️ Next Step:');
        console.log('  Set up webhook handler at /api/webhook/toybox-direct-update');
        console.log('  Handler must use safe-wrapper and git commits!');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

customizeIssueTracker();