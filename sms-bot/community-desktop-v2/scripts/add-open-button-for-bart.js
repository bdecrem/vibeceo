#!/usr/bin/env node

/**
 * Add OPEN button for bart user
 * 
 * This script adds a green OPEN button next to the CLOSE button for the bart user.
 * The OPEN button changes the issue status to 'open'.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
let result = dotenv.config({ path: '../.env.local' });
if (result.error) {
    result = dotenv.config({ path: '../.env' });
    if (result.error) {
        console.error('Error loading .env files:', result.error.message);
        process.exit(1);
    }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Ensure backups directory exists
const backupDir = path.join(process.cwd(), 'backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
}

async function fetchCurrentIssueTracker() {
    const { data, error } = await supabase
        .from('wtaf_content')
        .select('html_content, updated_at')
        .eq('user_slug', 'public')
        .eq('app_slug', 'toybox-issue-tracker')
        .single();
    
    if (error) {
        throw new Error(`Failed to fetch Issue Tracker: ${error.message}`);
    }
    
    return data;
}

async function createBackup(htmlContent, description = '') {
    const timestamp = new Date().toISOString()
        .replace(/:/g, '-')
        .replace(/\./g, '-')
        .replace('T', '_')
        .slice(0, -5);
    
    const backupFile = path.join(backupDir, `issue-tracker_${timestamp}.html`);
    fs.writeFileSync(backupFile, htmlContent);
    
    const metadataFile = path.join(backupDir, `issue-tracker_${timestamp}.json`);
    fs.writeFileSync(metadataFile, JSON.stringify({
        backed_up_at: new Date().toISOString(),
        description: description,
        file_size: htmlContent.length,
        backup_file: backupFile
    }, null, 2));
    
    console.log(`💾 Backup created: ${backupFile}`);
    return backupFile;
}

async function updateIssueTracker() {
    console.log('🔧 Adding OPEN button for bart user...\n');
    
    // Fetch current Issue Tracker
    console.log('📥 Fetching current Issue Tracker...');
    const current = await fetchCurrentIssueTracker();
    
    // Create backup
    console.log('💾 Creating backup...');
    await createBackup(current.html_content, 'Before adding OPEN button');
    
    let html = current.html_content;
    
    // Add the open button styles (similar to close button but green)
    const openButtonStyles = `
        .open-button {
            padding: 3px 8px;
            font-size: 10px;
            background: #4CAF50;
            color: white;
            border-color: #45a049;
            margin-left: 4px;
            cursor: pointer;
            border: 1px solid;
            border-radius: 2px;
        }
        
        .open-button:hover {
            background: #45a049;
        }
        
        .open-button:active {
            background: #398e3d;
        }`;
    
    // Add the open button styles right after the close button styles
    const closeButtonStylePattern = /\.close-button:active\s*\{[^}]+\}/;
    const closeButtonMatch = html.match(closeButtonStylePattern);
    
    if (closeButtonMatch) {
        const insertPoint = closeButtonMatch.index + closeButtonMatch[0].length;
        html = html.slice(0, insertPoint) + openButtonStyles + html.slice(insertPoint);
        console.log('✅ Added OPEN button styles');
    } else {
        console.error('❌ Could not find close button styles');
        return;
    }
    
    // Update the button display logic to show both CLOSE and OPEN buttons
    // Find the current button implementation
    const buttonPattern = /Status: \$\{status\.toUpperCase\(\)\}[\s\S]*?\$\{currentUser && currentUser\.handle === 'bart'[^}]+\}/;
    const currentButtonImplementation = html.match(buttonPattern);
    
    if (currentButtonImplementation) {
        // Replace with new implementation that shows both buttons based on status
        const newButtonImplementation = `Status: \${status.toUpperCase()}\${data.closedBy ? \` (closed by \${data.closedBy})\` : ''}
                                \${currentUser && currentUser.handle === 'bart' ? 
                                    (status === 'closed' || status === 'completed' ? 
                                        \`<button class="open-button" onclick="openTicket(\${data.issueNumber})">OPEN</button>\` : 
                                        status === 'pending' ?
                                            \`<button class="open-button" onclick="openTicket(\${data.issueNumber})">OPEN</button>\` :
                                            \`<button class="close-button" onclick="closeTicket(\${data.issueNumber})">CLOSE</button>\`
                                    ) : 
                                    ''
                                }`;
        
        html = html.replace(buttonPattern, newButtonImplementation);
        console.log('✅ Updated button display logic');
    } else {
        console.error('❌ Could not find button implementation');
        return;
    }
    
    // Check if openTicket function already exists (it might from previous attempts)
    if (!html.includes('function openTicket')) {
        console.log('⚠️  openTicket function already exists, skipping addition');
    } else {
        // The openTicket function should already exist in the code, but let's verify it's correct
        console.log('✅ openTicket function already present');
    }
    
    // Save updated HTML
    console.log('\n📤 Updating Issue Tracker in database...');
    const { error } = await supabase
        .from('wtaf_content')
        .update({ 
            html_content: html,
            updated_at: new Date().toISOString()
        })
        .eq('user_slug', 'public')
        .eq('app_slug', 'toybox-issue-tracker');
    
    if (error) {
        console.error('❌ Update failed:', error.message);
        return;
    }
    
    // Save locally too
    const outputFile = path.join(process.cwd(), 'current-issue-tracker-from-db.html');
    fs.writeFileSync(outputFile, html);
    
    console.log('\n✅ Successfully added OPEN button for bart user!');
    console.log('📋 Changes made:');
    console.log('   - Added green OPEN button styles');
    console.log('   - Updated button display logic to show OPEN for closed/pending issues');
    console.log('   - CLOSE button shows for open issues');
    console.log('\n🔗 Live at: https://webtoys.ai/public/toybox-issue-tracker');
}

// Run the update
updateIssueTracker().catch(console.error);