#!/usr/bin/env node

/**
 * Add ADD COMMENT button for user bart
 * Comments stored in content_data.admin_comments array
 */

import { safeUpdateToyBoxIssueTracker, fetchCurrentIssuesTracker } from './safe-wrapper-issues.js';

async function addCommentButton() {
    console.log('🔧 Adding ADD COMMENT button for bart...');
    
    // Get current HTML
    const current = await fetchCurrentIssuesTracker();
    let html = current.html_content;
    
    // First, add the addComment function after the closeTicket function
    const closeTicketEnd = `loadRecentIssues();
            }`;
    
    const addCommentFunction = `loadRecentIssues();
            }
            
            async function addComment(issueNumber) {
                const comment = prompt('Add a comment:');
                if (!comment || !comment.trim()) return;
                
                // Find the issue
                const targetIssue = allIssues.find(issue => 
                    issue.content_data && issue.content_data.issueNumber === issueNumber
                );
                
                if (!targetIssue) {
                    alert('Issue not found');
                    return;
                }
                
                // Add comment to admin_comments array
                if (!targetIssue.content_data.admin_comments) {
                    targetIssue.content_data.admin_comments = [];
                }
                
                targetIssue.content_data.admin_comments.push({
                    text: comment,
                    author: currentUser.handle,
                    timestamp: new Date().toISOString()
                });
                
                // Save back to database
                const saved = await save('update_request', targetIssue.content_data);
                if (saved) {
                    console.log('Comment added to issue #' + issueNumber);
                    loadRecentIssues();
                }
            }`;
    
    // Replace to add the function
    html = html.replace(closeTicketEnd, addCommentFunction);
    
    // Now update the button display to add ADD COMMENT button
    // Find the current button pattern
    const currentButtonPattern = /\$\{status !== 'open' \? '<button class="open-button" onclick="openTicket\(' \+ data\.issueNumber \+ '\)">OPEN<\/button>' : ''\}\$\{\(status !== 'closed' && status !== 'completed'\) \? '<button class="close-button" onclick="closeTicket\(' \+ data\.issueNumber \+ '\)">CLOSE<\/button>' : ''\}/;
    
    // New pattern with ADD COMMENT button
    const newButtonPattern = `\${status !== 'open' ? '<button class="open-button" onclick="openTicket(' + data.issueNumber + ')">OPEN</button>' : ''}\${(status !== 'closed' && status !== 'completed') ? '<button class="close-button" onclick="closeTicket(' + data.issueNumber + ')">CLOSE</button>' : ''}<button class="comment-button" onclick="addComment(' + data.issueNumber + ')">ADD COMMENT</button>`;
    
    if (!currentButtonPattern.test(html)) {
        console.error('Could not find button pattern');
        process.exit(1);
    }
    
    // Replace the button pattern
    html = html.replace(currentButtonPattern, newButtonPattern);
    
    // Add CSS for comment button
    const cssPattern = `.close-button:hover {
                background-color: #d32f2f;
            }`;
    
    const newCss = `.close-button:hover {
                background-color: #d32f2f;
            }
            
            .comment-button {
                margin-left: 5px;
                padding: 2px 6px;
                font-size: 10px;
                background-color: #2196F3;
                color: white;
                border: none;
                border-radius: 3px;
                cursor: pointer;
            }
            
            .comment-button:hover {
                background-color: #1976D2;
            }`;
    
    html = html.replace(cssPattern, newCss);
    
    // Add display of existing comments in the issue card
    const issueEndPattern = `<div class="issue-status status-\${status}">`;
    
    const commentsDisplay = `\${data.admin_comments && data.admin_comments.length > 0 ? 
                                '<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e0e0e0; font-size: 11px;"><strong>Comments:</strong>' + 
                                data.admin_comments.map(c => '<div style="margin-top: 5px; padding: 5px; background: #f5f5f5; border-radius: 3px;"><strong>' + (c.author || 'unknown') + ':</strong> ' + c.text + '<br><span style="font-size: 9px; color: #666;">' + new Date(c.timestamp).toLocaleString() + '</span></div>').join('') + 
                                '</div>' : ''
                            }
                            <div class="issue-status status-\${status}">`;
    
    html = html.replace(issueEndPattern, commentsDisplay);
    
    // Update database with safe wrapper
    await safeUpdateToyBoxIssueTracker(html, 'Added ADD COMMENT button and comment display for bart');
    
    console.log('✅ Added ADD COMMENT button!');
    console.log('   - Shows for admin bart on all issues');
    console.log('   - Stores comments in admin_comments array');
    console.log('   - Displays existing comments below each issue');
}

addCommentButton().catch(console.error);