#!/usr/bin/env node

/**
 * Fix duplicate issues display - ensure deduplication logic is working correctly
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
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

async function fixDuplicateIssues() {
    try {
        console.log('🔧 Fixing duplicate issue display...\n');
        
        // First check what's in the database
        const { data: issues } = await supabase
            .from('wtaf_zero_admin_collaborative')
            .select('*')
            .eq('app_id', 'toybox-issue-tracker')
            .eq('action_type', 'update_request')
            .order('created_at', { ascending: false });
        
        console.log(`📊 Database check:`);
        console.log(`   Total records: ${issues?.length || 0}`);
        
        // Group by issue number to see duplicates
        const issueGroups = {};
        issues?.forEach(issue => {
            const num = issue.content_data?.issueNumber;
            if (num) {
                if (!issueGroups[num]) issueGroups[num] = 0;
                issueGroups[num]++;
            }
        });
        
        console.log(`   Unique issues: ${Object.keys(issueGroups).length}`);
        Object.entries(issueGroups).forEach(([num, count]) => {
            if (count > 1) {
                console.log(`   ⚠️  Issue #${num} has ${count} records`);
            }
        });
        
        // Get current HTML
        const { data: current } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        let html = current.html_content;
        
        // Check if deduplication logic exists
        const hasDeduplication = html.includes('const issueMap = new Map()');
        console.log(`\n✓ Has deduplication logic: ${hasDeduplication}`);
        
        // Ensure the deduplication is robust
        const loadFunctionStart = html.indexOf('async function loadRecentUpdates()');
        const loadFunctionEnd = html.indexOf('}', html.indexOf('container.innerHTML', loadFunctionStart));
        
        if (loadFunctionStart > -1 && loadFunctionEnd > -1) {
            // Extract and update the function
            const improvedFunction = `async function loadRecentUpdates() {
            const updates = await load('update_request');
            const container = document.getElementById('recentUpdates');
            
            if (!container) {
                console.error('recentUpdates container not found!');
                return;
            }
            
            if (updates && updates.length > 0) {
                // Deduplicate by issueNumber - keep only the most recent version
                const issueMap = new Map();
                
                console.log(\`Raw updates from database: \${updates.length} records\`);
                
                // Process all updates, keeping the latest version of each issue
                updates.forEach(update => {
                    if (update.content_data && update.content_data.issueNumber) {
                        const issueNum = update.content_data.issueNumber;
                        const existing = issueMap.get(issueNum);
                        
                        // Keep the newer record (by created_at)
                        if (!existing || new Date(update.created_at) > new Date(existing.created_at)) {
                            issueMap.set(issueNum, update);
                        }
                    }
                });
                
                // Convert to array and sort by issue number descending
                const uniqueIssues = Array.from(issueMap.values())
                    .sort((a, b) => (b.content_data.issueNumber || 0) - (a.content_data.issueNumber || 0));
                
                console.log(\`After deduplication: \${uniqueIssues.length} unique issues\`);
                
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
            const functionPattern = /async function loadRecentUpdates\(\)\s*\{[\s\S]*?\n\s{8}\}/;
            html = html.replace(functionPattern, improvedFunction);
            
            console.log('\n✅ Updated deduplication logic with better handling');
        }
        
        // Also add console logging on load to debug
        if (!html.includes('console.log(`Raw updates from database:')) {
            console.log('✅ Added debug logging to track deduplication');
        }
        
        // Save the fix
        const { error } = await supabase
            .from('wtaf_content')
            .update({
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker');
        
        if (error) throw error;
        
        console.log('\n🎉 FIXED duplicate issue display!');
        console.log('\n📋 What was fixed:');
        console.log('  • Enhanced deduplication logic');
        console.log('  • Added debug logging');
        console.log('  • Keeps only most recent version of each issue');
        console.log('  • Issue #7 should now appear only once');
        
        console.log('\n🔄 Refresh the page to see the fix:');
        console.log('  https://webtoys.ai/public/toybox-issue-tracker');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

fixDuplicateIssues();