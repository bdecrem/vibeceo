#!/usr/bin/env node

/**
 * Fix issue number display - ensure ticket numbers are visible for each issue
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });
if (!process.env.SUPABASE_URL) {
    dotenv.config({ path: path.join(__dirname, '../../.env') });
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function fixIssueNumberDisplay() {
    try {
        console.log('🔧 Fixing issue number display in ToyBox Issue Tracker...');
        
        // Fetch current Issue Tracker
        const { data } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        let html = data.html_content;
        
        // Backup
        const backupPath = path.join(__dirname, '..', 'backups', `issue-tracker_before_fix_display_${Date.now()}.html`);
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.writeFile(backupPath, html);
        console.log(`📁 Backup saved to: ${backupPath}`);
        
        // Find and replace the issue display template
        // Current template doesn't show issue numbers
        const currentTemplate = `return \`
                        <div class="issue-item">
                            <div class="issue-header">
                                <span class="issue-type type-\${data.actionType}">\${data.actionType}</span>
                                <span style="font-size: 12px; color: #666;">\${dateStr}</span>
                            </div>
                            <div style="font-weight: 600; margin-bottom: 4px;">\${data.target}</div>
                            <div class="issue-description">\${data.description}</div>
                            <div class="issue-status status-\${data.status || 'pending'}">
                                Status: \${data.status || 'pending'}
                            </div>
                        </div>
                    \`;`;
        
        // New template with issue numbers prominently displayed
        const newTemplate = `return \`
                        <div class="issue-item">
                            <div class="issue-header">
                                <div style="display: flex; align-items: center;">
                                    <span class="issue-number">#\${data.issueNumber || '?'}</span>
                                    <span class="issue-type type-\${data.actionType}">\${data.actionType}</span>
                                </div>
                                <span style="font-size: 12px; color: #666;">\${dateStr}</span>
                            </div>
                            <div style="font-weight: 600; margin-bottom: 4px;">\${data.target}</div>
                            <div class="issue-description">\${data.description}</div>
                            <div class="issue-status status-\${data.status || 'pending'}">
                                Status: \${data.status || 'pending'}
                            </div>
                        </div>
                    \`;`;
        
        // Replace the template
        if (html.includes(currentTemplate)) {
            html = html.replace(currentTemplate, newTemplate);
            console.log('✅ Updated issue display template');
        } else {
            console.log('⚠️  Template not found in expected format, trying alternative approach...');
            
            // Try a more flexible pattern matching
            const regex = /return\s+`\s*<div class="issue-item">[\s\S]*?<\/div>\s*`;/g;
            const matches = html.match(regex);
            
            if (matches && matches.length > 0) {
                // Check if issue numbers are already displayed
                if (!matches[0].includes('issueNumber')) {
                    console.log('📝 Found template without issue numbers, updating...');
                    
                    // Replace with new template that includes issue numbers
                    html = html.replace(regex, newTemplate);
                    console.log('✅ Template updated with issue numbers');
                } else {
                    console.log('✅ Issue numbers already in template');
                }
            }
        }
        
        // Also add issue number to the close button if it exists
        if (html.includes('closeTicket') && !html.includes('Close #')) {
            html = html.replace(
                /<button onclick="closeTicket\(([^)]+)\)">Close<\/button>/g,
                `<button onclick="closeTicket($1)">Close #\${$1}</button>`
            );
            console.log('✅ Updated close button to show issue number');
        }
        
        // Make sure issue number styling is prominent
        if (!html.includes('background: linear-gradient(135deg, #667eea')) {
            // Update issue number styling if it's not the enhanced version
            html = html.replace(
                /\.issue-number\s*{[^}]*}/,
                `.issue-number {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 4px 10px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 700;
            margin-right: 10px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }`
            );
            console.log('✅ Enhanced issue number styling');
        }
        
        // Update in Supabase
        const { error } = await supabase
            .from('wtaf_content')
            .update({
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker');
        
        if (error) throw error;
        
        console.log('\n✅ Issue number display fixed!');
        console.log('\n🎯 What was fixed:');
        console.log('  • Issue numbers (#1, #2, etc.) now visible in issue list');
        console.log('  • Prominent gradient-colored badge for each issue number');
        console.log('  • Issue numbers displayed before the action type');
        console.log('  • Enhanced visual hierarchy');
        console.log('\n🔄 Reload Issue Tracker to see the ticket numbers!');
        console.log('  • https://webtoys.ai/public/toybox-issue-tracker');
        console.log('  • http://localhost:3000/public/toybox-issue-tracker');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

fixIssueNumberDisplay();