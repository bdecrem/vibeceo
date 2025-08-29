#!/usr/bin/env node

/**
 * Add ToyBox OS authentication integration to Fixit Board
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

async function addAuth() {
    try {
        console.log('🔐 Adding ToyBox OS authentication to Fixit Board...');
        
        // Fetch current Fixit Board
        const { data } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        let html = data.html_content;
        
        // Backup
        const backupPath = path.join(__dirname, '..', 'backups', `fixit-board_before_auth_${Date.now()}.html`);
        await fs.writeFile(backupPath, html);
        
        // Add user display area in header
        html = html.replace(
            '<div id="lastIssueInfo" style="margin-top: 10px; font-size: 14px; opacity: 0.95; font-weight: 500;"></div>',
            `<div id="lastIssueInfo" style="margin-top: 10px; font-size: 14px; opacity: 0.95; font-weight: 500;"></div>
            <div id="userInfo" style="margin-top: 5px; font-size: 14px; opacity: 0.95; font-weight: 500;"></div>`
        );
        
        // Update the ToyBox OS compatibility section to properly receive and store user
        html = html.replace(
            `// ToyBox OS compatibility
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'TOYBOX_AUTH') {
                window.toyboxUser = event.data.user;
                console.log('ToyBox OS authenticated');
            }
        });`,
            `// ToyBox OS compatibility and authentication
        window.toyboxUser = null;
        
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'TOYBOX_AUTH') {
                window.toyboxUser = event.data.user;
                console.log('ToyBox OS user authenticated:', window.toyboxUser);
                
                // Display user info
                const userDisplay = document.getElementById('userInfo');
                if (userDisplay && window.toyboxUser) {
                    userDisplay.textContent = \`Logged in as: \${window.toyboxUser.username || window.toyboxUser}\`;
                }
            }
        });
        
        // Request auth from parent window on load
        window.addEventListener('load', function() {
            // Request authentication from ToyBox OS
            if (window.parent !== window) {
                window.parent.postMessage({ type: 'REQUEST_AUTH' }, '*');
            }
        });`
        );
        
        // Update the form submission to include the username
        html = html.replace(
            `const formData = {
                issueNumber: issueNumber,
                actionType: document.getElementById('actionType').value,
                target: document.getElementById('target').value,
                description: document.getElementById('description').value,
                priority: document.getElementById('priority').value,
                timestamp: new Date().toISOString(),
                status: 'pending'
            };`,
            `const formData = {
                issueNumber: issueNumber,
                actionType: document.getElementById('actionType').value,
                target: document.getElementById('target').value,
                description: document.getElementById('description').value,
                priority: document.getElementById('priority').value,
                submittedBy: window.toyboxUser?.username || window.toyboxUser || 'anonymous',
                timestamp: new Date().toISOString(),
                status: 'pending'
            };`
        );
        
        // Update the save function to use the username
        html = html.replace(
            `participant_id: window.toyboxUser?.username || 'anonymous',`,
            `participant_id: window.toyboxUser?.username || window.toyboxUser || 'anonymous',`
        );
        
        // Update the issue display to show who submitted it
        html = html.replace(
            `<div class="issue-header">
                                <div style="display: flex; align-items: center;">
                                    <span class="issue-number">Issue #\\\${issueNum}</span>
                                    <span class="issue-type type-\\\${data.actionType}">\\\${data.actionType}</span>
                                    <span style="margin-left: 8px;">\\\${priorityIcon}</span>
                                </div>
                                <span style="font-size: 12px; color: #666;">\\\${dateStr}</span>
                            </div>`,
            `<div class="issue-header">
                                <div style="display: flex; align-items: center;">
                                    <span class="issue-number">Issue #\\\${issueNum}</span>
                                    <span class="issue-type type-\\\${data.actionType}">\\\${data.actionType}</span>
                                    <span style="margin-left: 8px;">\\\${priorityIcon}</span>
                                </div>
                                <span style="font-size: 12px; color: #666;">\\\${dateStr}</span>
                            </div>
                            <div style="font-size: 12px; color: #888; margin-top: 4px; margin-left: 4px;">
                                👤 Submitted by: \\\${data.submittedBy || 'anonymous'}
                            </div>`
        );
        
        // Add a style for the user info
        html = html.replace(
            `.reload-button svg {
            width: 20px;
            height: 20px;
            fill: white;
        }`,
            `.reload-button svg {
            width: 20px;
            height: 20px;
            fill: white;
        }
        
        #userInfo {
            background: rgba(255, 255, 255, 0.1);
            padding: 4px 12px;
            border-radius: 20px;
            display: inline-block;
        }`
        );
        
        // Update success message to include username
        html = html.replace(
            `alert(\\\`✅ Issue #\\\${issueNumber} created! An agent will process this request and apply changes with automatic backups.\\\`);`,
            `const username = window.toyboxUser?.username || window.toyboxUser || 'anonymous';
                alert(\\\`✅ Issue #\\\${issueNumber} created by \\\${username}! An agent will process this request.\\\`);`
        );
        
        // Update console log to include username
        html = html.replace(
            `console.log(\\\`📋 Issue #\\\${issueNumber} created:\\\`, formData);`,
            `console.log(\\\`📋 Issue #\\\${issueNumber} created by \\\${formData.submittedBy}:\\\`, formData);`
        );
        
        // Update in Supabase
        const { error } = await supabase
            .from('wtaf_content')
            .update({
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker');
        
        if (error) throw error;
        
        console.log('✅ Authentication integrated!');
        console.log('\n🔐 Features added:');
        console.log('  • Receives username from ToyBox OS');
        console.log('  • Shows "Logged in as: KURONA" in header');
        console.log('  • Issues show "Submitted by: KURONA"');
        console.log('  • Username saved with each issue');
        console.log('  • Falls back to "anonymous" if not logged in');
        console.log('\n🔄 Reload Fixit Board to see your username!');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

addAuth();