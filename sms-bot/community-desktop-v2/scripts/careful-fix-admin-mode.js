#!/usr/bin/env node

/**
 * Carefully fix admin mode for bart - add ToyBox auth AND set variables properly
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

async function carefullyFixAdmin() {
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
        
        console.log('🔍 Adding ToyBox authentication for bart...\n');
        
        // Step 1: Add ToyBox user variable and auth function after APP_ID
        const appIdLine = "window.APP_ID = '5b98f08a-60c7-48cd-bd1c-fb4bad3615ae';";
        const appIdIndex = html.indexOf(appIdLine);
        
        if (appIdIndex === -1) {
            console.error('❌ Could not find APP_ID');
            return;
        }
        
        // Add ToyBox authentication code
        const toyboxAuthCode = `
        
        // ToyBox OS User (for bart admin detection)
        let currentToyBoxUser = null;
        
        // Check if bart is logged in to ToyBox OS
        function checkToyBoxUser() {
            try {
                const savedUser = localStorage.getItem('toybox_user');
                if (savedUser) {
                    currentToyBoxUser = JSON.parse(savedUser);
                    console.log('ToyBox user detected:', currentToyBoxUser?.handle);
                    
                    // If bart, activate admin mode immediately
                    if (currentToyBoxUser?.handle === 'bart') {
                        isInSuperpowerMode = true;
                        isAuthenticated = true;
                        console.log('✅ Admin mode activated for bart');
                        return true;
                    }
                }
            } catch (e) {
                console.error('Error checking ToyBox user:', e);
            }
            return false;
        }`;
        
        // Only add if not already there
        if (!html.includes('currentToyBoxUser')) {
            const insertPoint = appIdIndex + appIdLine.length;
            html = html.substring(0, insertPoint) + toyboxAuthCode + html.substring(insertPoint);
            console.log('✅ Added ToyBox user detection');
        }
        
        // Step 2: Update checkExtensionAuth to check bart FIRST
        const checkAuthFunc = 'async function checkExtensionAuth()';
        const checkAuthIndex = html.indexOf(checkAuthFunc);
        
        if (checkAuthIndex > -1) {
            // Find the opening brace
            const braceIndex = html.indexOf('{', checkAuthIndex);
            
            // Add bart check at the very beginning
            const bartCheck = `
            // First, check if bart is logged in to ToyBox OS
            if (checkToyBoxUser()) {
                console.log('✅ Admin access granted: bart is logged in to ToyBox OS');
                isInSuperpowerMode = true;
                isAuthenticated = true;
                return true;
            }
            `;
            
            // Only add if not already there
            if (!html.includes('checkToyBoxUser()')) {
                html = html.substring(0, braceIndex + 1) + bartCheck + html.substring(braceIndex + 1);
                console.log('✅ Added bart check to checkExtensionAuth');
            }
        }
        
        // Step 3: Call checkToyBoxUser on page load
        const domLoadIndex = html.indexOf("document.addEventListener('DOMContentLoaded'");
        if (domLoadIndex > -1) {
            const funcStart = html.indexOf('{', domLoadIndex);
            
            // Find where checkExtensionAuth is called
            const checkExtAuthCall = html.indexOf('checkExtensionAuth()', domLoadIndex);
            if (checkExtAuthCall > -1) {
                // Add checkToyBoxUser before it
                const beforeCheck = `
            // Check ToyBox user first
            checkToyBoxUser();
            
            // Then check extension auth`;
                
                // Only add if not already there
                if (!html.includes('// Check ToyBox user first')) {
                    html = html.substring(0, checkExtAuthCall) + beforeCheck + '\n            ' + html.substring(checkExtAuthCall);
                    console.log('✅ Added ToyBox check on page load');
                }
            }
        }
        
        // Step 4: Add message listener for auth updates
        const scriptEndIndex = html.lastIndexOf('</script>');
        if (scriptEndIndex > -1 && !html.includes('TOYBOX_AUTH')) {
            const listener = `
        
        // Listen for ToyBox OS auth updates
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'TOYBOX_AUTH') {
                try {
                    if (event.data.user) {
                        currentToyBoxUser = event.data.user;
                        console.log('ToyBox auth update:', currentToyBoxUser?.handle);
                        
                        // If bart just logged in, activate admin mode and reload
                        if (currentToyBoxUser.handle === 'bart') {
                            isInSuperpowerMode = true;
                            isAuthenticated = true;
                            console.log('✅ bart logged in - admin mode activated');
                            
                            if (typeof loadIssues === 'function') {
                                loadIssues();
                            }
                        }
                    } else {
                        currentToyBoxUser = null;
                        // Only disable if not using URL parameter
                        const urlParams = new URLSearchParams(window.location.search);
                        if (urlParams.get('superpower') !== 'true') {
                            isInSuperpowerMode = false;
                            isAuthenticated = false;
                        }
                    }
                } catch (e) {
                    console.error('Error handling auth update:', e);
                }
            }
        });`;
            
            html = html.substring(0, scriptEndIndex) + listener + html.substring(scriptEndIndex);
            console.log('✅ Added message listener for auth updates');
        }
        
        // Step 5: Add debug display to see what's happening
        const h1End = html.indexOf('</h1>');
        if (h1End > -1 && !html.includes('toybox-user-display')) {
            const debugDisplay = `</h1>
        
        <!-- ToyBox User Debug Display -->
        <div id="toybox-user-display" style="
            background: #333;
            color: #fff;
            padding: 10px 20px;
            margin: 10px 0;
            border-radius: 5px;
            font-family: monospace;
            font-size: 14px;
        ">
            <strong>Debug:</strong> 
            <span id="user-status">Checking auth...</span>
        </div>
        
        <script>
        function updateDebugDisplay() {
            const status = document.getElementById('user-status');
            if (currentToyBoxUser) {
                const isAdmin = currentToyBoxUser.handle === 'bart';
                status.innerHTML = 
                    'User: <span style="color: #0f0;">' + currentToyBoxUser.handle + '</span>' +
                    (isAdmin ? ' <span style="color: gold;">[ADMIN]</span>' : '') +
                    ' | isInSuperpowerMode: <span style="color: ' + (isInSuperpowerMode ? '#0f0' : '#f00') + ';">' + isInSuperpowerMode + '</span>' +
                    ' | isAuthenticated: <span style="color: ' + (isAuthenticated ? '#0f0' : '#f00') + ';">' + isAuthenticated + '</span>';
            } else {
                status.innerHTML = '<span style="color: #f00;">Not logged into ToyBox OS</span> | URL param: ' + (new URLSearchParams(window.location.search).get('superpower') === 'true' ? 'YES' : 'NO');
            }
        }
        
        // Update display when page loads and when auth changes
        setTimeout(updateDebugDisplay, 100);
        setInterval(updateDebugDisplay, 1000);
        </script>`;
            
            html = html.replace('</h1>', debugDisplay);
            console.log('✅ Added debug display');
        }
        
        console.log('\n💾 Saving with ToyBox authentication...');
        
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
        
        console.log('✅ Successfully added ToyBox authentication!\n');
        console.log('📋 What was added:');
        console.log('1. checkToyBoxUser() function that SETS admin variables');
        console.log('2. Checks bart FIRST in checkExtensionAuth()');
        console.log('3. Message listener for live auth updates');
        console.log('4. Debug display showing auth state');
        console.log('5. Both auth methods work (bart OR ?superpower=true)\n');
        console.log('🔗 Test at: https://webtoys.ai/public/webtoysos-issue-tracker');
        console.log('   Debug display will show if variables are set correctly');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

carefullyFixAdmin();