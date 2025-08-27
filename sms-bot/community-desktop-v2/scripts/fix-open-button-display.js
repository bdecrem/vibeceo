#!/usr/bin/env node

/**
 * Fix the Open Issue button to actually display
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env.local') });
if (!process.env.SUPABASE_URL) {
    dotenv.config({ path: path.join(__dirname, '../../.env') });
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function fixOpenButtonDisplay() {
    try {
        console.log('🔧 Fixing Open Issue button display...\n');
        
        // Get current HTML
        const { data: current } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        let html = current.html_content;
        
        // Create backup
        const timestamp = new Date().toISOString()
            .replace(/:/g, '-')
            .replace(/\./g, '-')
            .replace('T', '_')
            .slice(0, -5);
        
        const backupPath = path.join(__dirname, '..', 'backups', `issue-tracker_${timestamp}.html`);
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.writeFile(backupPath, html);
        console.log(`✓ Backup created: ${path.basename(backupPath)}`);
        
        // Find the loadRecentIssues function
        const loadStartIndex = html.indexOf('async function loadRecentIssues()');
        const loadEndIndex = html.indexOf('\n        }', loadStartIndex) + 10;
        
        if (loadStartIndex === -1) {
            // Try alternate name
            const altStartIndex = html.indexOf('async function loadRecentUpdates()');
            if (altStartIndex > -1) {
                // Replace the entire function with proper button display
                const newLoadFunction = `async function loadRecentUpdates() {
            const updates = await load('update_request');
            const container = document.getElementById('recentUpdates');
            
            if (!container) {
                console.error('recentUpdates container not found!');
                return;
            }
            
            if (updates && updates.length > 0) {
                // Deduplicate by issueNumber
                const issueMap = new Map();
                
                updates.forEach(update => {
                    if (update.content_data && update.content_data.issueNumber) {
                        const issueNum = update.content_data.issueNumber;
                        const existing = issueMap.get(issueNum);
                        
                        if (!existing || new Date(update.created_at) > new Date(existing.created_at)) {
                            issueMap.set(issueNum, update);
                        }
                    }
                });
                
                const uniqueIssues = Array.from(issueMap.values())
                    .sort((a, b) => (b.content_data.issueNumber || 0) - (a.content_data.issueNumber || 0));
                
                container.innerHTML = '<h3 style="margin-bottom: 15px;">📋 Recent Issues</h3>' + 
                    uniqueIssues.map(update => {
                        const data = update.content_data;
                        const date = new Date(data.timestamp);
                        const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                        const submitter = data.submittedBy || 'anonymous';
                        const isAnonymous = submitter === 'anonymous';
                        const status = data.status || 'pending';
                        
                        // Build admin buttons
                        let adminButtons = '';
                        if (currentUser && currentUser.handle === 'bart') {
                            if (status === 'pending') {
                                adminButtons += \`<button class="open-button" onclick="openTicket(\${data.issueNumber})">Open Issue</button>\`;
                            }
                            if (status !== 'closed') {
                                adminButtons += \`<button class="close-button" onclick="closeTicket(\${data.issueNumber})">Close Issue</button>\`;
                            }
                        }
                        
                        return \`
                            <div class="issue-item">
                                <div class="issue-header">
                                    <div class="issue-meta">
                                        <span class="issue-number">#\${data.issueNumber || '?'}</span>
                                        <span class="issue-type type-\${data.actionType}">\${data.actionType}</span>
                                        <span class="issue-submitter \${isAnonymous ? 'anonymous' : ''}">\${submitter}</span>
                                    </div>
                                    <span style="font-size: 12px; color: #666;">\${dateStr}</span>
                                </div>
                                <div style="font-weight: 600; margin-bottom: 4px;">\${data.target}</div>
                                <div class="issue-description">\${data.description}</div>
                                <div class="issue-status status-\${status}">
                                    Status: \${status}
                                    \${data.closedBy ? \` (closed by \${data.closedBy})\` : ''}
                                    \${data.openedBy ? \` (opened by \${data.openedBy})\` : ''}
                                    \${adminButtons}
                                </div>
                            </div>
                        \`;
                    }).join('');
            } else {
                container.innerHTML = '<p style="color: #666;">No recent updates yet.</p>';
            }
        }`;
                
                // Find and replace the function
                const funcStartIndex = html.indexOf('async function loadRecentUpdates()');
                const funcEndIndex = html.indexOf('\n        }', funcStartIndex) + 10;
                
                html = html.slice(0, funcStartIndex) + newLoadFunction + html.slice(funcEndIndex);
                console.log('✓ Fixed loadRecentUpdates function with proper button display');
            }
        }
        
        // Make sure openTicket function exists
        if (!html.includes('async function openTicket')) {
            const openFunction = `
        
        // Open ticket function (change status from pending to open)
        async function openTicket(issueNumber) {
            if (!currentUser || currentUser.handle !== 'bart') {
                alert('Only bart (admin) can open tickets!');
                return;
            }
            
            const updates = await load('update_request');
            const targetIssue = updates.find(u => 
                u.content_data && u.content_data.issueNumber === issueNumber
            );
            
            if (targetIssue) {
                targetIssue.content_data.status = 'open';
                targetIssue.content_data.openedBy = currentUser.handle;
                targetIssue.content_data.openedAt = new Date().toISOString();
                
                const saved = await save('update_request', targetIssue.content_data);
                if (saved) {
                    console.log('Issue #' + issueNumber + ' marked as OPEN - ready for agent processing');
                    loadRecentUpdates();
                }
            }
        }`;
            
            // Add after closeTicket function
            const closeTicketEnd = html.indexOf('async function closeTicket');
            if (closeTicketEnd > -1) {
                const insertPoint = html.indexOf('\n        }', closeTicketEnd) + 10;
                html = html.slice(0, insertPoint) + openFunction + html.slice(insertPoint);
                console.log('✓ Added openTicket function');
            }
        }
        
        // Save the updated HTML
        const { error } = await supabase
            .from('wtaf_content')
            .update({
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker');
        
        if (error) throw error;
        
        console.log('\n✅ Fixed Open Issue button display!');
        console.log('You should now see:');
        console.log('  • Green "Open Issue" button on PENDING issues');
        console.log('  • Red "Close Issue" button on OPEN issues');
        console.log('\nRefresh: https://webtoys.ai/public/toybox-issue-tracker');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

fixOpenButtonDisplay();