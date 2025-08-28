#!/usr/bin/env node

/**
 * Apply button layout fix to Issues Tracker
 */

import { safeUpdateToyBoxIssueTracker } from './safe-wrapper-issues.js';
import * as fs from 'fs';

async function applyFix() {
    console.log('🔧 Applying button layout fix...');
    
    // Read the fixed HTML file
    const fixedHtmlPath = '/Users/bartdecrem/Documents/code/vibeceo8/sms-bot/community-desktop-v2/backups/toybox-issue-tracker_2025-08-27T22-47-33_simple_fix_open_clos.html';
    const fixedHtml = fs.readFileSync(fixedHtmlPath, 'utf8');
    
    // Update database
    await safeUpdateToyBoxIssueTracker(
        fixedHtml, 
        'Fix button layout: OPEN/CLOSE after status, ADD COMMENT far right, working addCommentSimple function'
    );
    
    console.log('✅ Button layout fix applied!');
    console.log('   - OPEN button appears immediately after "Status: CLOSED" when status is not "open"');
    console.log('   - CLOSE button appears after OPEN button when status is not "closed" or "completed"');
    console.log('   - ADD COMMENT button appears far right using float: right');
    console.log('   - addCommentSimple function is now working');
}

applyFix().catch(console.error);