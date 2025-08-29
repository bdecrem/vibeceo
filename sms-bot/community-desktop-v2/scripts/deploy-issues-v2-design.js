#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function deployIssuesV2() {
    console.log('📦 Starting Issues Tracker v2 Design Deployment...\n');
    
    // Step 1: Fetch current app to extract JavaScript
    console.log('1️⃣ Fetching current Issues app from database...');
    const { data: currentApp, error: fetchError } = await supabase
        .from('wtaf_content')
        .select('*')
        .eq('user_slug', 'public')
        .eq('app_slug', 'toybox-issue-tracker')
        .single();
    
    if (fetchError || !currentApp) {
        console.error('❌ Error fetching current app:', fetchError);
        return;
    }
    console.log('   ✅ Current app fetched');
    
    // Step 2: Read the v2 design mockup
    console.log('\n2️⃣ Reading v2 design mockup...');
    const v2Path = path.join(__dirname, '..', 'mockups', 'issues-redesign-v2.html');
    const v2Design = fs.readFileSync(v2Path, 'utf-8');
    console.log('   ✅ V2 design loaded');
    
    // Step 3: Read the current app to preserve JavaScript
    console.log('\n3️⃣ Reading backup to extract admin functionality...');
    const backupPath = path.join(__dirname, '..', 'backups', 'toybox-issue-tracker_latest-backup-before-v2.html');
    const currentHTML = fs.readFileSync(backupPath, 'utf-8');
    console.log('   ✅ Current functionality extracted');
    
    // Step 4: Merge - extract all the JavaScript from current app
    console.log('\n4️⃣ Merging v2 design with current functionality...');
    
    // Extract the critical JavaScript functions from current app
    const scriptMatch = currentHTML.match(/<script[^>]*>([\s\S]*?)<\/script>/gi);
    let preservedScripts = '';
    
    if (scriptMatch) {
        // Get all script content
        scriptMatch.forEach(script => {
            const content = script.replace(/<\/?script[^>]*>/gi, '');
            preservedScripts += content + '\n';
        });
    }
    
    // Extract critical variables and functions we MUST preserve
    const criticalPatterns = [
        /window\.APP_ID[^;]*;/,
        /let\s+currentUser[^;]*;/,
        /const\s+urlParams[^;]*;/,
        /const\s+isSuperpower[^;]*;/,
        /async function save\([^}]*\}[\s\S]*?\n\}/,
        /async function load\([^}]*\}[\s\S]*?\n\}/,
        /async function loadIssues\([^}]*\}[\s\S]*?\n\}/,
        /async function submitIssue\([^}]*\}[\s\S]*?\n\}/,
        /function renderIssue\([^}]*\}[\s\S]*?\n\}/,
        /async function changeIssueStatus\([^}]*\}[\s\S]*?\n\}/,
        /async function changePriority\([^}]*\}[\s\S]*?\n\}/,
        /async function toggleHideIssue\([^}]*\}[\s\S]*?\n\}/,
        /async function deleteIssue\([^}]*\}[\s\S]*?\n\}/,
        /async function addAdminComment\([^}]*\}[\s\S]*?\n\}/,
        /window\.addEventListener\('message'[^}]*\}/
    ];
    
    // Build the merged HTML with v2 design + preserved functionality
    let mergedHTML = v2Design;
    
    // Replace the mock JavaScript in v2 with real preserved JavaScript
    mergedHTML = mergedHTML.replace(
        /<script[^>]*>[\s\S]*?<\/script>/gi,
        '<script>\n' + preservedScripts + '\n</script>'
    );
    
    // Save the merged version for review
    const mergedPath = path.join(__dirname, '..', 'backups', 'issues-v2-merged.html');
    fs.writeFileSync(mergedPath, mergedHTML);
    console.log('   ✅ Merged version created');
    console.log(`   📁 Review at: ${mergedPath}`);
    
    // Step 5: Confirm before deployment
    console.log('\n5️⃣ Ready to deploy to database');
    console.log('   ⚠️  BACKUP LOCATION: /Users/bartdecrem/Documents/code/vibeceo8/sms-bot/community-desktop-v2/backups/toybox-issue-tracker_latest-backup-before-v2.html');
    console.log('\n   Press Ctrl+C to cancel, or wait 5 seconds to continue...');
    
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Step 6: Deploy to database
    console.log('\n6️⃣ Deploying to database...');
    
    const { error: updateError } = await supabase
        .from('wtaf_content')
        .update({ 
            html_content: mergedHTML,
            updated_at: new Date().toISOString()
        })
        .eq('user_slug', 'public')
        .eq('app_slug', 'toybox-issue-tracker');
    
    if (updateError) {
        console.error('❌ Deployment failed:', updateError);
        console.log('\n🔄 To restore, run:');
        console.log('   node scripts/restore-issues-app.js "/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/community-desktop-v2/backups/toybox-issue-tracker_latest-backup-before-v2.html"');
        return;
    }
    
    console.log('   ✅ Successfully deployed!');
    
    // Step 7: Provide verification steps
    console.log('\n✅ DEPLOYMENT COMPLETE!\n');
    console.log('📋 Please verify these critical features:');
    console.log('   1. Go to: https://webtoys.ai/public/toybox-issue-tracker');
    console.log('   2. Add ?superpower=true to URL if you are user "bart"');
    console.log('   3. Check that you can:');
    console.log('      - Submit new issues');
    console.log('      - View existing issues');
    console.log('      - See Edit Agent comments');
    console.log('      - (As admin) Reopen/close issues');
    console.log('      - (As admin) Add comments');
    console.log('      - (As admin) Change priority');
    console.log('\n🔄 If anything is broken, restore immediately:');
    console.log('   node scripts/restore-issues-app.js "/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/community-desktop-v2/backups/toybox-issue-tracker_latest-backup-before-v2.html"');
}

deployIssuesV2().catch(console.error);