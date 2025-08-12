import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const user = searchParams.get('user');
    const slug = searchParams.get('slug');
    
    if (!user || !slug) {
        return new NextResponse('Missing user or slug parameter', { status: 400 });
    }
    
    try {
        const { data, error } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', user)
            .eq('app_slug', slug)
            .single();
            
        if (error || !data) {
            return new NextResponse('App not found', { status: 404 });
        }
        
        // For superpower mode, inject localStorage auth reader
        let html = data.html_content;
        
        // Fix APP_ID for ALL issue trackers to use the correct database that the agent watches
        if (slug === 'issue-tracker') {
            html = html.replace(
                "window.APP_ID = 'webtoys-issue-tracker';",
                "window.APP_ID = '83218c2e-281e-4265-a95f-1d3f763870d4'; // Main issue tracker that agent monitors"
            );
            
            // Add filter to hide hidden issues from normal users AND display admin comments
            const enhanceIssueDisplay = `
                <script>
                // Override the load function to filter hidden issues
                const originalLoad = window.load || window.loadIssues;
                if (originalLoad) {
                    window.load = async function(actionType) {
                        const issues = await originalLoad.call(this, actionType);
                        // Filter out hidden issues for non-superpower users
                        if (!window.isSuperpowerMode && Array.isArray(issues)) {
                            const filtered = issues.filter(issue => {
                                // Check both hidden flag and deleted flag
                                return !issue.content_data?.hidden && !issue.content_data?.deleted;
                            });
                            console.log('Filtered ' + (issues.length - filtered.length) + ' hidden/deleted issues');
                            return filtered;
                        }
                        return issues;
                    };
                    window.loadIssues = window.load;
                }
                
                // Add admin comments to issue display
                const originalRenderIssue = window.renderIssue;
                if (originalRenderIssue) {
                    window.renderIssue = function(issue, index) {
                        let html = originalRenderIssue.call(this, issue, index);
                        
                        // Add admin comments if they exist
                        if (issue.content_data.admin_comments && issue.content_data.admin_comments.length > 0) {
                            const commentsHtml = issue.content_data.admin_comments.map(comment => \`
                                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                           color: white; padding: 12px; border-radius: 10px; 
                                           margin-top: 10px; font-size: 14px;">
                                    <div style="font-weight: bold; margin-bottom: 5px;">
                                        ⚡ Admin Comment (\${new Date(comment.timestamp).toLocaleDateString()})
                                    </div>
                                    <div>\${comment.text}</div>
                                </div>
                            \`).join('');
                            
                            // Insert comments before the closing div
                            const insertPoint = html.lastIndexOf('</div>');
                            html = html.slice(0, insertPoint) + commentsHtml + html.slice(insertPoint);
                        }
                        
                        return html;
                    };
                }
                </script>
                <style>
                /* Style for admin comments */
                .admin-comment {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 12px;
                    border-radius: 10px;
                    margin-top: 10px;
                    font-size: 14px;
                    animation: slideIn 0.3s ease-out;
                }
                
                @keyframes slideIn {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                </style>
            `;
            html = html.replace('</head>', enhanceIssueDisplay + '</head>');
            
            // Add superpower controls to the issue display
            if (searchParams.get('superpower') === 'true') {
                // Inject enhanced superpower controls
                const superpowerEnhancements = `
                    <style>
                    /* Enhanced Superpower Controls */
                    .superpower-actions {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        border-radius: 15px;
                        padding: 20px;
                        margin-top: 15px;
                        color: white;
                        box-shadow: 0 10px 30px rgba(102, 126, 234, 0.3);
                    }
                    
                    .sp-controls-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
                        gap: 12px;
                        margin-bottom: 15px;
                    }
                    
                    .sp-control {
                        display: flex;
                        flex-direction: column;
                        gap: 5px;
                    }
                    
                    .sp-control label {
                        font-size: 0.8rem;
                        font-weight: 600;
                        text-transform: uppercase;
                        opacity: 0.9;
                    }
                    
                    .sp-control select,
                    .sp-control button {
                        padding: 6px 10px;
                        border-radius: 8px;
                        border: 2px solid rgba(255,255,255,0.3);
                        background: rgba(255,255,255,0.95);
                        color: #333;
                        font-weight: 600;
                        font-size: 0.85rem;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    }
                    
                    .sp-control select:hover,
                    .sp-control button:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
                        background: white;
                    }
                    
                    .sp-hide-btn.hidden {
                        background: #ff6b6b;
                        color: white;
                    }
                    
                    .sp-delete-btn {
                        background: #ff4757;
                        color: white;
                        border-color: #ff4757;
                    }
                    
                    .sp-comment-section {
                        border-top: 1px solid rgba(255,255,255,0.2);
                        padding-top: 12px;
                        margin-top: 12px;
                    }
                    
                    .sp-comment-input {
                        width: 100%;
                        padding: 8px;
                        border-radius: 8px;
                        border: 2px solid rgba(255,255,255,0.3);
                        background: rgba(255,255,255,0.95);
                        color: #333;
                        font-size: 0.9rem;
                        margin-bottom: 8px;
                    }
                    
                    .sp-comment-btn {
                        padding: 8px 16px;
                        background: #4CAF50;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        font-weight: bold;
                        cursor: pointer;
                    }
                    
                    @media (max-width: 768px) {
                        .sp-controls-grid {
                            grid-template-columns: 1fr;
                        }
                    }
                    </style>
                    
                    <script>
                    // Enhance existing superpower controls
                    function enhanceSuperpowerControls() {
                        if (!window.isSuperpowerMode || !window.isAuthenticated) return;
                        
                        // Find all existing superpower action sections
                        const superpowerSections = document.querySelectorAll('.superpower-actions');
                        const issues = window.allIssues || [];
                        
                        superpowerSections.forEach((section, index) => {
                            if (index >= issues.length) return;
                            if (section.querySelector('.sp-enhanced')) return; // Already enhanced
                            
                            const issue = issues[index];
                            
                            // Replace the existing buttons with our enhanced controls
                            section.innerHTML = \`
                                <div class="sp-enhanced">
                                <div style="font-weight: bold; margin-bottom: 12px; text-align: center;">
                                    ⚡ SUPERPOWER ACTIONS
                                </div>
                                <div class="sp-controls-grid">
                                    <div class="sp-control">
                                        <label>Status:</label>
                                        <select class="sp-status" data-issue-id="\${issue.id}" onchange="updateIssueField('\${issue.id}', 'status', this.value)">
                                            <option value="new" \${issue.content_data.status === 'new' ? 'selected' : ''}>New</option>
                                            <option value="reformulated" \${issue.content_data.status === 'reformulated' ? 'selected' : ''}>Reformulated</option>
                                            <option value="fixing" \${issue.content_data.status === 'fixing' ? 'selected' : ''}>Fixing</option>
                                            <option value="pr-creating" \${issue.content_data.status === 'pr-creating' ? 'selected' : ''}>PR Creating</option>
                                            <option value="pr-created" \${issue.content_data.status === 'pr-created' ? 'selected' : ''}>PR Created</option>
                                            <option value="fix-failed" \${issue.content_data.status === 'fix-failed' ? 'selected' : ''}>Fix Failed</option>
                                            <option value="needs_info" \${issue.content_data.status === 'needs_info' ? 'selected' : ''}>Needs Info</option>
                                            <option value="answered" \${issue.content_data.status === 'answered' ? 'selected' : ''}>Answered</option>
                                            <option value="closed" \${issue.content_data.status === 'closed' ? 'selected' : ''}>Closed</option>
                                        </select>
                                    </div>
                                    
                                    <div class="sp-control">
                                        <label>Priority:</label>
                                        <select class="sp-priority" data-issue-id="\${issue.id}" onchange="updateIssueField('\${issue.id}', 'priority', this.value)">
                                            <option value="" \${!issue.content_data.priority ? 'selected' : ''}>None</option>
                                            <option value="critical" \${issue.content_data.priority === 'critical' ? 'selected' : ''}>🔴 Critical</option>
                                            <option value="high" \${issue.content_data.priority === 'high' ? 'selected' : ''}>🟠 High</option>
                                            <option value="medium" \${issue.content_data.priority === 'medium' ? 'selected' : ''}>🟡 Medium</option>
                                            <option value="low" \${issue.content_data.priority === 'low' ? 'selected' : ''}>🟢 Low</option>
                                        </select>
                                    </div>
                                    
                                    <div class="sp-control">
                                        <label>Visibility:</label>
                                        <button class="sp-hide-btn \${issue.content_data.hidden ? 'hidden' : ''}" 
                                                onclick="updateIssueField('\${issue.id}', 'hidden', \${!issue.content_data.hidden})">
                                            \${issue.content_data.hidden ? '👁️ Unhide' : '🚫 Hide'}
                                        </button>
                                    </div>
                                    
                                    <div class="sp-control">
                                        <label>Remove:</label>
                                        <button class="sp-delete-btn" onclick="deleteIssue('\${issue.id}')">
                                            🗑️ Delete
                                        </button>
                                    </div>
                                </div>
                                
                                <div class="sp-comment-section">
                                    <label style="font-size: 0.9rem; font-weight: 600;">Admin Comment:</label>
                                    <input type="text" class="sp-comment-input" 
                                           id="comment-\${issue.id}"
                                           placeholder="Add admin comment..." />
                                    <button class="sp-comment-btn" onclick="addAdminComment('\${issue.id}')">
                                        💬 Add Comment
                                    </button>
                                </div>
                                </div>
                            \`;
                        });
                    }
                    
                    // Hook into the display function
                    const originalDisplayIssues = window.displayIssues;
                    if (originalDisplayIssues) {
                        window.displayIssues = function(issuesToDisplay) {
                            originalDisplayIssues.call(this, issuesToDisplay);
                            setTimeout(enhanceSuperpowerControls, 100);
                        };
                    }
                    
                    // Hook into loadIssues
                    const originalLoadIssues = window.loadIssues;
                    if (originalLoadIssues) {
                        window.loadIssues = async function() {
                            await originalLoadIssues.call(this);
                            setTimeout(enhanceSuperpowerControls, 500);
                        };
                    }
                    
                    // Also try on page load
                    window.addEventListener('load', function() {
                        setTimeout(enhanceSuperpowerControls, 2000);
                        // Also add a manual trigger
                        window.enhanceControls = enhanceSuperpowerControls;
                    });
                    
                    // Admin functions
                    window.updateIssueField = async function(issueId, field, value) {
                        try {
                            const response = await fetch('/api/wtaf/issue-tracker-admin', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    action: 'updateField',
                                    issueId,
                                    field,
                                    value
                                })
                            });
                            
                            if (response.ok) {
                                // Show success and reload
                                alert(field + ' updated successfully!');
                                location.reload();
                            } else {
                                alert('Failed to update ' + field);
                            }
                        } catch (error) {
                            console.error('Error updating field:', error);
                            alert('Error updating field');
                        }
                    };
                    
                    window.deleteIssue = async function(issueId) {
                        if (!confirm('Are you sure you want to delete this issue?')) return;
                        
                        try {
                            const response = await fetch('/api/wtaf/issue-tracker-admin', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    action: 'delete',
                                    issueId
                                })
                            });
                            
                            if (response.ok) {
                                alert('Issue deleted!');
                                location.reload();
                            }
                        } catch (error) {
                            console.error('Error deleting issue:', error);
                        }
                    };
                    
                    window.addAdminComment = async function(issueId) {
                        const commentInput = document.getElementById('comment-' + issueId);
                        const comment = commentInput.value.trim();
                        
                        if (!comment) {
                            alert('Please enter a comment');
                            return;
                        }
                        
                        try {
                            const response = await fetch('/api/wtaf/issue-tracker-admin', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    action: 'addComment',
                                    issueId,
                                    comment
                                })
                            });
                            
                            if (response.ok) {
                                alert('Comment added!');
                                commentInput.value = '';
                                location.reload();
                            }
                        } catch (error) {
                            console.error('Error adding comment:', error);
                        }
                    };
                    </script>
                `;
                
                // Inject the enhancements right before </head>
                html = html.replace('</head>', superpowerEnhancements + '</head>');
                
                // Mark issue items for the renderIssue function to find
                html = html.replace(/class="issue-item"/g, 'class="issue-item"')
                    .replace(/<\/div>(\s*<!-- issue-item -->)?/g, (match: string) => {
                        if (match.includes('<!-- issue-item -->')) {
                            return match;
                        }
                        return '</div><!-- issue-item -->';
                    });
            }
        }
        if (searchParams.get('superpower') === 'true') {
            // Inject a script that reads from localStorage instead of waiting for postMessage
            const authScript = `
                <script>
                // Direct localStorage auth for superpower mode testing
                (function() {
                    console.log('🔑 Direct auth mode - reading from localStorage');
                    
                    // Check localStorage immediately
                    const token = localStorage.getItem('webtoysAuthToken');
                    const apiUrl = localStorage.getItem('webtoysApiUrl');
                    
                    if (token && apiUrl) {
                        console.log('🔑 Found auth in localStorage');
                        window.SUPERPOWER_AUTH = {
                            isAuthenticated: true,
                            authToken: token,
                            apiUrl: apiUrl,
                            pending: false
                        };
                        
                        // Trigger auth event
                        window.dispatchEvent(new CustomEvent('superpowerAuthReceived', {
                            detail: window.SUPERPOWER_AUTH
                        }));
                    } else {
                        console.log('🔑 No auth in localStorage - run test-superpower.html first');
                        window.SUPERPOWER_AUTH = {
                            isAuthenticated: false,
                            authToken: null,
                            apiUrl: null,
                            pending: false
                        };
                    }
                })();
                </script>
            `;
            
            // Inject right after <head> tag
            html = html.replace('<head>', '<head>' + authScript);
        }
        
        return new NextResponse(html, {
            status: 200,
            headers: {
                'Content-Type': 'text/html',
            },
        });
    } catch (error) {
        console.error('Error fetching content:', error);
        return new NextResponse('Internal server error', { status: 500 });
    }
}