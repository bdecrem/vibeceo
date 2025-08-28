#!/usr/bin/env node

/**
 * Fix OPEN and CLOSE button functions
 */

import { safeUpdateToyBoxIssueTracker, fetchCurrentIssuesTracker } from './safe-wrapper-issues.js';

async function fixOpenCloseButtons() {
    console.log('🔧 Fixing OPEN and CLOSE button functionality...');
    
    // Get current HTML
    const current = await fetchCurrentIssuesTracker();
    let html = current.html_content;
    
    // Check if openTicket and closeTicket functions exist
    const hasOpenTicket = html.includes('async function openTicket');
    const hasCloseTicket = html.includes('async function closeTicket');
    
    if (!hasOpenTicket || !hasCloseTicket) {
        console.log('Missing button functions, adding them...');
        
        // Find where to add the functions (after loadRecentIssues function)
        const afterLoadRecentIssues = `loadRecentIssues();`;
        
        const buttonFunctions = `loadRecentIssues();
        
        async function openTicket(issueNumber) {
            console.log('Opening ticket', issueNumber);
            
            // Find the issue
            const targetIssue = allIssues.find(issue => 
                issue.content_data && issue.content_data.issueNumber === issueNumber
            );
            
            if (!targetIssue) {
                alert('Issue not found');
                return;
            }
            
            // Update status to open
            targetIssue.content_data.status = 'open';
            targetIssue.content_data.openedAt = new Date().toISOString();
            targetIssue.content_data.openedBy = currentUser ? currentUser.handle : 'bart';
            
            // Save back to database
            const saved = await save('update_request', targetIssue.content_data);
            if (saved) {
                console.log('Issue #' + issueNumber + ' marked as OPEN');
                loadRecentIssues();
            }
        }
        
        async function closeTicket(issueNumber) {
            console.log('Closing ticket', issueNumber);
            
            // Find the issue
            const targetIssue = allIssues.find(issue => 
                issue.content_data && issue.content_data.issueNumber === issueNumber
            );
            
            if (!targetIssue) {
                alert('Issue not found');
                return;
            }
            
            // Update status to closed
            targetIssue.content_data.status = 'closed';
            targetIssue.content_data.closedAt = new Date().toISOString();
            targetIssue.content_data.closedBy = currentUser ? currentUser.handle : 'bart';
            
            // Save back to database
            const saved = await save('update_request', targetIssue.content_data);
            if (saved) {
                console.log('Issue #' + issueNumber + ' marked as CLOSED');
                loadRecentIssues();
            }
        }`;
        
        // Replace just the first occurrence to add functions
        html = html.replace(afterLoadRecentIssues, buttonFunctions);
    }
    
    // Also make sure the onclick handlers are correct
    // Fix any broken interpolation in onclick handlers
    html = html.replace(/onclick="openTicket\(\\?\$\{data\.issueNumber\}\)"/g, `onclick="openTicket(\${data.issueNumber})"`);
    html = html.replace(/onclick="closeTicket\(\\?\$\{data\.issueNumber\}\)"/g, `onclick="closeTicket(\${data.issueNumber})"`);
    
    // Update database
    await safeUpdateToyBoxIssueTracker(html, 'Fixed OPEN and CLOSE button functionality');
    
    console.log('✅ Fixed OPEN and CLOSE buttons!');
    console.log('   - Added missing functions if needed');
    console.log('   - Fixed onclick handlers');
}

fixOpenCloseButtons().catch(console.error);