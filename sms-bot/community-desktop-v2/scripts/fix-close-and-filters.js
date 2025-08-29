#!/usr/bin/env node

/**
 * Fix close button confirmation and make filter tabs functional
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

async function fixCloseAndFilters() {
    try {
        console.log('🔧 Fixing close confirmations and filter functionality...\n');
        
        // Get current HTML
        const { data: current } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        let html = current.html_content;
        
        // Backup first
        const backupPath = path.join(__dirname, '..', 'backups', `issue-tracker_before_filters_fix_${Date.now()}.html`);
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.writeFile(backupPath, html);
        console.log(`✓ Backup created: ${path.basename(backupPath)}`);
        
        // 1. Fix closeTicket function - remove double confirmations
        const closeTicketPattern = /async function closeTicket\(issueNumber\)\s*\{[\s\S]*?\n\s{8}\}/;
        const newCloseTicket = `async function closeTicket(issueNumber) {
            if (!currentUser || currentUser.handle !== 'bart') {
                alert('Only bart (admin) can close tickets!');
                return;
            }
            
            // No confirmation - just close it
            const updates = await load('update_request');
            const targetIssue = updates.find(u => 
                u.content_data && u.content_data.issueNumber === issueNumber
            );
            
            if (targetIssue) {
                targetIssue.content_data.status = 'closed';
                targetIssue.content_data.closedBy = currentUser.handle;
                targetIssue.content_data.closedAt = new Date().toISOString();
                
                const saved = await save('update_request', targetIssue.content_data);
                if (saved) {
                    // Just reload - no alert
                    loadRecentUpdates();
                }
            }
        }`;
        
        html = html.replace(closeTicketPattern, newCloseTicket);
        console.log('✅ Fixed close button - removed double confirmations');
        
        // 2. Add filter functionality
        // First, add the filter state variable and functions
        const scriptStartPattern = /<script>\s*window\.APP_ID/;
        const filterCode = `<script>
        window.APP_ID = 'toybox-issue-tracker';
        
        // Filter state
        let currentFilter = 'all';`;
        
        html = html.replace(scriptStartPattern, filterCode);
        
        // Add filter function after loadRecentUpdates
        const loadRecentUpdatesEnd = html.indexOf('loadRecentUpdates();', html.indexOf('window.addEventListener(\'DOMContentLoaded\''));
        if (loadRecentUpdatesEnd > -1) {
            const filterFunctions = `
        
        // Filter issues by status
        function filterIssues(status) {
            currentFilter = status;
            
            // Update active tab
            document.querySelectorAll('.filter-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            event.target.classList.add('active');
            
            // Filter the displayed issues
            const issueItems = document.querySelectorAll('.issue-item');
            issueItems.forEach(item => {
                const statusElement = item.querySelector('.issue-status');
                if (!statusElement) return;
                
                const issueStatus = statusElement.className.includes('status-closed') ? 'closed' :
                                   statusElement.className.includes('status-completed') ? 'completed' :
                                   statusElement.className.includes('status-pending') ? 'pending' : 'open';
                
                if (status === 'all') {
                    item.style.display = 'block';
                } else if (status === 'open') {
                    // Show non-closed issues
                    item.style.display = (issueStatus !== 'closed' && issueStatus !== 'completed') ? 'block' : 'none';
                } else if (status === issueStatus) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
            
            // Update count
            const visibleCount = document.querySelectorAll('.issue-item[style="display: block;"], .issue-item:not([style])').length;
            const totalCount = issueItems.length;
            
            // Update a status message if needed
            const container = document.getElementById('recentUpdates');
            if (visibleCount === 0 && totalCount > 0) {
                // Show a message when filtered view is empty
                if (!document.getElementById('emptyFilterMsg')) {
                    const msg = document.createElement('div');
                    msg.id = 'emptyFilterMsg';
                    msg.style.cssText = 'padding: 20px; text-align: center; color: #666; font-style: italic;';
                    msg.textContent = 'No ' + status + ' issues found.';
                    container.appendChild(msg);
                }
            } else {
                // Remove empty message if it exists
                const emptyMsg = document.getElementById('emptyFilterMsg');
                if (emptyMsg) emptyMsg.remove();
            }
        }
        
        loadRecentUpdates();`;
            
            const insertPoint = loadRecentUpdatesEnd + 'loadRecentUpdates();'.length;
            html = html.slice(0, insertPoint) + filterFunctions + html.slice(insertPoint);
        }
        
        // 3. Update filter tab HTML to include onclick handlers
        const filterTabsPattern = /<div class="filter-tabs">[\s\S]*?<\/div>\s*(?=<div class="form-section">)/;
        const newFilterTabs = `<div class="filter-tabs">
            <div class="filter-tab active" onclick="filterIssues('all')">ALL ISSUES</div>
            <div class="filter-tab" onclick="filterIssues('open')">OPEN</div>
            <div class="filter-tab" onclick="filterIssues('closed')">CLOSED</div>
            <div class="filter-tab" onclick="filterIssues('pending')">PENDING</div>
            <div class="filter-tab" onclick="filterIssues('completed')">COMPLETED</div>
        </div>`;
        
        html = html.replace(filterTabsPattern, newFilterTabs);
        console.log('✅ Added onclick handlers to filter tabs');
        
        // 4. Set "OPEN" as default filter on page load
        const domLoadPattern = /window\.addEventListener\('DOMContentLoaded', function\(\) \{[^}]*\}/;
        const domLoadMatch = html.match(domLoadPattern);
        if (domLoadMatch) {
            const newDomLoad = domLoadMatch[0].replace(
                'updateLastIssueInfo();',
                `updateLastIssueInfo();
            // Default to showing open issues
            setTimeout(() => {
                const openTab = document.querySelector('.filter-tab:nth-child(2)');
                if (openTab) openTab.click();
            }, 100);`
            );
            html = html.replace(domLoadMatch[0], newDomLoad);
            console.log('✅ Set OPEN as default filter');
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
        
        console.log('\n🎉 Fixed close button and filters!');
        console.log('\n📋 What was fixed:');
        console.log('  • Close button: No more double confirmations');
        console.log('  • Filter tabs: Now actually filter issues');
        console.log('  • Default filter: Shows OPEN issues on load');
        console.log('  • Empty state: Shows message when no issues match filter');
        
        console.log('\n🔄 Refresh to test the fixes:');
        console.log('  https://webtoys.ai/public/toybox-issue-tracker');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

fixCloseAndFilters();