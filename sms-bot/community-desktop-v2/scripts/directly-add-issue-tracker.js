#!/usr/bin/env node

/**
 * Directly add webtoysos-issue-tracker to ToyBox OS
 * More straightforward approach
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
let result = dotenv.config({ path: '../../.env.local' });
if (result.error) {
    result = dotenv.config({ path: '../../.env' });
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

async function addIssueTracker() {
    try {
        console.log('📥 Fetching current ToyBox OS...');
        
        const { data, error } = await supabase
            .from('wtaf_content')
            .select('*')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os')
            .single();
        
        if (error || !data) {
            console.error('❌ Error fetching ToyBox OS:', error?.message);
            return;
        }
        
        let html = data.html_content;
        
        // Create backup first
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const backupPath = path.join(backupDir, `toybox-os_${timestamp}.html`);
        fs.writeFileSync(backupPath, html);
        console.log(`💾 Backup created: ${backupPath}`);
        
        // Check if already added
        if (html.includes("'webtoysos-issue-tracker'")) {
            console.log('⚠️ webtoysos-issue-tracker already exists, skipping...');
            return;
        }
        
        console.log('🔍 Adding to windowedApps registry...');
        
        // Find the windowedApps closing brace
        const windowedAppsStart = html.indexOf('windowedApps = {');
        const windowedAppsEnd = html.indexOf('};', windowedAppsStart);
        
        if (windowedAppsStart === -1 || windowedAppsEnd === -1) {
            console.error('❌ Could not find windowedApps');
            return;
        }
        
        // Add our app entry
        const newEntry = `,
            'webtoysos-issue-tracker': {
                name: 'Issue Tracker (Bart)',
                url: '/public/webtoysos-issue-tracker',
                icon: '🔧',
                width: 900,
                height: 700
            }`;
        
        // Insert before the closing brace
        html = html.substring(0, windowedAppsEnd) + newEntry + '\n        ' + html.substring(windowedAppsEnd);
        
        console.log('🎯 Adding desktop icon...');
        
        // Find the Community Notepad icon and add after it
        const notepadIcon = `onclick="openWindowedApp('community-notepad')"`;
        const notepadIndex = html.indexOf(notepadIcon);
        
        if (notepadIndex > -1) {
            // Find the closing div of the notepad icon
            let divCount = 0;
            let i = notepadIndex;
            while (i < html.length && divCount >= 0) {
                if (html.substring(i, i + 4) === '<div') divCount++;
                if (html.substring(i, i + 6) === '</div>') divCount--;
                if (divCount === -2) break; // Found the closing div of the desktop-icon
                i++;
            }
            
            const iconHtml = `
            
            <div class="desktop-icon" onclick="openWindowedApp('webtoysos-issue-tracker')">
                <div class="icon">🔧</div>
                <div class="label">Issue Tracker</div>
            </div>`;
            
            // Insert after the notepad icon
            html = html.substring(0, i + 6) + iconHtml + html.substring(i + 6);
        } else {
            console.log('⚠️ Could not find Community Notepad icon, adding at end of icons');
            
            // Find any desktop-icon and add after
            const anyIcon = html.indexOf('class="desktop-icon"');
            if (anyIcon > -1) {
                // Similar logic to find closing div
                let divCount = 0;
                let i = anyIcon;
                while (i < html.length && divCount >= 0) {
                    if (html.substring(i, i + 4) === '<div') divCount++;
                    if (html.substring(i, i + 6) === '</div>') divCount--;
                    if (divCount === -1) break;
                    i++;
                }
                
                const iconHtml = `
            
            <div class="desktop-icon" onclick="openWindowedApp('webtoysos-issue-tracker')">
                <div class="icon">🔧</div>
                <div class="label">Issue Tracker</div>
            </div>`;
                
                html = html.substring(0, i + 6) + iconHtml + html.substring(i + 6);
            }
        }
        
        console.log('💾 Saving to Supabase...');
        
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({ 
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os');
        
        if (updateError) {
            console.error('❌ Error updating ToyBox OS:', updateError.message);
            return;
        }
        
        // Also save locally
        fs.writeFileSync(path.join(backupDir, 'toybox-os_latest-backup.html'), html);
        
        console.log('✅ Successfully added Issue Tracker to ToyBox OS!');
        console.log('');
        console.log('📌 Issue Tracker is now available:');
        console.log('   - Icon: 🔧 Issue Tracker');
        console.log('   - Opens in 900x700 window');
        console.log('   - URL: /public/webtoysos-issue-tracker');
        console.log('');
        console.log('🎉 Test it at: https://webtoys.ai/public/toybox-os');
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

addIssueTracker();