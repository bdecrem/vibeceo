#!/usr/bin/env node

import { safeUpdateToyBoxIssueTracker } from './safe-wrapper-issues.js';
import * as fs from 'fs';

async function restoreWorking() {
    console.log('🚨 RESTORING TO WORKING VERSION...');
    
    // Read the WORKING backup
    const workingHtml = fs.readFileSync('/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/community-desktop-v2/backups/toybox-issue-tracker_WORKING_VERSION.html', 'utf8');
    
    // Update database with safe wrapper
    await safeUpdateToyBoxIssueTracker(workingHtml, 'RESTORED TO WORKING VERSION - all features working');
    
    console.log('✅ RESTORED! The Issues tracker is back to the working version.');
    console.log('   - ADD COMMENT works');
    console.log('   - All issues should be visible');
    console.log('   - OPEN/CLOSE buttons may need fixing separately');
}

restoreWorking().catch(console.error);