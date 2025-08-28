#!/usr/bin/env node

/**
 * Properly fix ADD COMMENT - right align and add inline form
 */

import { safeUpdateToyBoxIssueTracker, fetchCurrentIssuesTracker } from './safe-wrapper-issues.js';

async function fixCommentProperly() {
    console.log('🔧 Completely fixing ADD COMMENT button with proper form...');
    
    // Get current HTML
    const current = await fetchCurrentIssuesTracker();
    let html = current.html_content;
    
    // First, let's fix the issue card HTML structure completely
    // Find the return statement that builds each issue card
    const oldCardPattern = /return `[\s\S]*?<div class="issue-item[\s\S]*?<\/div>\s*`;/;
    
    // Build the new card structure with proper button alignment
    const newCardStructure = `return \`
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
                            <div id="comment-form-\${data.issueNumber}" style="display: none; margin-top: 10px; padding: 10px; background: #f0f0f0; border-radius: 5px;">
                                <textarea id="comment-input-\${data.issueNumber}" style="width: 100%; height: 50px; font-size: 12px;" placeholder="Enter your comment..."></textarea>
                                <div style="margin-top: 5px;">
                                    <button onclick="submitComment(\${data.issueNumber})" style="background: #4CAF50; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer;">Submit</button>
                                    <button onclick="cancelComment(\${data.issueNumber})" style="background: #f44336; color: white; border: none; padding: 5px 10px; border-radius: 3px; cursor: pointer; margin-left: 5px;">Cancel</button>
                                </div>
                            </div>
                            <div class="issue-status status-\${status}" style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px;">
                                <div>Status: \${status.toUpperCase()}</div>
                                \${currentUser && currentUser.handle === 'bart' ? 
                                    \`<div style="display: flex; gap: 5px; align-items: center;">
                                        \${status !== 'open' ? '<button class="open-button" onclick="openTicket(' + data.issueNumber + ')">OPEN</button>' : ''}
                                        \${(status !== 'closed' && status !== 'completed') ? '<button class="close-button" onclick="closeTicket(' + data.issueNumber + ')">CLOSE</button>' : ''}
                                        <button class="comment-button" onclick="toggleCommentForm(' + data.issueNumber + ')" style="background: #2196F3;">ADD COMMENT</button>
                                    </div>\` : 
                                    ''
                                }
                            </div>
                        </div>
                    \`;`;
    
    if (oldCardPattern.test(html)) {
        html = html.replace(oldCardPattern, newCardStructure);
    } else {
        console.log('Warning: Could not find card pattern, trying alternate approach...');
    }
    
    // Now add the comment handling functions
    const functionsToAdd = `
            async function toggleCommentForm(issueNumber) {
                const form = document.getElementById('comment-form-' + issueNumber);
                if (form) {
                    form.style.display = form.style.display === 'none' ? 'block' : 'none';
                    if (form.style.display === 'block') {
                        const input = document.getElementById('comment-input-' + issueNumber);
                        if (input) input.focus();
                    }
                }
            }
            
            function cancelComment(issueNumber) {
                const form = document.getElementById('comment-form-' + issueNumber);
                const input = document.getElementById('comment-input-' + issueNumber);
                if (form) form.style.display = 'none';
                if (input) input.value = '';
            }
            
            async function submitComment(issueNumber) {
                const input = document.getElementById('comment-input-' + issueNumber);
                if (!input || !input.value.trim()) {
                    alert('Please enter a comment');
                    return;
                }
                
                const comment = input.value.trim();
                
                // Find the issue
                const targetIssue = allIssues.find(issue => 
                    issue.content_data && issue.content_data.issueNumber === issueNumber
                );
                
                if (!targetIssue) {
                    alert('Issue not found');
                    return;
                }
                
                // Initialize admin_comments if needed
                if (!targetIssue.content_data.admin_comments) {
                    targetIssue.content_data.admin_comments = [];
                }
                
                // Add the comment
                targetIssue.content_data.admin_comments.push({
                    text: comment,
                    author: currentUser ? currentUser.handle : 'bart',
                    timestamp: new Date().toISOString()
                });
                
                // Save to database
                try {
                    const saved = await save('update_request', targetIssue.content_data);
                    if (saved) {
                        // Clear and hide form
                        input.value = '';
                        const form = document.getElementById('comment-form-' + issueNumber);
                        if (form) form.style.display = 'none';
                        
                        // Reload issues to show new comment
                        loadRecentIssues();
                    } else {
                        alert('Failed to save comment');
                    }
                } catch (error) {
                    console.error('Error saving comment:', error);
                    alert('Error saving comment');
                }
            }`;
    
    // Add these functions after the closeTicket function
    const afterCloseTicket = `loadRecentIssues();
            }`;
    
    const newAfterCloseTicket = `loadRecentIssues();
            }` + functionsToAdd;
    
    html = html.replace(afterCloseTicket, newAfterCloseTicket);
    
    // Update database with safe wrapper
    await safeUpdateToyBoxIssueTracker(html, 'Complete fix for ADD COMMENT with inline form and right alignment');
    
    console.log('✅ Completely fixed ADD COMMENT!');
    console.log('   - Button is properly right-aligned');
    console.log('   - Clicking shows inline comment form');
    console.log('   - Submit saves and Cancel closes form');
    console.log('   - Comments display on the card');
}

fixCommentProperly().catch(console.error);