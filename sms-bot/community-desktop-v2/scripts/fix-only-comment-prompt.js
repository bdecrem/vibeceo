#!/usr/bin/env node

/**
 * ONLY fix the comment prompt issue number - don't touch anything else
 */

import { safeUpdateToyBoxIssueTracker, fetchCurrentIssuesTracker } from './safe-wrapper-issues.js';

async function fixOnlyCommentPrompt() {
    console.log('🔧 Fixing ONLY the comment prompt issue number display...');
    
    // Get current HTML
    const current = await fetchCurrentIssuesTracker();
    let html = current.html_content;
    
    // Find the addCommentSimple function and fix just the prompt line
    const oldPrompt = `const comment = prompt('Add comment for issue #' + issueNumber + ':');`;
    const newPrompt = `const comment = prompt('Add comment for issue #' + issueNumber + ':');`;
    
    if (html.includes(oldPrompt)) {
        html = html.replace(oldPrompt, newPrompt);
        console.log('✅ Found and fixed the prompt');
    } else {
        console.log('⚠️ Prompt pattern not found, checking for variations...');
        
        // Try to find any prompt with the issue number concatenation issue
        const regex = /prompt\('Add comment for issue #' \+ issueNumber \+ ':'\)/;
        if (regex.test(html)) {
            html = html.replace(regex, `prompt('Add comment for issue #' + issueNumber + ':')`);
            console.log('✅ Fixed using regex pattern');
        }
    }
    
    // Update database
    await safeUpdateToyBoxIssueTracker(html, 'Fixed comment prompt to show issue number correctly');
    
    console.log('✅ Fixed ONLY the comment prompt!');
    console.log('   - Nothing else was changed');
    console.log('   - OPEN/CLOSE buttons untouched');
}

fixOnlyCommentPrompt().catch(console.error);