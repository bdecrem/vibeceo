#!/usr/bin/env node

/**
 * Add "Open Issue" button for bart to change status from PENDING to OPEN
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

async function addOpenIssueButton() {
    try {
        console.log('🔧 Adding Open Issue button for admin control...\n');
        
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
        
        // 1. Add CSS for the open button (green color)
        const styleEndPattern = '</style>';
        const openButtonStyles = `
        .open-button {
            padding: 3px 8px;
            font-size: 10px;
            background: #4CAF50;
            color: white;
            border-color: #45a049;
            margin-right: 5px;
        }
        
        .open-button:active {
            background: #45a049;
        }
        
        .status-open {
            color: #FF8C00;
            font-weight: bold;
        }
</style>`;
        
        html = html.replace(styleEndPattern, openButtonStyles);
        console.log('✓ Added open button styles');
        
        // 2. Add openTicket function after closeTicket
        const closeTicketPattern = /async function closeTicket\(issueNumber\)\s*\{[\s\S]*?\n\s{8}\}/;
        const closeTicketMatch = html.match(closeTicketPattern);
        
        if (closeTicketMatch) {
            const openTicketFunction = `
        
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
                    loadRecentIssues();
                }
            }
        }`;
            
            html = html.replace(closeTicketMatch[0], closeTicketMatch[0] + openTicketFunction);
            console.log('✓ Added openTicket function');
        }
        
        // 3. Update the issue display to show Open button for pending issues
        // Find the issue status display and add Open button for pending issues
        const statusDisplayPattern = /\$\{currentUser && currentUser\.handle === 'bart' && data\.status !== 'closed' \?[\s\S]*?\}/;
        const newStatusDisplay = `\${currentUser && currentUser.handle === 'bart' ? 
                                        (data.status === 'pending' ? 
                                            \`<button class="open-button" onclick="openTicket(\${data.issueNumber})">Open Issue</button>\` : '') +
                                        (data.status !== 'closed' ? 
                                            \`<button class="close-button" onclick="closeTicket(\${data.issueNumber})">Close Issue</button>\` : '')
                                        : ''
                                    }`;
        
        // Replace in the loadRecentIssues function
        const loadRecentPattern = /async function loadRecentIssues\(\)[\s\S]*?\n\s{8}\}/;
        const loadRecentMatch = html.match(loadRecentPattern);
        
        if (loadRecentMatch) {
            let updatedFunction = loadRecentMatch[0];
            // Update the button display logic
            updatedFunction = updatedFunction.replace(
                /\$\{currentUser && currentUser\.handle === 'bart' && data\.status !== 'closed'[\s\S]*?\}/g,
                newStatusDisplay
            );
            html = html.replace(loadRecentMatch[0], updatedFunction);
            console.log('✓ Updated issue display with Open button');
        }
        
        // 4. Update status display to show "open" status properly
        const statusClassPattern = /.status-pending { color: #FF8C00; }/;
        if (!html.includes('.status-open')) {
            html = html.replace(
                statusClassPattern,
                '.status-pending { color: #808080; }\n        .status-open { color: #FF8C00; }'
            );
            console.log('✓ Added open status styling');
        }
        
        // 5. Update the filter to handle "open" status properly
        const filterFunctionPattern = /function filterByStatus\(status\) \{[\s\S]*?\n\s{8}\}/;
        const filterMatch = html.match(filterFunctionPattern);
        
        if (filterMatch) {
            let updatedFilter = filterMatch[0];
            // Update to recognize "open" as a distinct status
            updatedFilter = updatedFilter.replace(
                `if (statusText.includes('closed')) {
                    issueStatus = 'closed';
                } else if (statusText.includes('completed')) {
                    issueStatus = 'completed';
                } else if (statusText.includes('pending')) {
                    issueStatus = 'pending';
                }`,
                `if (statusText.includes('closed')) {
                    issueStatus = 'closed';
                } else if (statusText.includes('completed')) {
                    issueStatus = 'completed';
                } else if (statusText.includes('open')) {
                    issueStatus = 'open';
                } else if (statusText.includes('pending')) {
                    issueStatus = 'pending';
                }`
            );
            
            // Update the filter logic for "open" filter
            updatedFilter = updatedFilter.replace(
                `} else if (status === 'open') {
                    // Open = anything NOT closed or completed
                    item.style.display = (issueStatus !== 'closed' && issueStatus !== 'completed') ? 'block' : 'none';`,
                `} else if (status === 'open') {
                    // Open = specifically status "open"
                    item.style.display = (issueStatus === 'open') ? 'block' : 'none';`
            );
            
            html = html.replace(filterMatch[0], updatedFilter);
            console.log('✓ Updated filter logic for open status');
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
        
        console.log('\n✅ Added Open Issue button for admin control!');
        console.log('\n📋 New workflow:');
        console.log('  1. Issues are created with status: PENDING');
        console.log('  2. Admin (bart) sees green "Open Issue" button on pending issues');
        console.log('  3. Clicking "Open Issue" changes status to OPEN');
        console.log('  4. OPEN issues can be picked up by automation/agents');
        console.log('  5. Admin can still close any non-closed issue');
        console.log('\nRefresh: https://webtoys.ai/public/toybox-issue-tracker');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

addOpenIssueButton();