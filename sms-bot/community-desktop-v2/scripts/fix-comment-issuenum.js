#!/usr/bin/env node

/**
 * Fix the ADD COMMENT button to properly show issue number
 */

import { safeUpdateToyBoxIssueTracker, fetchCurrentIssuesTracker } from './safe-wrapper-issues.js';

async function fixCommentIssueNumber() {
    console.log('🔧 Fixing ADD COMMENT to show proper issue number...');
    
    // Get current HTML
    const current = await fetchCurrentIssuesTracker();
    let html = current.html_content;
    
    // Fix the button to properly interpolate the issue number
    const oldButton = `<button class="comment-button" onclick="addCommentSimple(' + data.issueNumber + ')" style="float: right;">ADD COMMENT</button>`;
    const newButton = `<button class="comment-button" onclick="addCommentSimple(\${data.issueNumber})" style="float: right;">ADD COMMENT</button>`;
    
    if (!html.includes(oldButton)) {
        console.error('Could not find exact button pattern, trying alternate...');
        // Try with escaped version
        const oldButtonEscaped = `onclick="addCommentSimple(' + data.issueNumber + ')"`;
        const newButtonEscaped = `onclick="addCommentSimple(\${data.issueNumber})"`;
        
        if (html.includes(oldButtonEscaped)) {
            html = html.replace(oldButtonEscaped, newButtonEscaped);
        }
    } else {
        html = html.replace(oldButton, newButton);
    }
    
    // Also fix the OPEN and CLOSE buttons if they have the same issue
    html = html.replace(/onclick="openTicket\(' \+ data\.issueNumber \+ '\)"/g, 'onclick="openTicket(\\${data.issueNumber})"');
    html = html.replace(/onclick="closeTicket\(' \+ data\.issueNumber \+ '\)"/g, 'onclick="closeTicket(\\${data.issueNumber})"');
    
    // Update database
    await safeUpdateToyBoxIssueTracker(html, 'Fixed issue number interpolation in button onclick handlers');
    
    console.log('✅ Fixed issue number display in ADD COMMENT prompt!');
}

fixCommentIssueNumber().catch(console.error);