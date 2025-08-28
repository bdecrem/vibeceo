#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

let result = dotenv.config({ path: path.join(__dirname, '../../.env.local') });
if (result.error) {
    // Try the regular .env file  
    result = dotenv.config({ path: path.join(__dirname, '../../.env') });
    if (result.error) {
        console.error('Error loading .env files:', result.error.message);
        console.error('Make sure you have .env or .env.local with SUPABASE_URL and SUPABASE_SERVICE_KEY');
        process.exit(1);
    }
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function fixDuplicateIssues() {
    try {
        console.log('🔧 Starting duplicate issue fix for toybox-issue-tracker...');

        // Get current app
        const { data: app, error } = await supabase
            .from('wtaf_content')
            .select('*')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        if (error) {
            console.error('❌ Error fetching app:', error);
            return;
        }
        
        console.log(`📱 Found app: ${app.title}`);
        console.log(`📏 Original HTML size: ${app.html_content.length} characters`);

        // Create backup
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(__dirname, '../backups');
        if (!fs.existsSync(backupDir)) {
            fs.mkdirSync(backupDir, { recursive: true });
        }
        
        const backupFile = path.join(backupDir, `toybox-issue-tracker_pre-duplicate-fix_${timestamp}.html`);
        fs.writeFileSync(backupFile, app.html_content);
        console.log(`💾 Created backup: ${path.basename(backupFile)}`);

        // Apply the enhanced deduplication fix
        let fixedHtml = app.html_content;

        // 1. Replace the loadRecentUpdates function with improved deduplication
        const improvedLoadFunction = `        // Load recent updates
        async function loadRecentUpdates() {
            const updates = await load('update_request');
            const container = document.getElementById('issuesContainer');
            
            if (updates && updates.length > 0) {
                // ENHANCED DEDUPLICATION: Handle multiple records per issue properly
                const issueMap = new Map();
                
                console.log(\`Loading \${updates.length} total records from ZAD...\`);
                
                // Process each record and keep only the MOST RECENT version of each issue
                updates.forEach((update, index) => {
                    if (update.content_data && update.content_data.issueNumber) {
                        const issueNumber = update.content_data.issueNumber;
                        const updateTime = new Date(update.updated_at || update.created_at);
                        
                        // If we already have this issue number, compare timestamps
                        if (issueMap.has(issueNumber)) {
                            const existingUpdate = issueMap.get(issueNumber);
                            const existingTime = new Date(existingUpdate.updated_at || existingUpdate.created_at);
                            
                            // Keep the newer record
                            if (updateTime > existingTime) {
                                console.log(\`Issue #\${issueNumber}: Replacing older record with newer one\`);
                                issueMap.set(issueNumber, update);
                            } else {
                                console.log(\`Issue #\${issueNumber}: Keeping existing newer record\`);
                            }
                        } else {
                            // First time seeing this issue number
                            console.log(\`Issue #\${issueNumber}: First record found\`);
                            issueMap.set(issueNumber, update);
                        }
                    } else {
                        console.warn(\`Record \${index} missing issueNumber:\`, update);
                    }
                });
                
                // Convert to array and sort by issue number descending  
                const uniqueIssues = Array.from(issueMap.values())
                    .sort((a, b) => (b.content_data.issueNumber || 0) - (a.content_data.issueNumber || 0));
                
                console.log(\`✅ Deduplication complete: \${updates.length} records → \${uniqueIssues.length} unique issues\`);
                console.log(\`Issue numbers found: [\${Array.from(issueMap.keys()).sort((a,b) => b-a).join(', ')}]\`);
                
                allIssues = uniqueIssues; // Store for filtering
                
                container.innerHTML = uniqueIssues.map(update => {
                    const data = update.content_data;
                    const date = new Date(data.timestamp);
                    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                    const submitter = data.submittedBy || 'anonymous';
                    const isAnonymous = submitter === 'anonymous';
                    const status = data.status || 'pending';
                    const isClosed = status === 'closed';
                    
                    return \`
                        <div class="issue-item \${isClosed ? 'closed' : ''}" data-status="\${status}">
                            <div class="issue-header">
                                <div class="issue-meta">
                                    <span class="issue-number">#\${data.issueNumber || '?'}</span>
                                    <span class="issue-type type-\${data.actionType}">\${data.actionType.toUpperCase()}</span>
                                    <span class="issue-submitter \${isAnonymous ? 'anonymous' : ''}">\${submitter}</span>
                                </div>
                                <div style="font-size: 7px; color: #808080;">\${dateStr}</div>
                            </div>
                            <div style="font-weight: bold; margin-bottom: 2px; font-size: 8px;">\${data.target}</div>
                            <div class="issue-description">\${data.description}</div>
                            \${data.admin_comments && data.admin_comments.length > 0 ? 
                                '<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e0e0e0; font-size: 11px;"><strong>Comments:</strong>' + 
                                data.admin_comments.map(c => '<div style="margin-top: 5px; padding: 5px; background: #f5f5f5; border-radius: 3px;"><strong>' + (c.author || 'unknown') + ':</strong> ' + c.text + '<br><span style="font-size: 9px; color: #666;">' + new Date(c.timestamp).toLocaleString() + '</span></div>').join('') + 
                                '</div>' : ''
                            }
                            <div class="issue-status status-\${status}" style="margin-top: 10px; position: relative;">
                                Status: \${status.toUpperCase()}
                                \${currentUser && currentUser.handle === 'bart' ? 
                                    \`\${status !== 'open' ? '<button class="open-button" onclick="openTicket(' + data.issueNumber + ')" style="margin-left: 5px;">OPEN</button>' : ''}
                                    \${(status !== 'closed' && status !== 'completed') ? '<button class="close-button" onclick="closeTicket(' + data.issueNumber + ')" style="margin-left: 5px;">CLOSE</button>' : ''}
                                    <button class="comment-button" onclick="addCommentSimple(' + data.issueNumber + ')" style="float: right; background: #2196F3; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer;">ADD COMMENT</button>\` : 
                                    ''
                                }
                            </div>
                        </div>
                    \`;
                }).join('');
                
                // Apply current filter after loading
                filterIssues();
            } else {
                container.innerHTML = '<div style="font-size: 8px; color: #808080; font-style: italic;">No issues found.</div>';
            }
        }`;

        // Replace the function - find the specific pattern
        const functionPattern = /        \/\/ Load recent updates\s*\n        async function loadRecentUpdates\(\) \{[\s\S]*?\n        \}/;
        if (functionPattern.test(fixedHtml)) {
            fixedHtml = fixedHtml.replace(functionPattern, improvedLoadFunction);
            console.log('✅ Replaced loadRecentUpdates function with enhanced deduplication');
        } else {
            console.log('⚠️ Could not find exact loadRecentUpdates function pattern, trying broader pattern');
            const broaderPattern = /async function loadRecentUpdates\(\) \{[\s\S]*?\n        \}/;
            if (broaderPattern.test(fixedHtml)) {
                fixedHtml = fixedHtml.replace(broaderPattern, improvedLoadFunction);
                console.log('✅ Replaced loadRecentUpdates function with enhanced deduplication (broader pattern)');
            } else {
                console.log('❌ Could not find loadRecentUpdates function to replace');
                return;
            }
        }

        // 2. Remove duplicate openTicket function if it exists
        const duplicateOpenTicket = /        \/\/ Open ticket function \(change status from pending to open\)\s*\n        async function openTicket\(issueNumber\) \{[\s\S]*?\n        \}/;
        if (duplicateOpenTicket.test(fixedHtml)) {
            fixedHtml = fixedHtml.replace(duplicateOpenTicket, '');
            console.log('✅ Removed duplicate openTicket function');
        }

        // 3. Replace any loadRecentIssues() calls with loadRecentUpdates()
        const issuesCallCount = (fixedHtml.match(/loadRecentIssues\(\)/g) || []).length;
        if (issuesCallCount > 0) {
            fixedHtml = fixedHtml.replace(/loadRecentIssues\(\);/g, 'loadRecentUpdates();');
            console.log(`✅ Replaced ${issuesCallCount} loadRecentIssues() calls with loadRecentUpdates()`);
        }

        console.log(`📏 Fixed HTML size: ${fixedHtml.length} characters`);
        console.log(`📊 Size change: ${fixedHtml.length - app.html_content.length} characters`);

        // Update the database
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({
                html_content: fixedHtml,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker');
        
        if (updateError) {
            console.error('❌ Error updating app:', updateError);
            return;
        }
        
        console.log('\n🎉 SUCCESS! Duplicate issue fix applied!');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('✅ Enhanced deduplication logic implemented');
        console.log('✅ Issues are now grouped by issueNumber with latest version kept'); 
        console.log('✅ OPEN/CLOSE buttons preserved for bart admin user');
        console.log('✅ Add Comment functionality preserved');
        console.log('✅ Console logging added for debugging duplicates');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🌐 Visit: https://webtoys.ai/public/toybox-issue-tracker');
        console.log('🔍 Check browser console for deduplication logs');
        console.log('📊 Should show exactly 29 unique issues now');
        
    } catch (err) {
        console.error('❌ Error during fix:', err);
    }
}

fixDuplicateIssues();
