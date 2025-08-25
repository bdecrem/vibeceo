#!/usr/bin/env node

/**
 * Add issue numbering system to ToyBox Issue Tracker
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

async function addIssueNumbers() {
    try {
        console.log('🔢 Adding issue numbering system...');
        
        // Fetch current Issue Tracker
        const { data } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        let html = data.html_content;
        
        // Backup
        const backupPath = path.join(__dirname, '..', 'backups', `issue-tracker_before_numbers_${Date.now()}.html`);
        await fs.writeFile(backupPath, html);
        
        // Add issue number styling
        html = html.replace(
            `.issue-header {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
        }`,
            `.issue-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
        }
        
        .issue-number {
            background: #333;
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            margin-right: 8px;
        }`
        );
        
        // Update the form submission to generate issue numbers
        html = html.replace(
            `const formData = {
                actionType: document.getElementById('actionType').value,
                target: document.getElementById('target').value,
                description: document.getElementById('description').value,
                priority: document.getElementById('priority').value,
                timestamp: new Date().toISOString(),
                status: 'pending'
            };`,
            `// Get next issue number
            const issueNumber = await getNextIssueNumber();
            
            const formData = {
                issueNumber: issueNumber,
                actionType: document.getElementById('actionType').value,
                target: document.getElementById('target').value,
                description: document.getElementById('description').value,
                priority: document.getElementById('priority').value,
                timestamp: new Date().toISOString(),
                status: 'pending'
            };`
        );
        
        // Add function to get next issue number
        html = html.replace(
            `// ZAD helper functions`,
            `// Get next issue number
        async function getNextIssueNumber() {
            // Load the counter from ZAD
            const counterData = await load('issue_counter');
            let nextNumber = 1;
            
            if (counterData && counterData.length > 0) {
                // Find the highest number
                const lastCounter = counterData[0].content_data;
                nextNumber = (lastCounter.lastNumber || 0) + 1;
            }
            
            // Save the new counter
            await save('issue_counter', { lastNumber: nextNumber });
            
            return nextNumber;
        }
        
        // ZAD helper functions`
        );
        
        // Update the success message to show issue number
        html = html.replace(
            `alert('✅ Update request saved! An agent will process this request and apply changes with automatic backups.');`,
            `alert(\`✅ Issue #\${issueNumber} created! An agent will process this request and apply changes with automatic backups.\`);`
        );
        
        // Update the console log to show issue number
        html = html.replace(
            `console.log('📋 New update request:', formData);`,
            `console.log(\`📋 Issue #\${issueNumber} created:\`, formData);`
        );
        
        // Update the display of recent issues
        html = html.replace(
            `return \\\`
                        <div class="issue-item">
                            <div class="issue-header">
                                <span class="issue-type type-\\\${data.actionType}">\\\${data.actionType}</span>
                                <span style="font-size: 12px; color: #666;">\\\${dateStr}</span>
                            </div>`,
            `return \\\`
                        <div class="issue-item">
                            <div class="issue-header">
                                <div>
                                    <span class="issue-number">#\\\${data.issueNumber || '?'}</span>
                                    <span class="issue-type type-\\\${data.actionType}">\\\${data.actionType}</span>
                                </div>
                                <span style="font-size: 12px; color: #666;">\\\${dateStr}</span>
                            </div>`
        );
        
        // Add issue number to the form header for feedback
        html = html.replace(
            `<div class="header">
            <h1>🚀 ToyBox OS Direct Updates</h1>
            <div class="subtitle">Submit fixes and updates that are applied immediately with automatic backups</div>
        </div>`,
            `<div class="header">
            <h1>🚀 ToyBox OS Direct Updates</h1>
            <div class="subtitle">Submit fixes and updates that are applied immediately with automatic backups</div>
            <div id="lastIssueInfo" style="margin-top: 10px; font-size: 12px; opacity: 0.9;"></div>
        </div>`
        );
        
        // Add function to show last issue number on load
        html = html.replace(
            `// Load on startup
        loadRecentUpdates();`,
            `// Load on startup
        loadRecentUpdates();
        
        // Show last issue info
        async function updateLastIssueInfo() {
            const updates = await load('update_request');
            if (updates && updates.length > 0) {
                const sorted = updates.sort((a, b) => (b.content_data.issueNumber || 0) - (a.content_data.issueNumber || 0));
                const lastIssue = sorted[0]?.content_data;
                if (lastIssue && lastIssue.issueNumber) {
                    document.getElementById('lastIssueInfo').textContent = \`Last issue: #\${lastIssue.issueNumber}\`;
                }
            }
        }
        updateLastIssueInfo();`
        );
        
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
        
        console.log('✅ Issue numbering system added!');
        console.log('\n🔢 Features:');
        console.log('  • Sequential issue numbers (#1, #2, #3...)');
        console.log('  • Numbers shown in success message');
        console.log('  • Numbers displayed in recent issues list');
        console.log('  • Last issue number shown in header');
        console.log('  • Persistent across sessions');
        console.log('\n🔄 Reload Issue Tracker to see issue numbers!');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

addIssueNumbers();