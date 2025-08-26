#!/usr/bin/env node

/**
 * Fix duplicate issue display bug in Issue Tracker
 * - Deduplicate issues by issueNumber when loading
 * - Use update_task action for updates instead of creating new records
 * - Show only the most recent version of each issue
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

async function fixDuplicateIssues() {
    try {
        console.log('🔧 Fixing duplicate issue display bug...');
        
        // Fetch current Issue Tracker
        const { data } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        let html = data.html_content;
        
        // Backup
        const backupPath = path.join(__dirname, '..', 'backups', `issue-tracker_before_duplicate_fix_${Date.now()}.html`);
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.writeFile(backupPath, html);
        console.log(`📁 Backup saved to: ${backupPath}`);
        
        // Step 1: Fix the loadRecentUpdates function to deduplicate by issueNumber
        const oldLoadFunction = /async function loadRecentUpdates\(\) {[\s\S]*?^\s{8}\}/m;
        
        const newLoadFunction = `async function loadRecentUpdates() {
            const updates = await load('update_request');
            const container = document.getElementById('recentUpdates');
            
            if (updates && updates.length > 0) {
                // Deduplicate issues by issueNumber - keep only the most recent version
                const issueMap = new Map();
                
                // Process all updates, keeping only the latest version of each issue
                updates.forEach(update => {
                    const issueNum = update.content_data.issueNumber;
                    if (issueNum) {
                        // Check if we already have this issue
                        if (!issueMap.has(issueNum) || 
                            new Date(update.created_at) > new Date(issueMap.get(issueNum).created_at)) {
                            // Either new issue or more recent version
                            issueMap.set(issueNum, update);
                        }
                    }
                });
                
                // Convert map to array and sort by issue number (descending)
                const uniqueIssues = Array.from(issueMap.values())
                    .sort((a, b) => (b.content_data.issueNumber || 0) - (a.content_data.issueNumber || 0));
                
                container.innerHTML = '<h3 style="margin-bottom: 15px;">📋 Recent Issues</h3>' + 
                    uniqueIssues.map(update => {
                        const data = update.content_data;
                        const date = new Date(data.timestamp);
                        const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                        const submitter = data.submittedBy || 'anonymous';
                        const isAnonymous = submitter === 'anonymous';
                        
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
                                <div class="issue-status status-\${data.status || 'pending'}">
                                    Status: \${data.status || 'pending'}
                                    \${data.closedBy ? \` (closed by \${data.closedBy})\` : ''}
                                    \${currentUser && currentUser.handle === 'bart' && data.status !== 'closed' ? 
                                        \`<button class="close-button" onclick="closeTicket(\${data.issueNumber})">Close Issue</button>\` : 
                                        ''
                                    }
                                </div>
                            </div>
                        \`;
                    }).join('');
            } else {
                container.innerHTML = '<p style="color: #666;">No recent updates yet.</p>';
            }
        }`;
        
        // Replace the loadRecentUpdates function
        if (oldLoadFunction.test(html)) {
            html = html.replace(oldLoadFunction, newLoadFunction);
            console.log('✅ Updated loadRecentUpdates to deduplicate issues');
        } else {
            console.log('⚠️  Could not find loadRecentUpdates function, trying alternative approach...');
            // Try to find it differently
            const startIndex = html.indexOf('async function loadRecentUpdates()');
            if (startIndex > -1) {
                let endIndex = startIndex;
                let braceCount = 0;
                let foundStart = false;
                
                for (let i = startIndex; i < html.length; i++) {
                    if (html[i] === '{') {
                        braceCount++;
                        foundStart = true;
                    } else if (html[i] === '}' && foundStart) {
                        braceCount--;
                        if (braceCount === 0) {
                            endIndex = i + 1;
                            break;
                        }
                    }
                }
                
                if (endIndex > startIndex) {
                    html = html.slice(0, startIndex) + newLoadFunction + html.slice(endIndex);
                    console.log('✅ Replaced loadRecentUpdates function (alternative method)');
                }
            }
        }
        
        // Step 2: Update the closeTicket function to use update_task instead of save
        const closeTicketPattern = /async function closeTicket\(issueNumber\) {[\s\S]*?^\s{8}\}/m;
        
        const newCloseTicket = `async function closeTicket(issueNumber) {
            // Check if user is bart (admin)
            if (!currentUser || currentUser.handle !== 'bart') {
                alert('Only bart (admin) can close tickets!');
                return;
            }
            
            if (!confirm(\`Close Issue #\${issueNumber}?\\n\\nThis will mark the issue as closed.\`)) {
                return;
            }
            
            try {
                // Use update_task to update existing issue without creating duplicates
                const updateData = {
                    issueNumber: issueNumber,
                    status: 'closed',
                    closedBy: currentUser.handle,
                    closedAt: new Date().toISOString()
                };
                
                // Call save with update_task action to prevent duplicates
                const response = await fetch('/api/zad/save', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        app_id: window.APP_ID,
                        participant_id: currentUser.handle,
                        action_type: 'update_task',
                        content_data: {
                            filter: { issueNumber: issueNumber },
                            update: updateData
                        }
                    })
                });
                
                if (response.ok) {
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
        
        // Replace closeTicket function
        if (closeTicketPattern.test(html)) {
            html = html.replace(closeTicketPattern, newCloseTicket);
            console.log('✅ Updated closeTicket to use update_task action');
        }
        
        // Step 3: Update the updateLastIssueInfo function to work with deduplicated data
        const updateInfoPattern = /async function updateLastIssueInfo\(\) {[\s\S]*?^\s{8}\}/m;
        
        const newUpdateInfo = `async function updateLastIssueInfo() {
            const updates = await load('update_request');
            if (updates && updates.length > 0) {
                // Deduplicate to get unique issues
                const issueMap = new Map();
                updates.forEach(update => {
                    const issueNum = update.content_data.issueNumber;
                    if (issueNum) {
                        if (!issueMap.has(issueNum)) {
                            issueMap.set(issueNum, update.content_data);
                        }
                    }
                });
                
                const uniqueIssues = Array.from(issueMap.values());
                const highestNum = uniqueIssues.reduce((max, issue) => {
                    const num = issue.issueNumber || 0;
                    return num > max ? num : max;
                }, 0);
                
                const lastIssueEl = document.getElementById('lastIssueInfo');
                if (lastIssueEl) {
                    lastIssueEl.textContent = \`Total Issues: \${uniqueIssues.length} | Last: #\${highestNum} | Next: #\${highestNum + 1}\`;
                }
            }
        }`;
        
        // Replace updateLastIssueInfo if it exists
        if (updateInfoPattern.test(html)) {
            html = html.replace(updateInfoPattern, newUpdateInfo);
            console.log('✅ Updated updateLastIssueInfo for deduplication');
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
        
        console.log('\n✅ Duplicate issue bug fixed!');
        console.log('\n🎯 What was fixed:');
        console.log('  • Issues are now deduplicated by issueNumber');
        console.log('  • Only the most recent version of each issue is shown');
        console.log('  • Close function uses update_task to prevent duplicates');
        console.log('  • Issue counts show unique issues only');
        console.log('\n🔄 Reload Issue Tracker - each issue will appear only once!');
        console.log('  • https://webtoys.ai/public/toybox-issue-tracker');
        
        // Clean up existing duplicates
        console.log('\n🧹 Checking for existing duplicates to clean up...');
        const { data: allIssues } = await supabase
            .from('wtaf_zero_admin_collaborative')
            .select('*')
            .eq('app_id', 'toybox-issue-tracker')
            .eq('action_type', 'update_request')
            .order('created_at', { ascending: true });
        
        if (allIssues && allIssues.length > 0) {
            const duplicates = new Map();
            allIssues.forEach(issue => {
                const num = issue.content_data?.issueNumber;
                if (num) {
                    if (!duplicates.has(num)) {
                        duplicates.set(num, []);
                    }
                    duplicates.get(num).push(issue);
                }
            });
            
            let duplicateCount = 0;
            duplicates.forEach((issues, num) => {
                if (issues.length > 1) {
                    duplicateCount += issues.length - 1;
                    console.log(`  Issue #${num}: ${issues.length} copies (${issues.length - 1} duplicates)`);
                }
            });
            
            if (duplicateCount > 0) {
                console.log(`\n⚠️  Found ${duplicateCount} duplicate records in database`);
                console.log('  These will be hidden in the UI but still exist in the database');
            } else {
                console.log('  No duplicates found!');
            }
        }
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

fixDuplicateIssues();