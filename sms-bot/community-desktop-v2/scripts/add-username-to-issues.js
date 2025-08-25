#!/usr/bin/env node

/**
 * Add username display to issue tickets for logged-in users
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

async function addUsernameToIssues() {
    try {
        console.log('👤 Adding username display to issue tickets...');
        
        // Fetch current Issue Tracker
        const { data } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        let html = data.html_content;
        
        // Backup
        const backupPath = path.join(__dirname, '..', 'backups', `issue-tracker_before_username_${Date.now()}.html`);
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.writeFile(backupPath, html);
        console.log(`📁 Backup saved to: ${backupPath}`);
        
        // Add username styling
        const styleRegex = /\.issue-number\s*{[^}]*}/;
        const currentStyle = html.match(styleRegex)?.[0];
        
        if (currentStyle && !html.includes('.issue-submitter')) {
            const newStyles = currentStyle + `
        
        .issue-submitter {
            background: linear-gradient(135deg, #4CAF50 0%, #45a049 100%);
            color: white;
            padding: 3px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            margin-left: 8px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .issue-submitter.anonymous {
            background: linear-gradient(135deg, #9e9e9e 0%, #757575 100%);
        }
        
        .issue-meta {
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
        }`;
            
            html = html.replace(currentStyle, newStyles);
            console.log('✅ Added username styling');
        }
        
        // Update the issue display template to show username
        const currentTemplate = `return \`
                        <div class="issue-item">
                            <div class="issue-header">
                                <div style="display: flex; align-items: center;">
                                    <span class="issue-number">#\${data.issueNumber || '?'}</span>
                                    <span class="issue-type type-\${data.actionType}">\${data.actionType}</span>
                                </div>
                                <span style="font-size: 12px; color: #666;">\${dateStr}</span>
                            </div>
                            <div style="font-weight: 600; margin-bottom: 4px;">\${data.target}</div>
                            <div class="issue-description">\${data.description}</div>
                            <div class="issue-status status-\${data.status || 'pending'}">
                                Status: \${data.status || 'pending'}
                            </div>
                        </div>
                    \`;`;
        
        const newTemplate = `const submitter = data.submittedBy || 'anonymous';
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
                            </div>
                        </div>
                    \`;`;
        
        if (html.includes(currentTemplate)) {
            html = html.replace(currentTemplate, newTemplate);
            console.log('✅ Updated issue display template with username');
        } else {
            console.log('⚠️  Template not found in expected format, trying flexible approach...');
            
            // Try to find and replace the return statement more flexibly
            const returnRegex = /return\s+`\s*<div class="issue-item">[\s\S]*?<\/div>\s*`;/;
            const match = html.match(returnRegex);
            
            if (match && !match[0].includes('submittedBy')) {
                // Add the submitter extraction and display
                const replacementWithUser = `const submitter = data.submittedBy || 'anonymous';
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
                            </div>
                        </div>
                    \`;`;
                
                html = html.replace(returnRegex, replacementWithUser);
                console.log('✅ Updated template with username (flexible match)');
            } else if (match?.[0].includes('submittedBy')) {
                console.log('✅ Username already displayed in template');
            }
        }
        
        // Update the header to show current user status more prominently
        const headerRegex = /<div id="lastIssueInfo"[^>]*>.*?<\/div>/;
        if (headerRegex.test(html) && !html.includes('currentUserInfo')) {
            html = html.replace(
                headerRegex,
                `<div id="lastIssueInfo" style="margin-top: 10px; font-size: 14px; opacity: 0.95; font-weight: 500;"></div>
            <div id="currentUserInfo" style="margin-top: 5px; font-size: 13px; opacity: 0.9;"></div>`
            );
            console.log('✅ Added current user info display');
        }
        
        // Add code to update user info display
        if (!html.includes('updateCurrentUserInfo')) {
            const updateCode = `
        // Update current user display
        function updateCurrentUserInfo() {
            const userInfo = document.getElementById('currentUserInfo');
            if (userInfo) {
                const username = window.toyboxUser?.username || window.toyboxUser;
                if (username && username !== 'anonymous') {
                    userInfo.innerHTML = \`<span style="color: #4CAF50;">👤 Logged in as: <strong>\${username}</strong></span>\`;
                } else {
                    userInfo.innerHTML = \`<span style="color: #9e9e9e;">👤 Not logged in (issues will be anonymous)</span>\`;
                }
            }
        }
        
        // Call on page load and when user changes
        updateCurrentUserInfo();
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'userChanged') {
                updateCurrentUserInfo();
            }
        });`;
            
            // Insert after updateLastIssueInfo
            const insertPoint = 'updateLastIssueInfo();';
            if (html.includes(insertPoint)) {
                html = html.replace(
                    insertPoint,
                    insertPoint + updateCode
                );
                console.log('✅ Added current user info update function');
            }
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
        
        console.log('\n✅ Username display added to issues!');
        console.log('\n🎯 What was added:');
        console.log('  • Username badge shown for each issue (green for users, gray for anonymous)');
        console.log('  • Current login status displayed in header');
        console.log('  • Visual distinction between logged-in and anonymous submissions');
        console.log('  • Uppercase styling for better visibility');
        console.log('\n🔄 Reload Issue Tracker to see usernames on tickets!');
        console.log('  • https://webtoys.ai/public/toybox-issue-tracker');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

addUsernameToIssues();