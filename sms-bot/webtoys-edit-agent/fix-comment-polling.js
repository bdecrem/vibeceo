#!/usr/bin/env node

/**
 * Fix the comment form auto-dismiss issue caused by polling
 * The form disappears because loadLatestData rebuilds the entire UI every 3 seconds
 */

import { safeUpdateApp, fetchCurrentApp } from './safe-update-wrapper.js';

async function fixCommentPolling() {
    try {
        console.log('🔧 Fixing comment form auto-dismiss issue...');
        
        // Fetch current app
        const current = await fetchCurrentApp('bart', 'tide-worm-speaking');
        let html = current.html_content;
        
        // Add a flag to track if comment form is open
        const trackingVars = `
        let currentUser = null;
        let currentEditId = null;
        let pollingInterval = null;
        let allPosts = [];
        let allComments = [];
        let allLikes = [];
        let isCommentFormOpen = false; // Track if any comment form is open
        let openCommentPostId = null;  // Track which post's comment form is open`;
        
        html = html.replace(
            `let currentUser = null;
        let currentEditId = null;
        let pollingInterval = null;
        let allPosts = [];
        let allComments = [];
        let allLikes = [];`,
            trackingVars
        );
        
        // Update toggleCommentForm to set the flag
        const oldToggleFunction = html.match(/function toggleCommentForm\(postId\) \{[\s\S]*?\n        \}/)[0];
        
        const newToggleFunction = `function toggleCommentForm(postId) {
            // Hide all other comment forms first
            document.querySelectorAll('.comment-form-inline').forEach(form => {
                if (form.dataset.postId !== String(postId)) {
                    form.classList.remove('active');
                    const btn = document.querySelector(\`.add-comment-btn[data-post-id="\${form.dataset.postId}"]\`);
                    if (btn) {
                        btn.classList.remove('commenting');
                        btn.innerHTML = '💬 Comment';
                    }
                }
            });
            
            const form = document.querySelector(\`.comment-form-inline[data-post-id="\${postId}"]\`);
            const btn = document.querySelector(\`.add-comment-btn[data-post-id="\${postId}"]\`);
            
            if (form) {
                const isActive = form.classList.contains('active');
                if (isActive) {
                    form.classList.remove('active');
                    btn.classList.remove('commenting');
                    btn.innerHTML = '💬 Comment';
                    isCommentFormOpen = false;
                    openCommentPostId = null;
                    // Resume polling when form closes
                    startPolling();
                } else {
                    form.classList.add('active');
                    btn.classList.add('commenting');
                    btn.innerHTML = '✍️ Writing...';
                    isCommentFormOpen = true;
                    openCommentPostId = postId;
                    // Stop polling while commenting
                    stopPolling();
                    // Focus on the textarea
                    const textarea = form.querySelector('.comment-input');
                    if (textarea) {
                        textarea.focus();
                    }
                }
            }
        }`;
        
        html = html.replace(oldToggleFunction, newToggleFunction);
        
        // Update submitComment to restore polling
        const oldSubmitComment = html.match(/async function submitComment\(postId\) \{[\s\S]*?\n        \}/)[0];
        
        const newSubmitComment = `async function submitComment(postId) {
            const form = document.querySelector(\`.comment-form-inline[data-post-id="\${postId}"]\`);
            const textarea = form.querySelector('.comment-input');
            const comment = textarea.value.trim();
            
            if (!comment) {
                alert('Please enter a comment');
                return;
            }
            
            // Disable form while saving
            textarea.disabled = true;
            form.querySelector('.comment-submit').disabled = true;
            form.querySelector('.comment-submit').innerHTML = 'Posting...';
            
            try {
                await save('comment', {
                    postId: postId,
                    content: comment,
                    author: currentUser.userLabel
                });
                
                // Clear and hide form
                textarea.value = '';
                form.classList.remove('active');
                
                // Reset button
                const btn = document.querySelector(\`.add-comment-btn[data-post-id="\${postId}"]\`);
                if (btn) {
                    btn.classList.remove('commenting');
                    btn.innerHTML = '💬 Comment';
                }
                
                // Reset form state
                isCommentFormOpen = false;
                openCommentPostId = null;
                
                // Reload data and resume polling
                await loadLatestData();
                startPolling();
                
            } catch (error) {
                alert('Failed to post comment. Please try again.');
            } finally {
                // Re-enable form
                textarea.disabled = false;
                form.querySelector('.comment-submit').disabled = false;
                form.querySelector('.comment-submit').innerHTML = 'Post Comment';
            }
        }`;
        
        html = html.replace(oldSubmitComment, newSubmitComment);
        
        // Update cancelComment to restore polling
        const oldCancelComment = html.match(/function cancelComment\(postId\) \{[\s\S]*?\n        \}/)[0];
        
        const newCancelComment = `function cancelComment(postId) {
            const form = document.querySelector(\`.comment-form-inline[data-post-id="\${postId}"]\`);
            const textarea = form.querySelector('.comment-input');
            const btn = document.querySelector(\`.add-comment-btn[data-post-id="\${postId}"]\`);
            
            // Clear and hide form
            textarea.value = '';
            form.classList.remove('active');
            
            // Reset button
            if (btn) {
                btn.classList.remove('commenting');
                btn.innerHTML = '💬 Comment';
            }
            
            // Reset form state and resume polling
            isCommentFormOpen = false;
            openCommentPostId = null;
            startPolling();
        }`;
        
        html = html.replace(oldCancelComment, newCancelComment);
        
        // Update loadLatestData to preserve comment form state
        const oldLoadLatestData = html.match(/async function loadLatestData\(\) \{[\s\S]*?\n        \}/)[0];
        
        // Find where updateUI is called and modify it
        const newLoadLatestData = oldLoadLatestData.replace(
            'updateUI(activePosts, allComments, allLikes);',
            `// Preserve comment form state during updates
                const preserveCommentForm = isCommentFormOpen;
                const preservePostId = openCommentPostId;
                const preserveCommentText = preserveCommentForm ? 
                    document.querySelector(\`.comment-form-inline[data-post-id="\${preservePostId}"] .comment-input\`)?.value : '';
                
                updateUI(activePosts, allComments, allLikes);
                
                // Restore comment form state if it was open
                if (preserveCommentForm && preservePostId) {
                    const form = document.querySelector(\`.comment-form-inline[data-post-id="\${preservePostId}"]\`);
                    const btn = document.querySelector(\`.add-comment-btn[data-post-id="\${preservePostId}"]\`);
                    const textarea = form?.querySelector('.comment-input');
                    
                    if (form && btn && textarea) {
                        form.classList.add('active');
                        btn.classList.add('commenting');
                        btn.innerHTML = '✍️ Writing...';
                        textarea.value = preserveCommentText;
                        // Don't focus to avoid interrupting typing
                    }
                }`
        );
        
        html = html.replace(oldLoadLatestData, newLoadLatestData);
        
        // Deploy with safe wrapper
        console.log('\n🚀 Deploying fix for comment form auto-dismiss...');
        const success = await safeUpdateApp(
            'bart',
            'tide-worm-speaking',
            html,
            'Fixed comment form auto-dismiss - stops polling while commenting'
        );
        
        if (success) {
            console.log('\n🎉 Comment form fixed successfully!');
            console.log('\n✨ Improvements:');
            console.log('  • Polling pauses while comment form is open');
            console.log('  • Comment text preserved during any UI updates');
            console.log('  • Form state maintained across refreshes');
            console.log('  • Polling resumes after posting or cancelling');
        }
        
    } catch (error) {
        console.error('\n❌ Error:', error);
    }
}

fixCommentPolling();