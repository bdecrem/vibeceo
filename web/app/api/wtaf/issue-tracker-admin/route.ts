import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

const ISSUE_TRACKER_APP_ID = '83218c2e-281e-4265-a95f-1d3f763870d4';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { action, issueId, field, value, comment } = body;
        
        // Get the issue
        const { data: issues, error: fetchError } = await supabase
            .from('wtaf_zero_admin_collaborative')
            .select('*')
            .eq('app_id', ISSUE_TRACKER_APP_ID)
            .eq('action_type', 'issue')
            .eq('id', issueId)
            .single();
            
        if (fetchError || !issues) {
            return NextResponse.json({ error: 'Issue not found' }, { status: 404 });
        }
        
        const issue = issues;
        const contentData = issue.content_data || {};
        
        switch (action) {
            case 'updateField':
                // Update specific field (status, priority, hidden)
                contentData[field] = value;
                contentData.superpower_updated_at = new Date().toISOString();
                contentData.superpower_updated_by = 'admin';
                break;
                
            case 'addComment':
                // Add admin comment
                const comments = contentData.admin_comments || [];
                comments.push({
                    text: comment,
                    author: 'Admin',
                    authorRole: 'SUPERPOWER',
                    timestamp: new Date().toISOString()
                });
                contentData.admin_comments = comments;
                
                // If this is adding a comment and the issue was previously processed,
                // mark it for conversational response by setting it to admin_discussion status
                const wasProcessed = contentData.reformulated || contentData.ash_comment;
                if (wasProcessed && contentData.status !== 'closed') {
                    contentData.status = 'admin_discussion';
                    contentData.trigger_conversation = true;
                    contentData.conversation_triggered_at = new Date().toISOString();
                }
                break;
                
            case 'delete':
                // Mark as deleted
                contentData.deleted = true;
                contentData.deleted_at = new Date().toISOString();
                contentData.deleted_by = 'admin';
                break;
                
            default:
                return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
        }
        
        // Save updates
        const { error: updateError } = await supabase
            .from('wtaf_zero_admin_collaborative')
            .update({ content_data: contentData })
            .eq('id', issueId);
            
        if (updateError) {
            return NextResponse.json({ error: 'Failed to update issue' }, { status: 500 });
        }
        
        return NextResponse.json({ success: true, message: `Issue ${action} completed` });
        
    } catch (error) {
        console.error('Admin action error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// GET endpoint to retrieve admin panel HTML
export async function GET(request: NextRequest) {
    const adminPanelHTML = `
<!DOCTYPE html>
<html>
<head>
    <title>Issue Tracker Admin Panel</title>
    <style>
        body { font-family: system-ui; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; }
        h1 { color: #333; }
        .issue { background: white; padding: 20px; margin: 20px 0; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .controls { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-top: 15px; padding: 15px; background: #f0f0f0; border-radius: 8px; }
        select, button, textarea { padding: 8px; border-radius: 5px; border: 1px solid #ddd; }
        button { background: #4CAF50; color: white; cursor: pointer; }
        button:hover { background: #45a049; }
        .delete-btn { background: #f44336; }
        .delete-btn:hover { background: #da190b; }
        .hide-btn { background: #ff9800; }
        .hide-btn:hover { background: #e68900; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Issue Tracker Superpower Admin</h1>
        <p>Load this page to manage issues with full admin controls.</p>
        <div id="issues-container">Loading issues...</div>
    </div>
    
    <script>
        const APP_ID = '83218c2e-281e-4265-a95f-1d3f763870d4';
        
        async function loadIssues() {
            const response = await fetch(\`/api/zad/load?app_id=\${APP_ID}&action_type=issue\`);
            const issues = await response.json();
            
            const container = document.getElementById('issues-container');
            container.innerHTML = issues.map(issue => \`
                <div class="issue" data-issue-id="\${issue.id}">
                    <h3>\${issue.content_data.idea || 'No description'}</h3>
                    <p>Status: <strong>\${issue.content_data.status || 'new'}</strong></p>
                    <p>Priority: <strong>\${issue.content_data.priority || 'none'}</strong></p>
                    \${issue.content_data.hidden ? '<p>🚫 <strong>HIDDEN</strong></p>' : ''}
                    
                    <div class="controls">
                        <div>
                            <label>Status:</label>
                            <select onchange="updateField('\${issue.id}', 'status', this.value)">
                                <option value="new">New</option>
                                <option value="reformulated">Reformulated</option>
                                <option value="fixing">Fixing</option>
                                <option value="pr-creating">PR Creating</option>
                                <option value="pr-created">PR Created</option>
                                <option value="fix-failed">Fix Failed</option>
                                <option value="needs_info">Needs Info</option>
                                <option value="answered">Answered</option>
                                <option value="closed">Closed</option>
                            </select>
                        </div>
                        
                        <div>
                            <label>Priority:</label>
                            <select onchange="updateField('\${issue.id}', 'priority', this.value)">
                                <option value="">None</option>
                                <option value="critical">🔴 Critical</option>
                                <option value="high">🟠 High</option>
                                <option value="medium">🟡 Medium</option>
                                <option value="low">🟢 Low</option>
                            </select>
                        </div>
                        
                        <div>
                            <button class="hide-btn" onclick="updateField('\${issue.id}', 'hidden', \${!issue.content_data.hidden})">
                                \${issue.content_data.hidden ? '👁️ Unhide' : '🚫 Hide'}
                            </button>
                        </div>
                        
                        <div>
                            <button class="delete-btn" onclick="deleteIssue('\${issue.id}')">
                                🗑️ Delete
                            </button>
                        </div>
                    </div>
                    
                    <div style="margin-top: 15px;">
                        <textarea placeholder="Add admin comment..." id="comment-\${issue.id}"></textarea>
                        <button onclick="addComment('\${issue.id}')">Add Comment</button>
                    </div>
                </div>
            \`).join('');
        }
        
        async function updateField(issueId, field, value) {
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
                alert('Updated successfully!');
                loadIssues();
            }
        }
        
        async function addComment(issueId) {
            const comment = document.getElementById(\`comment-\${issueId}\`).value;
            if (!comment) return;
            
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
                loadIssues();
            }
        }
        
        async function deleteIssue(issueId) {
            if (!confirm('Are you sure you want to delete this issue?')) return;
            
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
                loadIssues();
            }
        }
        
        // Load issues on page load
        loadIssues();
    </script>
</body>
</html>
    `;
    
    return new NextResponse(adminPanelHTML, {
        headers: { 'Content-Type': 'text/html' }
    });
}