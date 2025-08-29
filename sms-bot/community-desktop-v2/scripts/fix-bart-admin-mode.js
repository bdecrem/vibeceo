#!/usr/bin/env node

/**
 * Fix admin mode activation when bart is logged in
 * The issue: bart is detected but isInSuperpowerMode isn't being set properly
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
let result = dotenv.config({ path: '../../.env.local' });
if (result.error) {
    result = dotenv.config({ path: '../../.env' });
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fixAdminMode() {
    try {
        console.log('📥 Fetching webtoysos-issue-tracker...\n');
        
        const { data, error } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'webtoysos-issue-tracker')
            .single();
        
        if (error || !data) {
            console.error('❌ Error:', error?.message);
            return;
        }
        
        let html = data.html_content;
        
        console.log('🔍 Fixing admin mode activation for bart...\n');
        
        // Step 1: Find where we update the display and also set admin mode there
        const updateDisplayFunc = 'function updateUserDisplay()';
        const updateDisplayIndex = html.indexOf(updateDisplayFunc);
        
        if (updateDisplayIndex > -1) {
            // Find the part where we detect bart
            const bartCheckInDisplay = html.indexOf("currentToyBoxUser.handle === 'bart'", updateDisplayIndex);
            if (bartCheckInDisplay > -1) {
                // Find the if block
                const ifStart = html.lastIndexOf('if (', bartCheckInDisplay);
                const blockStart = html.indexOf('{', ifStart);
                const blockEnd = html.indexOf('}', blockStart);
                
                // Get the current block content
                const currentBlock = html.substring(blockStart + 1, blockEnd);
                
                // Add admin mode activation to the block
                const newBlock = `
                const isAdmin = currentToyBoxUser.handle === 'bart';
                
                // ACTIVATE ADMIN MODE FOR BART
                if (isAdmin) {
                    isInSuperpowerMode = true;
                    isAuthenticated = true;
                    console.log('✅ Admin mode ACTIVATED for bart');
                }
                
                displayElement.innerHTML = 
                    '<span style="color: #0f0;">✓ Logged in as: ' + currentToyBoxUser.handle + '</span>' +
                    (isAdmin ? ' <span style="color: gold;">[ADMIN]</span>' : '') +
                    '<br><small style="color: #888;">ID: ' + (currentToyBoxUser.id || 'unknown') + '</small>';
                
                // Also show auth status
                if (isAdmin) {
                    displayElement.innerHTML += '<br><span style="color: #0f0;">→ Admin mode ACTIVE: ' + (isInSuperpowerMode ? 'YES' : 'NO') + '</span>';
                    // Force reload to show admin controls
                    if (typeof loadIssues === 'function') {
                        setTimeout(() => loadIssues(), 100);
                    }
                }`;
                
                html = html.substring(0, blockStart + 1) + newBlock + html.substring(blockEnd);
                console.log('✅ Added admin activation to updateUserDisplay');
            }
        }
        
        // Step 2: Update checkToyBoxUser to also set admin mode
        const checkUserFunc = 'function checkToyBoxUser()';
        const checkUserIndex = html.indexOf(checkUserFunc);
        
        if (checkUserIndex > -1) {
            // Find the return statement where we check for bart
            const bartReturnIndex = html.indexOf("currentToyBoxUser?.handle === 'bart'", checkUserIndex);
            if (bartReturnIndex > -1) {
                // Add setting before the return
                const returnLineStart = html.lastIndexOf('return', bartReturnIndex);
                
                const adminSetCode = `
            // Set admin mode for bart
            if (currentToyBoxUser?.handle === 'bart') {
                isInSuperpowerMode = true;
                isAuthenticated = true;
                console.log('✅ checkToyBoxUser: Admin mode set for bart');
            }
            
            // Update display for debugging
            updateUserDisplay();
            
            return `;
                
                html = html.substring(0, returnLineStart) + adminSetCode + html.substring(returnLineStart + 6);
                console.log('✅ Updated checkToyBoxUser to set admin mode');
            }
        }
        
        // Step 3: Update the message listener to set admin mode
        const messageListenerIndex = html.indexOf("event.data.type === 'TOYBOX_AUTH'");
        if (messageListenerIndex > -1) {
            const userSetIndex = html.indexOf('currentToyBoxUser = event.data.user;', messageListenerIndex);
            if (userSetIndex > -1) {
                const afterSet = userSetIndex + 'currentToyBoxUser = event.data.user;'.length;
                
                const adminCheckCode = `
                        
                        // Check if bart logged in and activate admin mode
                        if (currentToyBoxUser && currentToyBoxUser.handle === 'bart') {
                            isInSuperpowerMode = true;
                            isAuthenticated = true;
                            console.log('✅ Message listener: Admin mode activated for bart');
                            
                            // Reload issues to show admin controls
                            if (typeof loadIssues === 'function') {
                                setTimeout(() => loadIssues(), 100);
                            }
                        }
                        
                        updateUserDisplay();`;
                
                html = html.substring(0, afterSet) + adminCheckCode + html.substring(afterSet);
                console.log('✅ Updated message listener to activate admin');
            }
        }
        
        // Step 4: Make sure isInSuperpowerMode affects the display condition
        const adminControlsCheck = 'if (isInSuperpowerMode)';
        if (!html.includes(adminControlsCheck)) {
            // Find where admin controls are shown
            const superpowerControlsIndex = html.indexOf('superpower-controls');
            if (superpowerControlsIndex > -1) {
                // Find the condition before it
                const conditionStart = html.lastIndexOf('if (', superpowerControlsIndex);
                const conditionEnd = html.indexOf(')', conditionStart);
                const oldCondition = html.substring(conditionStart, conditionEnd + 1);
                
                console.log('Found condition:', oldCondition);
                
                // Make sure it checks isInSuperpowerMode
                if (!oldCondition.includes('isInSuperpowerMode')) {
                    const newCondition = 'if (isInSuperpowerMode)';
                    html = html.replace(oldCondition, newCondition);
                    console.log('✅ Fixed admin controls condition');
                }
            }
        }
        
        console.log('\n💾 Saving fixed version...');
        
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({ 
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'webtoysos-issue-tracker');
        
        if (updateError) {
            console.error('❌ Error updating:', updateError.message);
            return;
        }
        
        console.log('✅ Successfully fixed admin mode activation!\n');
        console.log('📋 What was fixed:');
        console.log('1. updateUserDisplay() now SETS isInSuperpowerMode = true for bart');
        console.log('2. checkToyBoxUser() now SETS the variables before returning');
        console.log('3. Message listener ACTIVATES admin mode when bart logs in');
        console.log('4. Auto-reloads issues to show admin controls\n');
        console.log('🔗 Test now at: https://webtoys.ai/public/webtoysos-issue-tracker');
        console.log('   The debug display should show "Admin mode ACTIVE: YES"');
        console.log('   And you should see the admin controls!');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

fixAdminMode();