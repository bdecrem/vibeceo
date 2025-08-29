#!/usr/bin/env node

/**
 * Add admin superpowers for user "bart" to close issues
 * - Shows close button on all issues when bart is logged in
 * - Updates closeTicket function to work with new auth system
 * - Adds visual indicators for admin mode
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

async function addBartAdminPowers() {
    try {
        console.log('👑 Adding admin superpowers for user "bart"...');
        
        // Fetch current Issue Tracker
        const { data } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        let html = data.html_content;
        
        // Backup
        const backupPath = path.join(__dirname, '..', 'backups', `issue-tracker_before_bart_admin_${Date.now()}.html`);
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.writeFile(backupPath, html);
        console.log(`📁 Backup saved to: ${backupPath}`);
        
        // Step 1: Update the closeTicket function to use currentUser
        const oldCloseFunction = /async function closeTicket\(issueNumber\) {[\s\S]*?^\s{8}\}/m;
        
        const newCloseFunction = `async function closeTicket(issueNumber) {
            // Check if user is bart (admin)
            if (!currentUser || currentUser.handle !== 'bart') {
                alert('Only bart (admin) can close tickets!');
                return;
            }
            
            if (!confirm(\`Close Issue #\${issueNumber}?\\n\\nThis will mark the issue as closed.\`)) {
                return;
            }
            
            try {
                // Load all issues
                const updates = await load('update_request');
                
                // Find and update the specific issue
                let updated = false;
                for (const update of updates) {
                    if (update.content_data && update.content_data.issueNumber === issueNumber) {
                        // Create updated issue with closed status
                        const updatedIssue = {
                            ...update.content_data,
                            status: 'closed',
                            closedBy: currentUser.handle,
                            closedAt: new Date().toISOString()
                        };
                        
                        // Save the updated issue
                        await save('update_request', updatedIssue);
                        updated = true;
                        break;
                    }
                }
                
                if (updated) {
                    alert(\`✅ Issue #\${issueNumber} closed successfully!\`);
                    // Reload the issues list
                    loadRecentUpdates();
                } else {
                    alert(\`❌ Failed to close Issue #\${issueNumber}\`);
                }
            } catch (error) {
                console.error('Error closing issue:', error);
                alert('Failed to close issue. Please try again.');
            }
        }`;
        
        if (oldCloseFunction.test(html)) {
            html = html.replace(oldCloseFunction, newCloseFunction);
            console.log('✅ Updated closeTicket function');
        } else {
            // If not found, add it after the load function
            const insertPoint = 'async function load(dataType) {';
            const insertIndex = html.lastIndexOf(insertPoint);
            if (insertIndex > -1) {
                // Find the end of the load function
                let braceCount = 0;
                let i = insertIndex;
                let foundStart = false;
                while (i < html.length) {
                    if (html[i] === '{') {
                        braceCount++;
                        foundStart = true;
                    } else if (html[i] === '}' && foundStart) {
                        braceCount--;
                        if (braceCount === 0) {
                            // Found the end of the function
                            html = html.slice(0, i + 1) + '\n        \n        // Admin function to close issues\n        ' + newCloseFunction + html.slice(i + 1);
                            console.log('✅ Added closeTicket function');
                            break;
                        }
                    }
                    i++;
                }
            }
        }
        
        // Step 2: Update the issue display to show close button for bart
        const oldDisplayTemplate = /return\s+`\s*<div class="issue-item">[\s\S]*?<\/div>\s*`;/;
        
        // Find the current display template
        const displayMatch = html.match(oldDisplayTemplate);
        
        if (displayMatch) {
            // Check if it already has a close button
            if (!displayMatch[0].includes('close-button')) {
                // Add close button to the template
                const newDisplayTemplate = displayMatch[0].replace(
                    /<div class="issue-status status-\${data\.status \|\| 'pending'}">/,
                    `<div class="issue-status status-\${data.status || 'pending'}">
                                \${currentUser && currentUser.handle === 'bart' && data.status !== 'closed' ? 
                                    \`<button class="close-button" onclick="closeTicket(\${data.issueNumber})">Close Issue</button>\` : 
                                    ''
                                }`
                );
                
                html = html.replace(oldDisplayTemplate, newDisplayTemplate);
                console.log('✅ Added close button to issue display');
            }
        }
        
        // Step 3: Add admin mode indicator
        const adminIndicator = `
        // Show admin mode indicator
        function updateAdminIndicator() {
            const header = document.querySelector('.header');
            if (currentUser && currentUser.handle === 'bart' && header) {
                // Check if admin badge already exists
                if (!document.getElementById('adminBadge')) {
                    const adminBadge = document.createElement('div');
                    adminBadge.id = 'adminBadge';
                    adminBadge.innerHTML = '👑 Admin Mode Active';
                    adminBadge.style.cssText = 'background: linear-gradient(135deg, #ff6b6b, #ffd93d); color: white; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-top: 10px; display: inline-block;';
                    header.appendChild(adminBadge);
                }
            } else {
                // Remove admin badge if not bart
                const badge = document.getElementById('adminBadge');
                if (badge) badge.remove();
            }
        }`;
        
        // Add admin indicator function if not present
        if (!html.includes('updateAdminIndicator')) {
            // Insert after updateCurrentUserInfo
            const insertPoint = 'function updateCurrentUserInfo() {';
            const insertIndex = html.indexOf(insertPoint);
            if (insertIndex > -1) {
                // Find the end of the function
                let braceCount = 0;
                let i = insertIndex;
                let foundStart = false;
                while (i < html.length) {
                    if (html[i] === '{') {
                        braceCount++;
                        foundStart = true;
                    } else if (html[i] === '}' && foundStart) {
                        braceCount--;
                        if (braceCount === 0) {
                            // Found the end, insert after
                            html = html.slice(0, i + 1) + '\n' + adminIndicator + html.slice(i + 1);
                            console.log('✅ Added admin indicator function');
                            break;
                        }
                    }
                    i++;
                }
            }
        }
        
        // Step 4: Call updateAdminIndicator when auth changes
        const authUpdatePattern = /updateCurrentUserInfo\(\);/g;
        const authUpdateReplacement = 'updateCurrentUserInfo();\n            updateAdminIndicator();';
        
        // Replace all instances but avoid duplicates
        if (!html.includes('updateAdminIndicator();')) {
            html = html.replace(authUpdatePattern, authUpdateReplacement);
            console.log('✅ Added admin indicator calls');
        }
        
        // Step 5: Ensure close button styling exists
        if (!html.includes('.close-button {')) {
            const styleEndPattern = '</style>';
            const closeButtonStyles = `
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
        
        .status-closed {
            color: #9e9e9e;
            font-style: italic;
            text-decoration: line-through;
        }
    </style>`;
            
            html = html.replace(styleEndPattern, closeButtonStyles);
            console.log('✅ Added close button styles');
        }
        
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
        
        console.log('\n✅ Admin superpowers added for user "bart"!');
        console.log('\n👑 What was added:');
        console.log('  • Close button appears on all issues when bart is logged in');
        console.log('  • Only bart can close issues (admin privilege)');
        console.log('  • Admin mode indicator shows when bart is logged in');
        console.log('  • Closed issues show with strikethrough and gray text');
        console.log('  • Close action updates issue status and records who closed it');
        console.log('\n🔄 Test the admin features:');
        console.log('  1. Login as "bart" in ToyBox OS');
        console.log('  2. Open Issue Tracker');
        console.log('  3. You should see "👑 Admin Mode Active"');
        console.log('  4. All open issues will have a "Close Issue" button');
        console.log('  5. Click to close any issue');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

addBartAdminPowers();