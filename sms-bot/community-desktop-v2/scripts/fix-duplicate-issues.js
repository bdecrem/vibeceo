import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: '../.env' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function fixDuplicateIssues() {
  try {
    // Get current app
    const { data: app, error } = await supabase
      .from('wtaf_content')
      .select('*')
      .eq('user_slug', 'public')
      .eq('app_slug', 'toybox-issue-tracker')
      .single();
    
    if (error) {
      console.error('Error fetching app:', error);
      return;
    }
    
    console.log('Fetched app:', app.title);
    
    // Create backup with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `../backups/toybox-issue-tracker_pre-duplicate-fix_${timestamp}.html`;
    fs.writeFileSync(backupFile, app.html_content);
    console.log(`Created backup: ${backupFile}`);
    
    // Apply the enhanced deduplication fix
    let fixedHtml = app.html_content;
    
    // 1. Replace the loadRecentUpdates function with improved deduplication
    const improvedLoadFunction = `async function loadRecentUpdates() {
            const updates = await load('update_request');
            const container = document.getElementById('issuesContainer');
            
            if (updates && updates.length > 0) {
                // ENHANCED DEDUPLICATION: Handle multiple records per issue properly
                const issueMap = new Map();
                
                console.log(\`Loading \${updates.length} total records from ZAD...\`);
                
                // Process each record and keep only the MOST RECENT version of each issue
                updates.forEach((update, index) => {
                    if (update.content_data && update.content_data.issueNumber) {
                        const issueNumber = update.content_data.issueNumber;
                        const updateTime = new Date(update.updated_at || update.created_at);
                        
                        // If we already have this issue number, compare timestamps
                        if (issueMap.has(issueNumber)) {
                            const existingUpdate = issueMap.get(issueNumber);
                            const existingTime = new Date(existingUpdate.updated_at || existingUpdate.created_at);
                            
                            // Keep the newer record
                            if (updateTime > existingTime) {
                                console.log(\`Issue #\${issueNumber}: Replacing older record with newer one\`);
                                issueMap.set(issueNumber, update);
                            } else {
                                console.log(\`Issue #\${issueNumber}: Keeping existing newer record\`);
                            }
                        } else {
                            // First time seeing this issue number
                            console.log(\`Issue #\${issueNumber}: First record found\`);
                            issueMap.set(issueNumber, update);
                        }
                    } else {
                        console.warn(\`Record \${index} missing issueNumber:\`, update);
                    }
                });
                
                // Convert to array and sort by issue number descending  
                const uniqueIssues = Array.from(issueMap.values())
                    .sort((a, b) => (b.content_data.issueNumber || 0) - (a.content_data.issueNumber || 0));
                
                console.log(\`✅ Deduplication complete: \${updates.length} records → \${uniqueIssues.length} unique issues\`);
                console.log(\`Issue numbers found: [\${Array.from(issueMap.keys()).sort((a,b) => b-a).join(', ')}]\`);
                
                allIssues = uniqueIssues; // Store for filtering
                
                container.innerHTML = uniqueIssues.map(update => {
                    const data = update.content_data;
                    const date = new Date(data.timestamp);
                    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
                    const submitter = data.submittedBy || 'anonymous';
                    const isAnonymous = submitter === 'anonymous';
                    const status = data.status || 'pending';
                    const isClosed = status === 'closed';
                    
                    return \`
                        <div class="issue-item \${isClosed ? 'closed' : ''}" data-status="\${status}">
                            <div class="issue-header">
                                <div class="issue-meta">
                                    <span class="issue-number">#\${data.issueNumber || '?'}</span>
                                    <span class="issue-type type-\${data.actionType}">\${data.actionType.toUpperCase()}</span>
                                    <span class="issue-submitter \${isAnonymous ? 'anonymous' : ''}">\${submitter}</span>
                                </div>
                                <div style="font-size: 7px; color: #808080;">\${dateStr}</div>
                            </div>
                            <div style="font-weight: bold; margin-bottom: 2px; font-size: 8px;">\${data.target}</div>
                            <div class="issue-description">\${data.description}</div>
                            \${data.admin_comments && data.admin_comments.length > 0 ? 
                                '<div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #e0e0e0; font-size: 11px;"><strong>Comments:</strong>' + 
                                data.admin_comments.map(c => '<div style="margin-top: 5px; padding: 5px; background: #f5f5f5; border-radius: 3px;"><strong>' + (c.author || 'unknown') + ':</strong> ' + c.text + '<br><span style="font-size: 9px; color: #666;">' + new Date(c.timestamp).toLocaleString() + '</span></div>').join('') + 
                                '</div>' : ''
                            }
                            <div class="issue-status status-\${status}" style="margin-top: 10px; position: relative;">
                                Status: \${status.toUpperCase()}
                                \${currentUser && currentUser.handle === 'bart' ? 
                                    \`\${status !== 'open' ? '<button class="open-button" onclick="openTicket(' + data.issueNumber + ')" style="margin-left: 5px;">OPEN</button>' : ''}
                                    \${(status !== 'closed' && status !== 'completed') ? '<button class="close-button" onclick="closeTicket(' + data.issueNumber + ')" style="margin-left: 5px;">CLOSE</button>' : ''}
                                    <button class="comment-button" onclick="addCommentSimple(' + data.issueNumber + ')" style="float: right; background: #2196F3; color: white; border: none; padding: 4px 8px; border-radius: 3px; cursor: pointer;">ADD COMMENT</button>\` : 
                                    ''
                                }
                            </div>
                        </div>
                    \`;
                }).join('');
                
                // Apply current filter after loading
                filterIssues();
            } else {
                container.innerHTML = '<div style="font-size: 8px; color: #808080; font-style: italic;">No issues found.</div>';
            }
        }`;
    
    // Replace the function
    fixedHtml = fixedHtml.replace(
      /async function loadRecentUpdates\(\) \{[\s\S]*?\n        \}/,
      improvedLoadFunction
    );
    
    // 2. Remove the duplicate openTicket function (lines 639-662)
    fixedHtml = fixedHtml.replace(
      /        \/\/ Open ticket function \(change status from pending to open\)\s*\n        async function openTicket\(issueNumber\) \{[\s\S]*?\n        \}/,
      ''
    );
    
    // 3. Remove the duplicate loadRecentIssues() call
    fixedHtml = fixedHtml.replace(
      /loadRecentIssues\(\);/g,
      'loadRecentUpdates();'
    );
    
    console.log('Fixed HTML length:', fixedHtml.length);
    console.log('Original HTML length:', app.html_content.length);
    
    // Update the database
    const { error: updateError } = await supabase
      .from('wtaf_content')
      .update({
        html_content: fixedHtml,
        updated_at: new Date().toISOString()
      })
      .eq('user_slug', 'public')
      .eq('app_slug', 'toybox-issue-tracker');
    
    if (updateError) {
      console.error('Error updating app:', updateError);
      return;
    }
    
    console.log('✅ Successfully updated toybox-issue-tracker with duplicate fix!');
    console.log('✅ The app now properly deduplicates issues by keeping the most recent version of each issue number');
    console.log('✅ All functionality (OPEN/CLOSE buttons, Add Comment) should still work');
    console.log('✅ Visit https://webtoys.ai/public/toybox-issue-tracker to verify exactly 29 unique issues display');
    
  } catch (err) {
    console.error('Error:', err);
  }
}

fixDuplicateIssues();
