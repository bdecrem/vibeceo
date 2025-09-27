#!/usr/bin/env node

/**
 * Fix comment line breaks to display properly when viewing comments
 * Comments should preserve formatting just like posts do
 */

import { safeUpdateApp, fetchCurrentApp } from './safe-update-wrapper.js';

async function fixCommentLineBreaks() {
    try {
        console.log('📄 Fixing comment line break display...');
        
        // Fetch current app
        const current = await fetchCurrentApp('bart', 'tide-worm-speaking');
        let html = current.html_content;
        
        // 1. Add CSS for comment content to preserve line breaks
        const commentContentStyle = `
        .comment-content {
            white-space: pre-wrap;
            word-wrap: break-word;
            line-height: 1.5;
        }`;
        
        // Insert the style right after the existing .comment styles
        const insertAfter = `.comment-author {
            font-weight: bold;
            color: #666;
        }`;
        
        html = html.replace(insertAfter, insertAfter + commentContentStyle);
        
        // 2. Update the comment rendering in updateUI to use the new class
        // Find the comment template in the updateUI function
        const oldCommentTemplate = `<div class="comment">
                                <div class="comment-author">\${comment.author}:</div>
                                <div>\${comment.content}</div>
                            </div>`;
        
        const newCommentTemplate = `<div class="comment">
                                <div class="comment-author">\${comment.author}:</div>
                                <div class="comment-content">\${comment.content}</div>
                            </div>`;
        
        html = html.replace(oldCommentTemplate, newCommentTemplate);
        
        // Deploy with safe wrapper
        console.log('\n🚀 Deploying fix for comment line breaks...');
        const success = await safeUpdateApp(
            'bart',
            'tide-worm-speaking',
            html,
            'Fixed comment line breaks - now preserves formatting like posts'
        );
        
        if (success) {
            console.log('\n🎉 Comment line breaks fixed successfully!');
            console.log('\n✨ Improvements:');
            console.log('  • Comments now respect line breaks');
            console.log('  • Multi-line comments display properly');
            console.log('  • Consistent formatting with posts');
            console.log('  • Better readability for longer comments');
        }
        
    } catch (error) {
        console.error('\n❌ Error:', error);
    }
}

fixCommentLineBreaks();