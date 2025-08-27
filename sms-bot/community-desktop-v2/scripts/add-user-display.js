#!/usr/bin/env node

/**
 * Add user display to show who's logged into ToyBox OS
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

async function addUserDisplay() {
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
        
        console.log('🔍 Adding user display for debugging...\n');
        
        // Step 1: Add HTML element right after the h1 title
        const h1End = html.indexOf('</h1>');
        if (h1End > -1) {
            const userDisplayHTML = `</h1>
        
        <!-- ToyBox User Display for Debugging -->
        <div id="toybox-user-display" style="
            background: #333;
            color: #fff;
            padding: 10px 20px;
            margin: 10px 0;
            border-radius: 5px;
            font-family: monospace;
            font-size: 14px;
        ">
            <strong>ToyBox User:</strong> <span id="toybox-user-info">Checking...</span>
        </div>`;
            
            html = html.replace('</h1>', userDisplayHTML);
            console.log('✅ Added user display HTML element');
        }
        
        // Step 2: Update the checkToyBoxUser function to update the display
        const checkUserFunc = 'function checkToyBoxUser()';
        const checkUserIndex = html.indexOf(checkUserFunc);
        
        if (checkUserIndex > -1) {
            // Find the function body
            const funcStart = html.indexOf('{', checkUserIndex);
            const funcEnd = html.indexOf('return false;', funcStart);
            
            // Add display update code before the return false
            const updateDisplayCode = `
            // Update display for debugging
            updateUserDisplay();
            `;
            
            html = html.substring(0, funcEnd) + updateDisplayCode + html.substring(funcEnd);
            console.log('✅ Added display update to checkToyBoxUser');
        }
        
        // Step 3: Add the updateUserDisplay function
        const scriptEndIndex = html.lastIndexOf('</script>');
        if (scriptEndIndex > -1) {
            const displayFunction = `
        
        // Update the user display for debugging
        function updateUserDisplay() {
            const displayElement = document.getElementById('toybox-user-info');
            if (!displayElement) return;
            
            if (currentToyBoxUser) {
                const isAdmin = currentToyBoxUser.handle === 'bart';
                displayElement.innerHTML = 
                    '<span style="color: #0f0;">✓ Logged in as: ' + currentToyBoxUser.handle + '</span>' +
                    (isAdmin ? ' <span style="color: gold;">[ADMIN]</span>' : '') +
                    '<br><small style="color: #888;">ID: ' + (currentToyBoxUser.id || 'unknown') + '</small>';
                
                // Also show auth status
                if (isAdmin) {
                    displayElement.innerHTML += '<br><span style="color: #0f0;">→ Admin mode should be active</span>';
                }
            } else {
                // Check localStorage directly for more debugging
                try {
                    const stored = localStorage.getItem('toybox_user');
                    if (stored) {
                        displayElement.innerHTML = '<span style="color: yellow;">⚠ Found in localStorage but not loaded: ' + stored.substring(0, 50) + '...</span>';
                    } else {
                        displayElement.innerHTML = '<span style="color: #f00;">✗ Not logged in</span> <small>(No toybox_user in localStorage)</small>';
                    }
                } catch (e) {
                    displayElement.innerHTML = '<span style="color: #f00;">✗ Error reading user data</span>';
                }
            }
        }
`;
            
            html = html.substring(0, scriptEndIndex) + displayFunction + html.substring(scriptEndIndex);
            console.log('✅ Added updateUserDisplay function');
        }
        
        // Step 4: Update the message listener to also update display
        const messageListenerIndex = html.indexOf("event.data.type === 'TOYBOX_AUTH'");
        if (messageListenerIndex > -1) {
            // Find where we set currentToyBoxUser
            const userSetIndex = html.indexOf('currentToyBoxUser = event.data.user;', messageListenerIndex);
            if (userSetIndex > -1) {
                const afterSet = userSetIndex + 'currentToyBoxUser = event.data.user;'.length;
                const updateCall = `
                        updateUserDisplay();`;
                
                html = html.substring(0, afterSet) + updateCall + html.substring(afterSet);
                console.log('✅ Added display update to message listener');
            }
        }
        
        // Step 5: Call updateUserDisplay on page load
        const domLoadIndex = html.indexOf("checkToyBoxUser();");
        if (domLoadIndex > -1) {
            const afterCheck = domLoadIndex + "checkToyBoxUser();".length;
            const updateCall = `
            updateUserDisplay();`;
            
            html = html.substring(0, afterCheck) + updateCall + html.substring(afterCheck);
            console.log('✅ Added display update on page load');
        }
        
        console.log('\n💾 Saving with user display...');
        
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
        
        console.log('✅ Successfully added user display!\n');
        console.log('📋 Debug Display Shows:');
        console.log('• Current ToyBox user (if logged in)');
        console.log('• Whether user is "bart" [ADMIN]');
        console.log('• localStorage status');
        console.log('• Admin mode activation status\n');
        console.log('🔗 Check it at: https://webtoys.ai/public/webtoysos-issue-tracker');
        console.log('   The black bar at the top will show login status!');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

addUserDisplay();