#!/usr/bin/env node

/**
 * SIMPLE fix - OPEN/CLOSE left, ADD COMMENT right, make it work
 */

import { safeUpdateToyBoxIssueTracker, fetchCurrentIssuesTracker } from './safe-wrapper-issues.js';

async function simpleCommentFix() {
    console.log('🔧 Simple fix - buttons in right places, make it work...');
    
    // Get current HTML
    const current = await fetchCurrentIssuesTracker();
    let html = current.html_content;
    
    // Restore the simple issue card structure with buttons in correct places
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
                                data.admin_comments.map(c => '<div style="margin-top: 5px; padding: 5px; background: #f5f5f5; border-radius: 3px;"><strong>' + (c.author || 'unknown') + ':</strong> ' + c.text + '</div>').join('') + 
                                '</div>' : ''
                            }
                            <div class="issue-status status-\${status}">
                                Status: \${status.toUpperCase()}
                                \${currentUser && currentUser.handle === 'bart' ? 
                                    \`\${status !== 'open' ? '<button class="open-button" onclick="openTicket(' + data.issueNumber + ')">OPEN</button>' : ''}
                                    \${(status !== 'closed' && status !== 'completed') ? '<button class="close-button" onclick="closeTicket(' + data.issueNumber + ')">CLOSE</button>' : ''}
                                    <button class="comment-button" onclick="addCommentSimple(' + data.issueNumber + ')" style="float: right;">ADD COMMENT</button>\` : 
                                    ''
                                }
                            </div>
                        </div>
                    \`;`;
    
    // Replace the card structure
    const oldCardPattern = /return `[\s\S]*?<\/div>\s*`;/;
    if (oldCardPattern.test(html)) {
        html = html.replace(oldCardPattern, newCardStructure);
    }
    
    // Add simple working addComment function
    const simpleAddComment = `
            
            window.addCommentSimple = async function(issueNumber) {
                const comment = prompt('Add comment for issue #' + issueNumber + ':');
                if (!comment || !comment.trim()) return;
                
                // Get all issues fresh from database
                const updates = await load('update_request');
                const targetUpdate = updates.find(u => u.content_data && u.content_data.issueNumber === issueNumber);
                
                if (!targetUpdate || !targetUpdate.content_data) {
                    alert('Issue not found');
                    return;
                }
                
                // Add comment
                if (!targetUpdate.content_data.admin_comments) {
                    targetUpdate.content_data.admin_comments = [];
                }
                
                targetUpdate.content_data.admin_comments.push({
                    text: comment,
                    author: 'bart'
                });
                
                // Save back
                const result = await save('update_request', targetUpdate.content_data);
                if (result) {
                    loadRecentIssues();
                } else {
                    alert('Failed to save comment');
                }
            };`;
    
    // Add function before closing script tag
    const scriptEnd = `</script>`;
    html = html.replace(scriptEnd, simpleAddComment + '\n' + scriptEnd);
    
    // Update database
    await safeUpdateToyBoxIssueTracker(html, 'Simple fix - OPEN/CLOSE left, ADD COMMENT right, working');
    
    console.log('✅ Fixed simply!');
    console.log('   - OPEN/CLOSE buttons on LEFT (after status)');
    console.log('   - ADD COMMENT button on RIGHT (float: right)');
    console.log('   - Simple prompt, saves to database');
}

simpleCommentFix().catch(console.error);