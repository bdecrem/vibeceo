#!/usr/bin/env node

/**
 * Verify and ensure issue numbers are displayed properly in ToyBox Issue Tracker
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

async function verifyAndFixIssueNumbers() {
    try {
        console.log('🔍 Checking issue number display in ToyBox Issue Tracker...');
        
        // Fetch current Issue Tracker
        const { data, error } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        if (error) {
            console.error('❌ Failed to fetch Issue Tracker:', error);
            process.exit(1);
        }
        
        let html = data.html_content;
        
        // Backup current version
        const backupPath = path.join(__dirname, '..', 'backups', `issue-tracker_verify_${Date.now()}.html`);
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.writeFile(backupPath, html);
        console.log(`📁 Backup saved to: ${backupPath}`);
        
        // Check if issue numbers are already implemented
        const hasIssueNumbers = html.includes('issueNumber');
        const hasIssueNumberStyling = html.includes('.issue-number');
        const hasGetNextIssueNumber = html.includes('getNextIssueNumber');
        
        console.log('\n📊 Current state:');
        console.log(`  • Issue number field in data: ${hasIssueNumbers ? '✅' : '❌'}`);
        console.log(`  • Issue number styling: ${hasIssueNumberStyling ? '✅' : '❌'}`);
        console.log(`  • Issue number generator: ${hasGetNextIssueNumber ? '✅' : '❌'}`);
        
        if (hasIssueNumbers && hasIssueNumberStyling && hasGetNextIssueNumber) {
            console.log('\n✅ Issue numbers are already implemented!');
            
            // Check if issue numbers are visible in the display
            const hasIssueNumberDisplay = html.includes('Issue #') || html.includes('#${data.issueNumber') || html.includes('#${issueNum}');
            
            if (hasIssueNumberDisplay) {
                console.log('✅ Issue numbers are displayed in the UI');
            } else {
                console.log('⚠️  Issue numbers exist but may not be visible in the UI');
                console.log('📝 Checking display code...');
                
                // Extract the display function
                const displayMatch = html.match(/return\s+`[\s\S]*?<div class="issue-item">[\s\S]*?<\/div>\s*`;/);
                if (displayMatch) {
                    console.log('\n📋 Current display template found');
                    // Check if it includes issue number display
                    if (!displayMatch[0].includes('issueNumber') && !displayMatch[0].includes('issueNum')) {
                        console.log('❌ Issue numbers not shown in display template');
                        console.log('🔧 Adding issue number display...');
                        
                        // Update display to include issue numbers
                        let needsUpdate = false;
                        
                        // First check if we need to update the display template
                        if (!html.includes('Issue #${')) {
                            html = html.replace(
                                /<span class="issue-number">#\${data\.issueNumber \|\| '\?'}<\/span>/g,
                                `<span class="issue-number">Issue #\${data.issueNumber || '?'}</span>`
                            );
                            needsUpdate = true;
                        }
                        
                        if (needsUpdate) {
                            // Update in Supabase
                            const { error: updateError } = await supabase
                                .from('wtaf_content')
                                .update({
                                    html_content: html,
                                    updated_at: new Date().toISOString()
                                })
                                .eq('user_slug', 'public')
                                .eq('app_slug', 'toybox-issue-tracker');
                            
                            if (updateError) {
                                console.error('❌ Failed to update:', updateError);
                            } else {
                                console.log('✅ Issue number display updated!');
                            }
                        }
                    }
                }
            }
            
            // Also check existing issues in the database
            console.log('\n📊 Checking existing issues in database...');
            const { data: zadData } = await supabase
                .from('wtaf_zero_admin_collaborative')
                .select('content_data')
                .eq('app_id', 'toybox-issue-tracker')
                .eq('data_type', 'update_request')
                .order('created_at', { ascending: false })
                .limit(5);
            
            if (zadData && zadData.length > 0) {
                console.log(`\nFound ${zadData.length} recent issues:`);
                zadData.forEach(item => {
                    const issue = item.content_data;
                    const issueNum = issue.issueNumber || 'N/A';
                    console.log(`  • Issue #${issueNum}: ${issue.actionType} - ${issue.target}`);
                });
            } else {
                console.log('No existing issues found in database');
            }
            
        } else {
            console.log('\n❌ Issue numbers not fully implemented');
            console.log('🔧 Run the following scripts to add issue numbers:');
            console.log('  1. node scripts/add-issue-numbers.js');
            console.log('  2. node scripts/enhance-issue-numbers.js');
        }
        
        console.log('\n🌐 View the Issue Tracker at:');
        console.log('  • https://webtoys.ai/public/toybox-issue-tracker');
        console.log('  • http://localhost:3000/public/toybox-issue-tracker (local)');
        
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
}

verifyAndFixIssueNumbers();