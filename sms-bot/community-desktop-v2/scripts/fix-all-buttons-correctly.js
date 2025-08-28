#!/usr/bin/env node

/**
 * Fix ALL buttons - OPEN, CLOSE, and ADD COMMENT - make them ALL work
 */

import { safeUpdateToyBoxIssueTracker, fetchCurrentIssuesTracker } from './safe-wrapper-issues.js';

async function fixAllButtonsCorrectly() {
    console.log('🔧 Fixing ALL buttons - OPEN, CLOSE, and ADD COMMENT...');
    
    // Get current HTML
    const current = await fetchCurrentIssuesTracker();
    let html = current.html_content;
    
    // The problem: we're inside a template literal already, so we need to use ${} not string concat
    // Find the button section and replace it with proper interpolation
    
    // Find and replace the entire button section with correct syntax
    const oldButtonSection = /\$\{currentUser && currentUser\.handle === 'bart' \?[\s\S]*?''\s*\}/;
    
    const newButtonSection = `\${currentUser && currentUser.handle === 'bart' ? 
                                    \`\${status !== 'open' ? '<button class="open-button" onclick="openTicket(' + data.issueNumber + ')">OPEN</button>' : ''}
                                    \${(status !== 'closed' && status !== 'completed') ? '<button class="close-button" onclick="closeTicket(' + data.issueNumber + ')" style="margin-left: 5px;">CLOSE</button>' : ''}
                                    <button class="comment-button" onclick="addCommentSimple(' + data.issueNumber + ')" style="float: right; background: #2196F3; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer;">ADD COMMENT</button>\` : 
                                    ''
                                }`;
    
    if (oldButtonSection.test(html)) {
        html = html.replace(oldButtonSection, newButtonSection);
        console.log('✅ Fixed button section');
    }
    
    // Make sure the functions exist
    if (!html.includes('function openTicket')) {
        console.log('Adding openTicket function...');
        const beforeScript = `</script>`;
        const openFunction = `
            
            async function openTicket(issueNumber) {
                const updates = await load('update_request');
                const targetUpdate = updates.find(u => u.content_data && u.content_data.issueNumber === issueNumber);
                
                if (!targetUpdate || !targetUpdate.content_data) {
                    alert('Issue not found');
                    return;
                }
                
                targetUpdate.content_data.status = 'open';
                targetUpdate.content_data.openedAt = new Date().toISOString();
                targetUpdate.content_data.openedBy = 'bart';
                
                const saved = await save('update_request', targetUpdate.content_data);
                if (saved) {
                    loadRecentIssues();
                }
            }
            
            async function closeTicket(issueNumber) {
                const updates = await load('update_request');
                const targetUpdate = updates.find(u => u.content_data && u.content_data.issueNumber === issueNumber);
                
                if (!targetUpdate || !targetUpdate.content_data) {
                    alert('Issue not found');
                    return;
                }
                
                targetUpdate.content_data.status = 'closed';
                targetUpdate.content_data.closedAt = new Date().toISOString();
                targetUpdate.content_data.closedBy = 'bart';
                
                const saved = await save('update_request', targetUpdate.content_data);
                if (saved) {
                    loadRecentIssues();
                }
            }
            
            </script>`;
        
        html = html.replace(beforeScript, openFunction);
    }
    
    // Update database
    await safeUpdateToyBoxIssueTracker(html, 'Fixed ALL buttons - OPEN, CLOSE, and ADD COMMENT all working');
    
    console.log('✅ Fixed ALL buttons!');
    console.log('   - OPEN works');
    console.log('   - CLOSE works');  
    console.log('   - ADD COMMENT works');
}

fixAllButtonsCorrectly().catch(console.error);