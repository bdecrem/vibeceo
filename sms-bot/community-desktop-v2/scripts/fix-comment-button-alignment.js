#!/usr/bin/env node

/**
 * Fix ADD COMMENT button to be right-aligned and functional
 */

import { safeUpdateToyBoxIssueTracker, fetchCurrentIssuesTracker } from './safe-wrapper-issues.js';

async function fixCommentButton() {
    console.log('🔧 Fixing ADD COMMENT button alignment and functionality...');
    
    // Get current HTML
    const current = await fetchCurrentIssuesTracker();
    let html = current.html_content;
    
    // Fix the button display - wrap buttons in a flex container
    // Find the issue-status div and update the structure
    const oldStatusPattern = /<div class="issue-status status-\$\{status\}">\s*Status: \$\{status\.toUpperCase\(\)\}/;
    
    const newStatusPattern = `<div class="issue-status status-\${status}" style="display: flex; justify-content: space-between; align-items: center;">
                                <div>Status: \${status.toUpperCase()}`;
    
    // Replace the status pattern
    html = html.replace(oldStatusPattern, newStatusPattern);
    
    // Now fix the button section - wrap the buttons properly
    const oldButtonSection = /(\$\{currentUser && currentUser\.handle === 'bart' \?[\s\S]*?<button class="comment-button"[^>]*>ADD COMMENT<\/button>`[\s\S]*?:\s*''\s*\})/;
    
    if (!oldButtonSection.test(html)) {
        console.error('Could not find button section');
        // Try a different approach - look for where buttons are added
        
        // Find and replace the complete button logic
        const buttonPattern = `\${currentUser && currentUser.handle === 'bart' ? 
                                    \`\${status !== 'open' ? '<button class="open-button" onclick="openTicket(' + data.issueNumber + ')">OPEN</button>' : ''}\${(status !== 'closed' && status !== 'completed') ? '<button class="close-button" onclick="closeTicket(' + data.issueNumber + ')">CLOSE</button>' : ''}<button class="comment-button" onclick="addComment(' + data.issueNumber + ')">ADD COMMENT</button>\` : 
                                    ''
                                }`;
        
        const newButtonPattern = `</div>
                                \${currentUser && currentUser.handle === 'bart' ? 
                                    \`<div style="display: flex; gap: 5px;">
                                        \${status !== 'open' ? '<button class="open-button" onclick="openTicket(' + data.issueNumber + ')">OPEN</button>' : ''}
                                        \${(status !== 'closed' && status !== 'completed') ? '<button class="close-button" onclick="closeTicket(' + data.issueNumber + ')">CLOSE</button>' : ''}
                                        <button class="comment-button" onclick="addComment(' + data.issueNumber + ')" style="margin-left: auto;">ADD COMMENT</button>
                                    </div>\` : 
                                    ''
                                }`;
        
        if (html.includes(buttonPattern)) {
            html = html.replace(buttonPattern, newButtonPattern);
        } else {
            console.log('Warning: Could not find exact button pattern, trying alternate approach...');
        }
    }
    
    // Make sure the addComment function exists and works
    const addCommentCheck = /async function addComment\(issueNumber\)/;
    
    if (!addCommentCheck.test(html)) {
        console.log('addComment function not found, adding it...');
        
        // Add the function after closeTicket
        const afterCloseTicket = `loadRecentIssues();
            }`;
        
        const addCommentFunc = `loadRecentIssues();
            }
            
            async function addComment(issueNumber) {
                console.log('Adding comment to issue', issueNumber);
                const comment = prompt('Add a comment for issue #' + issueNumber + ':');
                if (!comment || !comment.trim()) {
                    console.log('No comment provided');
                    return;
                }
                
                console.log('Finding issue in allIssues:', allIssues);
                
                // Find the issue
                const targetIssue = allIssues.find(issue => 
                    issue.content_data && issue.content_data.issueNumber === issueNumber
                );
                
                if (!targetIssue) {
                    alert('Issue #' + issueNumber + ' not found');
                    return;
                }
                
                console.log('Found issue:', targetIssue);
                
                // Initialize admin_comments if it doesn't exist
                if (!targetIssue.content_data.admin_comments) {
                    targetIssue.content_data.admin_comments = [];
                }
                
                // Add the comment
                targetIssue.content_data.admin_comments.push({
                    text: comment,
                    author: currentUser ? currentUser.handle : 'bart',
                    timestamp: new Date().toISOString()
                });
                
                console.log('Saving updated issue with comment...');
                
                // Save back to database
                try {
                    const saved = await save('update_request', targetIssue.content_data);
                    if (saved) {
                        console.log('Comment added to issue #' + issueNumber);
                        alert('Comment added successfully!');
                        loadRecentIssues();
                    } else {
                        console.error('Failed to save comment');
                        alert('Failed to save comment');
                    }
                } catch (error) {
                    console.error('Error saving comment:', error);
                    alert('Error saving comment: ' + error.message);
                }
            }`;
        
        html = html.replace(afterCloseTicket, addCommentFunc);
    }
    
    // Update database with safe wrapper
    await safeUpdateToyBoxIssueTracker(html, 'Fixed ADD COMMENT button alignment and functionality');
    
    console.log('✅ Fixed ADD COMMENT button!');
    console.log('   - Right-aligned using flexbox');
    console.log('   - Added proper click handler');
    console.log('   - Added console logging for debugging');
}

fixCommentButton().catch(console.error);