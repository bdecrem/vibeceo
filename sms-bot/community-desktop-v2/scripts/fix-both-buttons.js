#!/usr/bin/env node

/**
 * Fix the button logic to show BOTH buttons when appropriate:
 * - OPEN button: shows when status is NOT "open"
 * - CLOSE button: shows when status is NOT "closed" 
 */

import { safeUpdateToyBoxIssueTracker, fetchCurrentIssuesTracker } from './safe-wrapper-issues.js';

async function fixBothButtons() {
    console.log('🔧 Fixing button logic to show both OPEN and CLOSE when appropriate...');
    
    // Get current HTML
    const current = await fetchCurrentIssuesTracker();
    let html = current.html_content;
    
    // Find the current button logic
    const oldPattern = `status === 'closed' || status === 'completed' ? 
                                        \`<button class="open-button" onclick="openTicket(\${data.issueNumber})">OPEN</button>\` : 
                                        \`<button class="close-button" onclick="closeTicket(\${data.issueNumber})">CLOSE</button>\``;
    
    // New logic: Show buttons based on what makes sense
    // - Show OPEN if status is not "open"  
    // - Show CLOSE if status is not "closed" and not "completed"
    const newPattern = `\`\${status !== 'open' ? '<button class="open-button" onclick="openTicket(' + data.issueNumber + ')">OPEN</button>' : ''}\${(status !== 'closed' && status !== 'completed') ? '<button class="close-button" onclick="closeTicket(' + data.issueNumber + ')">CLOSE</button>' : ''}\``;
    
    if (!html.includes(oldPattern)) {
        console.error('Could not find exact button pattern in HTML');
        process.exit(1);
    }
    
    // Replace the pattern
    html = html.replace(oldPattern, newPattern);
    
    // Update database with safe wrapper
    await safeUpdateToyBoxIssueTracker(html, 'Show both OPEN and CLOSE buttons when appropriate');
    
    console.log('✅ Fixed! Now shows:');
    console.log('   - OPEN button when status is NOT "open"');
    console.log('   - CLOSE button when status is NOT "closed" or "completed"');
    console.log('   - Most issues will show BOTH buttons');
}

fixBothButtons().catch(console.error);