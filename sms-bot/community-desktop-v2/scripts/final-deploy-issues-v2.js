#!/usr/bin/env node

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import readline from 'readline';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function askQuestion(question) {
    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            resolve(answer);
        });
    });
}

async function finalDeployIssuesV2() {
    console.log('🚀 FINAL DEPLOYMENT: Issues Tracker v2 Design\n');
    console.log('═══════════════════════════════════════════════\n');
    
    // Show backup location prominently
    console.log('📦 BACKUP LOCATIONS:');
    console.log('   Primary: /Users/bartdecrem/Documents/code/vibeceo8/sms-bot/community-desktop-v2/backups/toybox-issue-tracker_latest-backup-before-v2.html');
    console.log('   Timestamped: /Users/bartdecrem/Documents/code/vibeceo8/sms-bot/community-desktop-v2/backups/toybox-issue-tracker_2025-08-27T21-27-27_before_v2_redesign.html');
    
    console.log('\n🔄 RESTORE COMMAND (if needed):');
    console.log('   node scripts/restore-issues-app.js "/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/community-desktop-v2/backups/toybox-issue-tracker_latest-backup-before-v2.html"');
    
    console.log('\n📋 This deployment will:');
    console.log('   ✅ Apply modern v2 design');
    console.log('   ✅ Keep ALL JavaScript functionality');
    console.log('   ✅ Preserve admin features for user "bart"');
    console.log('   ✅ Maintain superpower mode (?superpower=true)');
    console.log('   ✅ Keep Edit Agent comment display');
    
    // Ask for confirmation
    console.log('\n⚠️  WARNING: This will update the LIVE Issues app in the database');
    const answer = await askQuestion('\n❓ Are you ready to deploy? (yes/no): ');
    
    if (answer.toLowerCase() !== 'yes') {
        console.log('\n❌ Deployment cancelled');
        rl.close();
        return;
    }
    
    // Load the merged file
    console.log('\n📂 Loading merged file...');
    const mergedPath = path.join(__dirname, '..', 'issues-v2-corrected.html');
    
    if (!fs.existsSync(mergedPath)) {
        console.error('❌ Merged file not found. Run smart-merge-issues-v2.js first');
        rl.close();
        return;
    }
    
    const mergedHTML = fs.readFileSync(mergedPath, 'utf-8');
    console.log('   ✅ Merged file loaded (' + mergedHTML.length + ' characters)');
    
    // Deploy to database
    console.log('\n🚀 Deploying to database...');
    
    const { error: updateError } = await supabase
        .from('wtaf_content')
        .update({ 
            html_content: mergedHTML,
            updated_at: new Date().toISOString()
        })
        .eq('user_slug', 'public')
        .eq('app_slug', 'toybox-issue-tracker');
    
    if (updateError) {
        console.error('\n❌ DEPLOYMENT FAILED:', updateError);
        console.log('\n🔄 Run this to restore:');
        console.log('   node scripts/restore-issues-app.js "/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/community-desktop-v2/backups/toybox-issue-tracker_latest-backup-before-v2.html"');
        rl.close();
        return;
    }
    
    console.log('   ✅ Successfully deployed to database!');
    
    // Provide verification checklist
    console.log('\n✅ DEPLOYMENT SUCCESSFUL!\n');
    console.log('═══════════════════════════════════════════════\n');
    console.log('🔍 CRITICAL VERIFICATION CHECKLIST:\n');
    console.log('1. Open: https://webtoys.ai/public/toybox-issue-tracker');
    console.log('2. Test as regular user:');
    console.log('   □ Submit a new issue');
    console.log('   □ View existing issues');
    console.log('   □ See Edit Agent comments on completed issues');
    console.log('\n3. Test as admin (user "bart"):');
    console.log('   □ Add ?superpower=true to URL');
    console.log('   □ Verify "SUPERPOWER MODE" badge appears');
    console.log('   □ Can reopen closed issues');
    console.log('   □ Can change issue priority');
    console.log('   □ Can add admin comments');
    console.log('   □ Can hide/unhide issues');
    console.log('   □ Can delete issues');
    console.log('\n4. Verify Edit Agent integration:');
    console.log('   □ Check issues #29, #30, #31 for Edit Agent comments');
    console.log('   □ Comments show with blue styling');
    
    console.log('\n🆘 IF ANYTHING IS BROKEN:');
    console.log('   node scripts/restore-issues-app.js "/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/community-desktop-v2/backups/toybox-issue-tracker_latest-backup-before-v2.html"');
    
    console.log('\n✅ Deployment complete!');
    rl.close();
}

finalDeployIssuesV2().catch(error => {
    console.error('Error:', error);
    rl.close();
});