#!/usr/bin/env node

/**
 * Fix the OPEN/CLOSE button logic for admin bart
 * Current: Shows OPEN for closed/pending, CLOSE for open
 * Fixed: Shows CLOSE for open/pending, OPEN for closed
 */

import { safeUpdateToyBoxIssueTracker, fetchCurrentIssuesTracker } from './safe-wrapper-issues.js';

async function fixCloseButton() {
    console.log('🔧 Fixing CLOSE button logic...');
    
    // Get current HTML
    const current = await fetchCurrentIssuesTracker();
    let html = current.html_content;
    
    // Find the button logic section and replace it
    // Look for the exact pattern with the nested ternary
    const oldPattern = `status === 'closed' || status === 'completed' ? 
                                        \`<button class="open-button" onclick="openTicket(\${data.issueNumber})">OPEN</button>\` : 
                                        status === 'pending' ?
                                            \`<button class="open-button" onclick="openTicket(\${data.issueNumber})">OPEN</button>\` :
                                            \`<button class="close-button" onclick="closeTicket(\${data.issueNumber})">CLOSE</button>\``;
    
    // Simplified logic: closed/completed -> OPEN, everything else -> CLOSE
    const newPattern = `status === 'closed' || status === 'completed' ? 
                                        \`<button class="open-button" onclick="openTicket(\${data.issueNumber})">OPEN</button>\` : 
                                        \`<button class="close-button" onclick="closeTicket(\${data.issueNumber})">CLOSE</button>\``;
    
    if (!html.includes(oldPattern)) {
        console.error('Could not find exact button pattern in HTML');
        console.log('Looking for:', oldPattern.substring(0, 100) + '...');
        process.exit(1);
    }
    
    // Replace the pattern
    html = html.replace(oldPattern, newPattern);
    
    // Update database with safe wrapper
    await safeUpdateToyBoxIssueTracker(html, 'Fixed CLOSE button for non-closed issues');
    
    console.log('✅ Fixed! Now shows:');
    console.log('   - CLOSE button for open/pending issues');
    console.log('   - OPEN button for closed/completed issues');
}

fixCloseButton().catch(console.error);