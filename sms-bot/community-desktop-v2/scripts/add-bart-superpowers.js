#!/usr/bin/env node

/**
 * Add superuser powers for BART - ability to close tickets
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

async function addBartSuperpowers() {
    try {
        console.log('⚡ Adding BART superpowers to Fixit Board...');
        
        // Fetch current Fixit Board
        const { data } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        let html = data.html_content;
        
        // Backup
        const backupPath = path.join(__dirname, '..', 'backups', `fixit-board_before_bart_powers_${Date.now()}.html`);
        await fs.writeFile(backupPath, html);
        
        // Add styles for close button
        html = html.replace(
            `.status-completed { color: #4caf50; }
        .status-failed { color: #f44336; }
        .status-pending { color: #ff9800; }`,
            `.status-completed { color: #4caf50; }
        .status-failed { color: #f44336; }
        .status-pending { color: #ff9800; }
        .status-closed { color: #9e9e9e; font-style: italic; }
        
        .close-button {
            background: #f44336;
            color: white;
            border: none;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            cursor: pointer;
            margin-left: 10px;
            transition: all 0.2s;
        }
        
        .close-button:hover {
            background: #d32f2f;
            transform: translateY(-1px);
        }
        
        .bart-badge {
            background: linear-gradient(135deg, #ff6b6b, #ffd93d);
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 700;
            margin-left: 8px;
            text-transform: uppercase;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
        }`
        );
        
        // Update user display to show BART's special status
        html = html.replace(
            `if (userDisplay && window.toyboxUser) {
                    userDisplay.textContent = \\\`Logged in as: \\\${window.toyboxUser.username || window.toyboxUser}\\\`;
                }`,
            `if (userDisplay && window.toyboxUser) {
                    const username = window.toyboxUser.username || window.toyboxUser;
                    if (username === 'BART') {
                        userDisplay.innerHTML = \\\`Logged in as: \\\${username} <span class="bart-badge">ADMIN</span>\\\`;
                    } else {
                        userDisplay.textContent = \\\`Logged in as: \\\${username}\\\`;
                    }
                }`
        );
        
        // Add close ticket function
        html = html.replace(
            `// Get next issue number`,
            `// Close ticket function (BART only)
        async function closeTicket(issueNumber) {
            const username = window.toyboxUser?.username || window.toyboxUser;
            
            if (username !== 'BART') {
                alert('Only BART can close tickets!');
                return;
            }
            
            if (!confirm(\`Close Issue #\${issueNumber}?\\n\\nThis will mark the issue as closed.\`)) {
                return;
            }
            
            // Load all issues
            const updates = await load('update_request');
            
            // Find and update the specific issue
            let updated = false;
            for (const update of updates) {
                if (update.content_data.issueNumber === issueNumber) {
                    update.content_data.status = 'closed';
                    update.content_data.closedBy = username;
                    update.content_data.closedAt = new Date().toISOString();
                    
                    // Save the updated issue
                    const saved = await save('update_request', update.content_data);
                    if (saved) {
                        updated = true;
                        break;
                    }
                }
            }
            
            if (updated) {
                alert(\`✅ Issue #\${issueNumber} closed successfully!\`);
                loadRecentUpdates(); // Refresh the list
            } else {
                alert(\`❌ Failed to close Issue #\${issueNumber}\`);
            }
        }
        
        // Get next issue number`
        );
        
        // Update the issue display to show close button for BART
        html = html.replace(
            `<div class="issue-status status-\\\${data.status || 'pending'}" style="margin-left: 4px;">
                                Status: \\\${data.status || 'pending'}
                            </div>`,
            `<div style="display: flex; align-items: center; justify-content: space-between;">
                                <div class="issue-status status-\\\${data.status || 'pending'}" style="margin-left: 4px;">
                                    Status: \\\${data.status || 'pending'}
                                    \\\${data.status === 'closed' && data.closedBy ? \\\` (closed by \\\${data.closedBy})\\\` : ''}
                                </div>
                                \\\${
                                    (window.toyboxUser?.username === 'BART' || window.toyboxUser === 'BART') && 
                                    data.status !== 'closed' ? 
                                    \\\`<button class="close-button" onclick="closeTicket(\\\${data.issueNumber})">Close Issue</button>\\\` : 
                                    ''
                                }
                            </div>`
        );
        
        // Add special message for BART in the form
        html = html.replace(
            `<form id="issueForm">`,
            `<form id="issueForm">
                <div id="bartMessage" style="display: none; background: linear-gradient(135deg, #ff6b6b, #ffd93d); color: white; padding: 10px; border-radius: 8px; margin-bottom: 20px; font-weight: 600; text-align: center;">
                    ⚡ Admin Mode Active - You can close issues!
                </div>`
        );
        
        // Show BART message when BART is logged in
        html = html.replace(
            `// Request auth from parent window on load
        window.addEventListener('load', function() {`,
            `// Show BART message if BART is logged in
        function checkBartStatus() {
            const username = window.toyboxUser?.username || window.toyboxUser;
            const bartMessage = document.getElementById('bartMessage');
            if (bartMessage) {
                if (username === 'BART') {
                    bartMessage.style.display = 'block';
                } else {
                    bartMessage.style.display = 'none';
                }
            }
        }
        
        // Request auth from parent window on load
        window.addEventListener('load', function() {`
        );
        
        // Call checkBartStatus when auth is received
        html = html.replace(
            `if (userDisplay && window.toyboxUser) {
                    const username = window.toyboxUser.username || window.toyboxUser;
                    if (username === 'BART') {
                        userDisplay.innerHTML = \\\`Logged in as: \\\${username} <span class="bart-badge">ADMIN</span>\\\`;
                    } else {
                        userDisplay.textContent = \\\`Logged in as: \\\${username}\\\`;
                    }
                }`,
            `if (userDisplay && window.toyboxUser) {
                    const username = window.toyboxUser.username || window.toyboxUser;
                    if (username === 'BART') {
                        userDisplay.innerHTML = \\\`Logged in as: \\\${username} <span class="bart-badge">ADMIN</span>\\\`;
                    } else {
                        userDisplay.textContent = \\\`Logged in as: \\\${username}\\\`;
                    }
                }
                checkBartStatus();`
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
        
        console.log('✅ BART superpowers activated!');
        console.log('\n⚡ Superpowers for BART:');
        console.log('  • Red "Close Issue" button on each open issue');
        console.log('  • "ADMIN" badge next to username');
        console.log('  • Special admin message at top of form');
        console.log('  • Can mark issues as closed');
        console.log('  • Closed issues show who closed them');
        console.log('\n🔒 Security:');
        console.log('  • Only works when logged in as BART');
        console.log('  • Other users cannot see close buttons');
        console.log('  • Username verification before closing');
        console.log('\n🔄 Reload Fixit Board as BART to see your powers!');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

addBartSuperpowers();