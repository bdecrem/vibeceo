#!/usr/bin/env node

/**
 * Fix the issue counter logic to properly increment issue numbers
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

async function fixIssueCounterLogic() {
    try {
        console.log('🔧 Fixing issue counter logic...');
        
        // Fetch current Issue Tracker
        const { data } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        let html = data.html_content;
        
        // Backup
        const backupPath = path.join(__dirname, '..', 'backups', `issue-tracker_before_counter_fix_${Date.now()}.html`);
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.writeFile(backupPath, html);
        console.log(`📁 Backup saved to: ${backupPath}`);
        
        // Fix the getNextIssueNumber function to properly handle counter persistence
        const oldFunction = `async function getNextIssueNumber() {
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
        }`;
        
        const newFunction = `async function getNextIssueNumber() {
            // Load all existing issues to find the highest number
            const existingIssues = await load('update_request');
            let nextNumber = 1;
            
            if (existingIssues && existingIssues.length > 0) {
                // Find the highest issue number from existing issues
                const highestNumber = existingIssues.reduce((max, issue) => {
                    const num = issue.content_data.issueNumber || 0;
                    return num > max ? num : max;
                }, 0);
                nextNumber = highestNumber + 1;
            }
            
            // Also check the counter for consistency
            const counterData = await load('issue_counter');
            if (counterData && counterData.length > 0) {
                const lastSaved = counterData[0].lastNumber || 0;
                if (lastSaved >= nextNumber) {
                    nextNumber = lastSaved + 1;
                }
            }
            
            // Save the new counter value
            await save('issue_counter', { lastNumber: nextNumber });
            
            return nextNumber;
        }`;
        
        if (html.includes(oldFunction)) {
            html = html.replace(oldFunction, newFunction);
            console.log('✅ Updated getNextIssueNumber function');
        } else {
            // Try a more flexible replacement
            const regex = /async function getNextIssueNumber\(\) {[\s\S]*?return nextNumber;\s*}/;
            if (regex.test(html)) {
                html = html.replace(regex, newFunction);
                console.log('✅ Updated getNextIssueNumber function (regex match)');
            } else {
                console.log('⚠️  Could not find getNextIssueNumber function to update');
            }
        }
        
        // Also update the display of the last issue info to show correct count
        const oldInfoUpdate = `document.getElementById('lastIssueInfo').textContent = \`Total Issues: \${lastIssue.issueNumber} | Next: #\${lastIssue.issueNumber + 1}\`;`;
        const newInfoUpdate = `const highestNum = sorted.reduce((max, issue) => {
                    const num = issue.content_data.issueNumber || 0;
                    return num > max ? num : max;
                }, 0);
                document.getElementById('lastIssueInfo').textContent = \`Total Issues: \${sorted.length} | Last: #\${highestNum} | Next: #\${highestNum + 1}\`;`;
        
        if (html.includes(oldInfoUpdate)) {
            html = html.replace(oldInfoUpdate, newInfoUpdate);
            console.log('✅ Updated issue info display');
        } else {
            // Try to find and update the updateLastIssueInfo function
            const infoRegex = /document\.getElementById\('lastIssueInfo'\)\.textContent = [^;]+;/;
            const match = html.match(infoRegex);
            if (match) {
                html = html.replace(match[0], newInfoUpdate);
                console.log('✅ Updated issue info display (regex match)');
            }
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
        
        console.log('\n✅ Issue counter logic fixed!');
        console.log('\n🎯 What was fixed:');
        console.log('  • Counter now checks existing issues for highest number');
        console.log('  • Prevents duplicate issue numbers');
        console.log('  • Shows accurate total count and next number');
        console.log('  • Handles both new and existing issues correctly');
        console.log('\n🔄 Reload Issue Tracker - new issues will increment properly!');
        console.log('  • https://webtoys.ai/public/toybox-issue-tracker');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

fixIssueCounterLogic();