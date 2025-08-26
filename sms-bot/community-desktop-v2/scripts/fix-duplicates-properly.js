#!/usr/bin/env node

/**
 * Properly fix duplicate issue display without breaking the app
 * - Keep the existing display logic intact
 * - Only deduplicate within the display function
 * - Show both open and closed issues
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

async function fixDuplicatesProperly() {
    try {
        console.log('🔧 Fixing duplicate display properly (without breaking the app)...');
        
        // Fetch current Issue Tracker
        const { data } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        let html = data.html_content;
        
        // Backup
        const backupPath = path.join(__dirname, '..', 'backups', `issue-tracker_before_proper_fix_${Date.now()}.html`);
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.writeFile(backupPath, html);
        console.log(`📁 Backup saved to: ${backupPath}`);
        
        // Find the loadRecentUpdates function
        const loadFunctionStart = html.indexOf('async function loadRecentUpdates()');
        if (loadFunctionStart === -1) {
            console.error('Could not find loadRecentUpdates function');
            return;
        }
        
        // Find the end of the function
        let braceCount = 0;
        let functionEnd = loadFunctionStart;
        let foundStart = false;
        
        for (let i = loadFunctionStart; i < html.length; i++) {
            if (html[i] === '{') {
                braceCount++;
                foundStart = true;
            } else if (html[i] === '}' && foundStart) {
                braceCount--;
                if (braceCount === 0) {
                    functionEnd = i + 1;
                    break;
                }
            }
        }
        
        // New loadRecentUpdates that deduplicates properly
        const newLoadFunction = `async function loadRecentUpdates() {
            const updates = await load('update_request');
            const container = document.getElementById('recentUpdates');
            
            if (updates && updates.length > 0) {
                // Deduplicate by issueNumber - keep the most recent version of each
                const issueMap = new Map();
                
                // Sort by created_at to ensure we process in order
                const sortedUpdates = updates.sort((a, b) => 
                    new Date(a.created_at) - new Date(b.created_at)
                );
                
                // Build map of unique issues, keeping the latest version
                sortedUpdates.forEach(update => {
                    if (update.content_data && update.content_data.issueNumber) {
                        // Always update with the latest version
                        issueMap.set(update.content_data.issueNumber, update);
                    }
                });
                
                // Convert to array and sort by issue number descending
                const uniqueIssues = Array.from(issueMap.values())
                    .sort((a, b) => (b.content_data.issueNumber || 0) - (a.content_data.issueNumber || 0));
                
                console.log(\`Loaded \${updates.length} records, showing \${uniqueIssues.length} unique issues\`);
                
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
        
        // Replace the function
        html = html.slice(0, loadFunctionStart) + newLoadFunction + html.slice(functionEnd);
        console.log('✅ Updated loadRecentUpdates to deduplicate properly');
        
        // Also update updateLastIssueInfo to count unique issues
        const infoFunctionStart = html.indexOf('async function updateLastIssueInfo()');
        if (infoFunctionStart > -1) {
            let infoEnd = infoFunctionStart;
            braceCount = 0;
            foundStart = false;
            
            for (let i = infoFunctionStart; i < html.length; i++) {
                if (html[i] === '{') {
                    braceCount++;
                    foundStart = true;
                } else if (html[i] === '}' && foundStart) {
                    braceCount--;
                    if (braceCount === 0) {
                        infoEnd = i + 1;
                        break;
                    }
                }
            }
            
            const newInfoFunction = `async function updateLastIssueInfo() {
            const updates = await load('update_request');
            if (updates && updates.length > 0) {
                // Deduplicate to count unique issues
                const issueNumbers = new Set();
                let highestNum = 0;
                
                updates.forEach(update => {
                    if (update.content_data && update.content_data.issueNumber) {
                        issueNumbers.add(update.content_data.issueNumber);
                        if (update.content_data.issueNumber > highestNum) {
                            highestNum = update.content_data.issueNumber;
                        }
                    }
                });
                
                const uniqueCount = issueNumbers.size;
                document.getElementById('lastIssueInfo').textContent = \`Total Issues: \${uniqueCount} | Last: #\${highestNum} | Next: #\${highestNum + 1}\`;
            }
        }`;
            
            html = html.slice(0, infoFunctionStart) + newInfoFunction + html.slice(infoEnd);
            console.log('✅ Updated issue counter to show unique counts');
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
        
        console.log('\n✅ Duplicate display fixed properly!');
        console.log('\n🎯 What was fixed:');
        console.log('  • Each issue appears only once (deduplicated by issueNumber)');
        console.log('  • Shows the most recent version of each issue');
        console.log('  • Both open AND closed issues are displayed');
        console.log('  • Issue counter shows unique issue count');
        console.log('  • All existing features still work');
        console.log('\n🔄 Reload Issue Tracker - all issues should be visible!');
        console.log('  • https://webtoys.ai/public/toybox-issue-tracker');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

fixDuplicatesProperly();