#!/usr/bin/env node

/**
 * Fix filter position, logic, and remove create confirmation
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

async function fixFiltersAndConfirmations() {
    try {
        console.log('🔧 Fixing filter position, logic, and confirmations...\n');
        
        // First, let's check the actual data structure
        console.log('📊 Checking actual data structure...');
        const { data: sampleIssue } = await supabase
            .from('wtaf_zero_admin_collaborative')
            .select('*')
            .eq('app_id', 'toybox-issue-tracker')
            .eq('action_type', 'update_request')
            .limit(1)
            .single();
        
        if (sampleIssue) {
            console.log('Sample issue structure:');
            console.log('  Status field:', sampleIssue.content_data?.status || 'undefined');
            console.log('  Action type:', sampleIssue.content_data?.actionType);
        }
        
        // Get current HTML
        const { data: current } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        let html = current.html_content;
        
        // Backup first
        const backupPath = path.join(__dirname, '..', 'backups', `issue-tracker_before_filter_fix2_${Date.now()}.html`);
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.writeFile(backupPath, html);
        console.log(`✓ Backup created: ${path.basename(backupPath)}`);
        
        // 1. Move filter tabs to AFTER the form section
        // Remove filter tabs from current position
        const filterTabsPattern = /<div class="filter-tabs">[\s\S]*?<\/div>\s*(?=<div class="form-section">)/;
        html = html.replace(filterTabsPattern, '');
        
        // Add filter tabs AFTER the form section, BEFORE recentUpdates
        const formSectionEnd = '</div>\n        \n        <!-- Issues Display Container -->';
        const filterTabsHTML = `</div>
        
        <!-- Filter Tabs -->
        <div class="filter-tabs">
            <div class="filter-tab active" onclick="filterIssues('all')">ALL ISSUES</div>
            <div class="filter-tab" onclick="filterIssues('open')">OPEN</div>
            <div class="filter-tab" onclick="filterIssues('closed')">CLOSED</div>
            <div class="filter-tab" onclick="filterIssues('pending')">PENDING</div>
            <div class="filter-tab" onclick="filterIssues('completed')">COMPLETED</div>
        </div>
        
        <!-- Issues Display Container -->`;
        
        html = html.replace(formSectionEnd, filterTabsHTML);
        console.log('✅ Moved filter tabs below form');
        
        // 2. Fix the filterIssues function to work with actual data structure
        const filterFunctionPattern = /function filterIssues\(status\) \{[\s\S]*?\n\s{8}\}/;
        const newFilterFunction = `function filterIssues(status) {
            currentFilter = status;
            
            // Update active tab
            document.querySelectorAll('.filter-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            event.target.classList.add('active');
            
            // Filter the displayed issues
            const issueItems = document.querySelectorAll('.issue-item');
            let visibleCount = 0;
            
            issueItems.forEach(item => {
                // Find the status in the issue-status div text content
                const statusElement = item.querySelector('.issue-status');
                if (!statusElement) {
                    item.style.display = 'none';
                    return;
                }
                
                // Extract status from the text content (e.g., "Status: pending")
                const statusText = statusElement.textContent.toLowerCase();
                let issueStatus = 'pending'; // default
                
                if (statusText.includes('closed')) {
                    issueStatus = 'closed';
                } else if (statusText.includes('completed')) {
                    issueStatus = 'completed';
                } else if (statusText.includes('pending')) {
                    issueStatus = 'pending';
                }
                
                // Apply filter logic
                if (status === 'all') {
                    item.style.display = 'block';
                    visibleCount++;
                } else if (status === 'open') {
                    // Open means NOT closed and NOT completed
                    if (issueStatus !== 'closed' && issueStatus !== 'completed') {
                        item.style.display = 'block';
                        visibleCount++;
                    } else {
                        item.style.display = 'none';
                    }
                } else if (status === issueStatus) {
                    item.style.display = 'block';
                    visibleCount++;
                } else {
                    item.style.display = 'none';
                }
            });
            
            // Handle empty state
            const container = document.getElementById('recentUpdates');
            const emptyMsg = document.getElementById('emptyFilterMsg');
            
            if (visibleCount === 0 && issueItems.length > 0) {
                if (!emptyMsg) {
                    const msg = document.createElement('div');
                    msg.id = 'emptyFilterMsg';
                    msg.style.cssText = 'padding: 20px; text-align: center; color: #666; font-style: italic;';
                    msg.textContent = 'No ' + status + ' issues found.';
                    container.appendChild(msg);
                }
            } else if (emptyMsg) {
                emptyMsg.remove();
            }
        }`;
        
        html = html.replace(filterFunctionPattern, newFilterFunction);
        console.log('✅ Fixed filter function logic');
        
        // 3. Remove confirmation alert after creating issue
        const formSubmitPattern = /if \(saved\) \{[\s\S]*?document\.getElementById\('issueForm'\)\.reset\(\);/;
        const formSubmitMatch = html.match(formSubmitPattern);
        if (formSubmitMatch) {
            const newFormSubmit = `if (saved) {
                // Update saved successfully - NO ALERT
                
                // Log for manual processing
                console.log(\`📋 Issue #\${issueNumber} created:\`, formData);
                console.log('To process manually: Check the console for details');
                
                // Try webhook but don't show errors to user
                fetch('/api/webhook/toybox-direct-update', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        ...formData,
                        safety_mode: 'always_backup',
                        execution_mode: 'immediate'
                    })
                }).then(response => {
                    if (response.ok) {
                        console.log('✅ Webhook triggered successfully');
                    }
                }).catch(error => {
                    console.log('Webhook not configured yet - request saved for manual processing');
                });
                
                document.getElementById('issueForm').reset();`;
            
            html = html.replace(formSubmitMatch[0], newFormSubmit);
            console.log('✅ Removed create confirmation message');
        }
        
        // 4. Update DOMContentLoaded to default to OPEN filter
        const domLoadPattern = /window\.addEventListener\('DOMContentLoaded', function\(\) \{[^}]*?\}\);/s;
        const domLoadMatch = html.match(domLoadPattern);
        if (domLoadMatch) {
            let newDomLoad = domLoadMatch[0];
            // Remove any existing filter default
            newDomLoad = newDomLoad.replace(/\/\/ Default to showing open issues[\s\S]*?}, 100\);/g, '');
            // Add new default
            newDomLoad = newDomLoad.replace(
                'updateLastIssueInfo();',
                `updateLastIssueInfo();
            // Default to showing open issues
            setTimeout(() => {
                const openTab = document.querySelector('.filter-tab:nth-child(2)');
                if (openTab) {
                    openTab.click();
                }
            }, 100);`
            );
            html = html.replace(domLoadMatch[0], newDomLoad);
            console.log('✅ Set OPEN as default filter on load');
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
        
        console.log('\n🎉 Fixed all three issues!');
        console.log('\n📋 What was fixed:');
        console.log('  • Filter position: Moved back BELOW the form');
        console.log('  • Filter logic: Now correctly reads status from issues');
        console.log('  • Create confirmation: Removed - silent save');
        console.log('  • Default filter: OPEN issues shown on page load');
        
        console.log('\n🔄 Refresh to see all fixes:');
        console.log('  https://webtoys.ai/public/toybox-issue-tracker');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

fixFiltersAndConfirmations();