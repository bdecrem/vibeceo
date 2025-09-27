#!/usr/bin/env node

/**
 * Modernize the comment interface in tide-worm-speaking
 * Replace 1980s popup with inline comment form
 */

import { safeUpdateApp, fetchCurrentApp } from './safe-update-wrapper.js';

async function modernizeComments() {
    try {
        console.log('🎆 Modernizing comment interface for tide-worm-speaking...');
        
        // Fetch current app
        const current = await fetchCurrentApp('bart', 'tide-worm-speaking');
        let html = current.html_content;
        
        // 1. Add styles for modern inline comment form
        const commentStyles = `
        .comment-form-inline {
            display: none;
            margin-top: 15px;
            padding: 15px;
            background: #f9f9f9;
            border-radius: 8px;
            border: 2px solid #FFD63D;
        }
        .comment-form-inline.active {
            display: block;
            animation: slideDown 0.3s ease;
        }
        @keyframes slideDown {
            from { opacity: 0; transform: translateY(-10px); }
            to { opacity: 1; transform: translateY(0); }
        }
        .comment-input {
            width: 100%;
            padding: 10px;
            border: 3px solid #333;
            font-family: 'JetBrains Mono', monospace;
            border-radius: 4px;
            resize: vertical;
            min-height: 60px;
        }
        .comment-input:focus {
            border-color: #FFD63D;
            outline: none;
        }
        .comment-buttons {
            display: flex;
            gap: 10px;
            margin-top: 10px;
        }
        .comment-submit, .comment-cancel {
            flex: 1;
            padding: 8px;
            border: none;
            cursor: pointer;
            font-size: 14px;
            border-radius: 4px;
            font-weight: bold;
        }
        .comment-submit {
            background: #FFD63D;
        }
        .comment-submit:hover {
            background: #FFC107;
        }
        .comment-cancel {
            background: #e0e0e0;
        }
        .comment-cancel:hover {
            background: #ccc;
        }
        .add-comment-btn {
            transition: all 0.2s;
        }
        .add-comment-btn.commenting {
            background: #4CAF50;
            color: white;
        }`;
        
        // Insert styles before the closing </style> tag
        html = html.replace('</style>', commentStyles + '\n    </style>');
        
        // 2. Replace the addComment function with modern inline version
        const oldAddComment = `async function addComment(postId) {
            const comment = prompt('Enter your comment:');
            if (comment && comment.trim()) {
                await save('comment', {
                    postId: postId,
                    content: comment.trim(),
                    author: currentUser.userLabel
                });
                loadLatestData();
            }
        }`;
        
        const newAddComment = `function toggleCommentForm(postId) {
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
                } else {
                    form.classList.add('active');
                    btn.classList.add('commenting');
                    btn.innerHTML = '✍️ Writing...';
                    // Focus on the textarea
                    const textarea = form.querySelector('.comment-input');
                    if (textarea) {
                        textarea.focus();
                    }
                }
            }
        }
        
        async function submitComment(postId) {
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
                
                // Reload data
                await loadLatestData();
                
            } catch (error) {
                alert('Failed to post comment. Please try again.');
            } finally {
                // Re-enable form
                textarea.disabled = false;
                form.querySelector('.comment-submit').disabled = false;
                form.querySelector('.comment-submit').innerHTML = 'Post Comment';
            }
        }
        
        function cancelComment(postId) {
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
        }`;
        
        html = html.replace(oldAddComment, newAddComment);
        
        // 3. Update the UI rendering to include inline comment forms
        // Find and replace the updateUI function's comment button
        const updateUIPattern = /<button class="button" onclick="addComment\(\$\{post\.id\}\)">.*?Comment<\/button>/;
        html = html.replace(updateUIPattern,
            '<button class="button add-comment-btn" data-post-id="${post.id}" onclick="toggleCommentForm(${post.id})">💬 Comment</button>');
        
        // 4. Add the inline comment form to the post template
        // Find where comments are displayed and add the form before them
        const postActionsEnd = `</div>`;
        const commentFormTemplate = `</div>
                        <div class="comment-form-inline" data-post-id="\${post.id}">
                            <textarea class="comment-input" placeholder="Write a thoughtful comment..."></textarea>
                            <div class="comment-buttons">
                                <button class="comment-submit" onclick="submitComment(\${post.id})">Post Comment</button>
                                <button class="comment-cancel" onclick="cancelComment(\${post.id})">Cancel</button>
                            </div>
                        </div>`;
        
        // Update the posts template to include the inline form
        const postsTemplatePattern = /(<div class="post-actions">.*?<\/div>)(\s*\$\{postComments\.length)/s;
        html = html.replace(postsTemplatePattern, 
            `$1
                        <div class="comment-form-inline" data-post-id="\${post.id}">
                            <textarea class="comment-input" placeholder="Write a thoughtful comment..."></textarea>
                            <div class="comment-buttons">
                                <button class="comment-submit" onclick="submitComment(\${post.id})">Post Comment</button>
                                <button class="comment-cancel" onclick="cancelComment(\${post.id})">Cancel</button>
                            </div>
                        </div>$2`);
        
        // Deploy with safe wrapper
        console.log('\n🚀 Deploying modernized comment interface...');
        const success = await safeUpdateApp(
            'bart',
            'tide-worm-speaking',
            html,
            'Modernized comment interface - replaced popup with inline form'
        );
        
        if (success) {
            console.log('\n🎉 Comment interface modernized successfully!');
            console.log('\n✨ New features:');
            console.log('  • Inline comment forms (no more popups!)');
            console.log('  • Multi-line comment support');
            console.log('  • Smooth animations');
            console.log('  • Visual feedback during posting');
            console.log('  • Cancel button for better UX');
        }
        
    } catch (error) {
        console.error('\n❌ Error:', error);
    }
}

modernizeComments();