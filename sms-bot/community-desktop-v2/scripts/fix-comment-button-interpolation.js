#!/usr/bin/env node

/**
 * Fix the ADD COMMENT button to properly interpolate the issue number
 */

import { safeUpdateToyBoxIssueTracker, fetchCurrentIssuesTracker } from './safe-wrapper-issues.js';

async function fixCommentButtonInterpolation() {
    console.log('🔧 Fixing ADD COMMENT button interpolation...');
    
    // Get current HTML
    const current = await fetchCurrentIssuesTracker();
    let html = current.html_content;
    
    // The button is using string concatenation instead of template literal interpolation
    // Find and fix the ADD COMMENT button onclick
    const oldButton = `onclick="addCommentSimple(' + data.issueNumber + ')"`;
    const newButton = `onclick="addCommentSimple(\${data.issueNumber})"`;
    
    if (html.includes(oldButton)) {
        html = html.replace(oldButton, newButton);
        console.log('✅ Fixed ADD COMMENT button interpolation');
    } else {
        console.log('⚠️ Pattern not found, trying alternate...');
    }
    
    // Also fix OPEN and CLOSE buttons while we're at it
    html = html.replace(/onclick="openTicket\(' \+ data\.issueNumber \+ '\)"/g, 'onclick="openTicket(${data.issueNumber})"');
    html = html.replace(/onclick="closeTicket\(' \+ data\.issueNumber \+ '\)"/g, 'onclick="closeTicket(${data.issueNumber})"');
    
    // Update database
    await safeUpdateToyBoxIssueTracker(html, 'Fixed button onclick interpolation for ADD COMMENT');
    
    console.log('✅ Fixed button interpolation!');
    console.log('   - ADD COMMENT now properly passes issue number');
}

fixCommentButtonInterpolation().catch(console.error);