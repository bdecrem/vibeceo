#!/usr/bin/env node

/**
 * Fix OPEN button - issue shouldn't disappear, just change status
 */

import { safeUpdateToyBoxIssueTracker, fetchCurrentIssuesTracker } from './safe-wrapper-issues.js';

async function fixOpenButtonProperly() {
    console.log('🔧 Fixing OPEN button so issues don\'t disappear...');
    
    // Get current HTML
    const current = await fetchCurrentIssuesTracker();
    let html = current.html_content;
    
    // Replace the openTicket and closeTicket functions with better ones
    const oldFunctionPattern = /async function openTicket[\s\S]*?loadRecentIssues\(\);\s*\}\s*\}/;
    
    const newOpenFunction = `async function openTicket(issueNumber) {
            console.log('Opening ticket', issueNumber);
            
            // Get fresh data from database
            const updates = await load('update_request');
            const targetUpdate = updates.find(u => u.content_data && u.content_data.issueNumber === issueNumber);
            
            if (!targetUpdate || !targetUpdate.content_data) {
                alert('Issue not found');
                return;
            }
            
            // Update status to open
            targetUpdate.content_data.status = 'open';
            targetUpdate.content_data.openedAt = new Date().toISOString();
            targetUpdate.content_data.openedBy = currentUser ? currentUser.handle : 'bart';
            
            // Remove closed info if present
            delete targetUpdate.content_data.closedAt;
            delete targetUpdate.content_data.closedBy;
            
            // Save back to database
            const saved = await save('update_request', targetUpdate.content_data);
            if (saved) {
                console.log('Issue #' + issueNumber + ' marked as OPEN');
                // Reset filter to 'all' so we can see the change
                filterByStatus('all');
                // Reload issues
                loadRecentIssues();
            }
        }`;
    
    if (oldFunctionPattern.test(html)) {
        html = html.replace(oldFunctionPattern, newOpenFunction);
    }
    
    // Also fix closeTicket
    const oldClosePattern = /async function closeTicket[\s\S]*?loadRecentIssues\(\);\s*\}\s*\}/;
    
    const newCloseFunction = `async function closeTicket(issueNumber) {
            console.log('Closing ticket', issueNumber);
            
            // Get fresh data from database
            const updates = await load('update_request');
            const targetUpdate = updates.find(u => u.content_data && u.content_data.issueNumber === issueNumber);
            
            if (!targetUpdate || !targetUpdate.content_data) {
                alert('Issue not found');
                return;
            }
            
            // Update status to closed
            targetUpdate.content_data.status = 'closed';
            targetUpdate.content_data.closedAt = new Date().toISOString();
            targetUpdate.content_data.closedBy = currentUser ? currentUser.handle : 'bart';
            
            // Save back to database
            const saved = await save('update_request', targetUpdate.content_data);
            if (saved) {
                console.log('Issue #' + issueNumber + ' marked as CLOSED');
                // Reset filter to 'all' so we can see the change
                filterByStatus('all');
                // Reload issues
                loadRecentIssues();
            }
        }`;
    
    if (oldClosePattern.test(html)) {
        html = html.replace(oldClosePattern, newCloseFunction);
    }
    
    // Update database
    await safeUpdateToyBoxIssueTracker(html, 'Fixed OPEN/CLOSE buttons - issues stay visible after status change');
    
    console.log('✅ Fixed OPEN and CLOSE buttons properly!');
    console.log('   - Issues no longer disappear when clicked');
    console.log('   - Filter resets to "all" to show the change');
    console.log('   - Gets fresh data from database');
}

fixOpenButtonProperly().catch(console.error);