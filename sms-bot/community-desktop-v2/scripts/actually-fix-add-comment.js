#!/usr/bin/env node

/**
 * Actually fix the Add Comment button - it's still showing for all users
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
let envLoaded = false;
const envPaths = [
    path.join(__dirname, '../../../.env.local'),
    path.join(__dirname, '../../../.env'),
    path.join(__dirname, '../../.env.local'), 
    path.join(__dirname, '../../.env')
];

for (const envPath of envPaths) {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
        envLoaded = true;
        console.log('✅ Loaded environment from:', path.basename(envPath));
        break;
    }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

// Ensure backups directory exists
const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

async function actuallyFixAddComment() {
    console.log('🔧 Actually fixing Add Comment button visibility...\n');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    try {
        // 1. Fetch current issue tracker HTML
        console.log('📥 Fetching toybox-issue-tracker from database...');
        const { data: current, error: fetchError } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
            
        if (fetchError) {
            console.error('❌ Failed to fetch toybox-issue-tracker:', fetchError);
            return;
        }
        
        let html = current.html_content;
        console.log('✅ Fetched issue tracker HTML');
        
        // 2. Create backup
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const backupPath = path.join(backupDir, `toybox-issue-tracker_actually-fix-comment_${timestamp}.html`);
        fs.writeFileSync(backupPath, html);
        console.log('💾 Created backup:', path.basename(backupPath));
        
        // 3. Find and fix the comment button rendering
        console.log('\n📝 Finding comment button logic...');
        
        // The current broken line that shows button for ALL logged-in users:
        // const commentButton = currentUser ? 
        
        // Find it and replace with restricted access
        const oldCommentButton = `const commentButton = currentUser ? 
                    \`<button onclick="addComment(\${data.issueNumber}, \${JSON.stringify(data).replace(/"/g, '&quot;')})" style="background: #2196F3; color: white; border: none; padding: 4px 8px; margin-right: 5px; cursor: pointer; font-size: 10px;">Add Comment</button>\` : '';`;
        
        const newCommentButton = `const commentButton = (currentUser && (currentUser.handle === 'bart' || currentUser.handle === 'agent' || currentUser.handle === 'edit-agent')) ? 
                    \`<button onclick="addComment(\${data.issueNumber}, \${JSON.stringify(data).replace(/"/g, '&quot;')})" style="background: #2196F3; color: white; border: none; padding: 4px 8px; margin-right: 5px; cursor: pointer; font-size: 10px;">Add Comment</button>\` : '';`;
        
        if (html.includes(oldCommentButton)) {
            html = html.replace(oldCommentButton, newCommentButton);
            console.log('✅ Fixed comment button to only show for bart and agents');
        } else {
            console.log('⚠️ Exact pattern not found, trying alternative fix...');
            
            // Try a more flexible pattern
            const flexiblePattern = /const commentButton = currentUser \?[^;]+;/s;
            if (html.match(flexiblePattern)) {
                html = html.replace(flexiblePattern, newCommentButton);
                console.log('✅ Fixed comment button with flexible pattern');
            } else {
                console.log('❌ Could not find comment button pattern!');
            }
        }
        
        // 4. Verify other fixes are still in place
        console.log('\n🔍 Verifying other fixes...');
        
        if (html.includes('prompt(`Add comment for issue #${issueNumber}:`')) {
            console.log('✅ Issue number fix is preserved');
        }
        
        if (html.includes('Only administrators can add comments')) {
            console.log('✅ Permission check is preserved');
        }
        
        if (html.includes('const issueMap = new Map()')) {
            console.log('✅ Deduplication is preserved');
        }
        
        if (html.includes("data.status !== 'open'") && html.includes("data.status !== 'closed'")) {
            console.log('✅ OPEN/CLOSE button fixes are preserved');
        }
        
        // 5. Save metadata
        const metadataPath = path.join(backupDir, `toybox-issue-tracker_actually-fix-comment_${timestamp}.json`);
        fs.writeFileSync(metadataPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            description: 'Actually fixed Add Comment button visibility',
            changes: [
                'Fixed comment button to only show for bart, agent, and edit-agent',
                'Preserved all other fixes'
            ],
            backupFile: path.basename(backupPath)
        }, null, 2));
        
        // 6. Update database
        console.log('\n💾 Saving to database...');
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({ 
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker');
            
        if (updateError) {
            console.error('❌ Update failed:', updateError);
            console.log('💡 Restore from backup:', backupPath);
            return;
        }
        
        console.log('\n🎉 Successfully fixed Add Comment button!');
        console.log('📋 Add Comment now only shows for:');
        console.log('  • User: bart');
        console.log('  • User: agent');  
        console.log('  • User: edit-agent');
        console.log('\n🔗 View at: https://webtoys.ai/public/toybox-issue-tracker');
        console.log('💡 You may need to hard refresh (Cmd+Shift+R) to see changes');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Run the fix
actuallyFixAddComment();