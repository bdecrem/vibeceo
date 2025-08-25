#!/usr/bin/env node

/**
 * Enhance issue number display - make them more prominent
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

async function enhanceIssueNumbers() {
    try {
        console.log('🔢 Enhancing issue number display...');
        
        // Fetch current Issue Tracker
        const { data } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        let html = data.html_content;
        
        // Backup
        const backupPath = path.join(__dirname, '..', 'backups', `issue-tracker_before_number_enhance_${Date.now()}.html`);
        await fs.writeFile(backupPath, html);
        
        // Make issue numbers bigger and more prominent
        html = html.replace(
            `.issue-number {
            background: #333;
            color: white;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 600;
            margin-right: 8px;
        }`,
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
        
        // Update the title of recent updates section
        html = html.replace(
            `<h3 style="margin-bottom: 15px;">Recent Updates</h3>`,
            `<h3 style="margin-bottom: 15px;">📋 Recent Issues</h3>`
        );
        
        // Add a counter display in the header
        html = html.replace(
            `<div id="lastIssueInfo" style="margin-top: 10px; font-size: 12px; opacity: 0.9;"></div>`,
            `<div id="lastIssueInfo" style="margin-top: 10px; font-size: 14px; opacity: 0.95; font-weight: 500;"></div>`
        );
        
        // Update the display format to be clearer
        html = html.replace(
            `document.getElementById('lastIssueInfo').textContent = \\\`Last issue: #\\\${lastIssue.issueNumber}\\\`;`,
            `document.getElementById('lastIssueInfo').textContent = \\\`Total Issues: \\\${lastIssue.issueNumber} | Next: #\\\${lastIssue.issueNumber + 1}\\\`;`
        );
        
        // Make the issue display more structured
        html = html.replace(
            `return \\\`
                        <div class="issue-item">
                            <div class="issue-header">
                                <div>
                                    <span class="issue-number">#\\\${data.issueNumber || '?'}</span>
                                    <span class="issue-type type-\\\${data.actionType}">\\\${data.actionType}</span>
                                </div>
                                <span style="font-size: 12px; color: #666;">\\\${dateStr}</span>
                            </div>
                            <div style="font-weight: 600; margin-bottom: 4px;">\\\${data.target}</div>
                            <div class="issue-description">\\\${data.description}</div>
                            <div class="issue-status status-\\\${data.status || 'pending'}">
                                Status: \\\${data.status || 'pending'}
                            </div>
                        </div>
                    \\\`;`,
            `const issueNum = data.issueNumber || '?';
                    const priorityIcon = data.priority === 'critical' ? '🔴' : 
                                       data.priority === 'high' ? '🟠' : 
                                       data.priority === 'medium' ? '🟡' : '🟢';
                    
                    return \\\`
                        <div class="issue-item">
                            <div class="issue-header">
                                <div style="display: flex; align-items: center;">
                                    <span class="issue-number">Issue #\\\${issueNum}</span>
                                    <span class="issue-type type-\\\${data.actionType}">\\\${data.actionType}</span>
                                    <span style="margin-left: 8px;">\\\${priorityIcon}</span>
                                </div>
                                <span style="font-size: 12px; color: #666;">\\\${dateStr}</span>
                            </div>
                            <div style="font-weight: 600; margin-bottom: 4px; margin-left: 4px;">
                                📦 \\\${data.target}
                            </div>
                            <div class="issue-description" style="margin-left: 4px;">
                                💬 \\\${data.description}
                            </div>
                            <div class="issue-status status-\\\${data.status || 'pending'}" style="margin-left: 4px;">
                                Status: \\\${data.status || 'pending'}
                            </div>
                        </div>
                    \\\`;`
        );
        
        // Add priority colors to the form for clarity
        html = html.replace(
            `<option value="low">Low - Nice to have</option>
                        <option value="medium" selected>Medium - Should be done soon</option>
                        <option value="high">High - Breaking something</option>
                        <option value="critical">Critical - System unusable</option>`,
            `<option value="low">🟢 Low - Nice to have</option>
                        <option value="medium" selected>🟡 Medium - Should be done soon</option>
                        <option value="high">🟠 High - Breaking something</option>
                        <option value="critical">🔴 Critical - System unusable</option>`
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
        
        console.log('✅ Issue numbers enhanced!');
        console.log('\n🔢 Improvements:');
        console.log('  • Larger, gradient-colored issue numbers');
        console.log('  • Shows "Issue #1" format clearly');
        console.log('  • Priority indicators (🔴🟠🟡🟢)');
        console.log('  • Better visual hierarchy with icons');
        console.log('  • Total issue count in header');
        console.log('\n🔄 Reload Issue Tracker to see enhanced numbers!');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

enhanceIssueNumbers();