#!/usr/bin/env node

/**
 * Minimal, safe addition of ToyBox auth to webtoysos-issue-tracker
 * This approach won't break anything - it only adds to existing auth
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

async function addMinimalAuth() {
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
        
        console.log('🔍 Adding minimal ToyBox authentication...\n');
        
        // Step 1: Just add a simple currentUser variable after APP_ID
        const appIdLine = "window.APP_ID = '5b98f08a-60c7-48cd-bd1c-fb4bad3615ae';";
        const appIdIndex = html.indexOf(appIdLine);
        
        if (appIdIndex === -1) {
            console.error('❌ Could not find APP_ID');
            return;
        }
        
        // Only add if not already there
        if (!html.includes('currentToyBoxUser')) {
            const minimalAuth = `
        
        // ToyBox OS User Detection (minimal, non-breaking)
        let currentToyBoxUser = null;
        
        // Check if bart is logged in to ToyBox OS
        function checkToyBoxUser() {
            try {
                const savedUser = localStorage.getItem('toybox_user');
                if (savedUser) {
                    currentToyBoxUser = JSON.parse(savedUser);
                    console.log('ToyBox user detected:', currentToyBoxUser?.handle);
                    return currentToyBoxUser?.handle === 'bart';
                }
            } catch (e) {
                // Silently fail
            }
            return false;
        }
`;
            
            const insertPoint = appIdIndex + appIdLine.length;
            html = html.substring(0, insertPoint) + minimalAuth + html.substring(insertPoint);
            console.log('✅ Added ToyBox user detection');
        }
        
        // Step 2: Find the checkExtensionAuth function and ADD to it (don't replace)
        const checkAuthFunc = 'async function checkExtensionAuth()';
        const checkAuthIndex = html.indexOf(checkAuthFunc);
        
        if (checkAuthIndex > -1) {
            // Find the opening brace
            const braceIndex = html.indexOf('{', checkAuthIndex);
            
            // Add our check at the very beginning of the function
            const bartCheck = `
            // First, check if bart is logged in to ToyBox OS
            if (checkToyBoxUser()) {
                console.log('✅ Admin access granted: bart is logged in to ToyBox OS');
                return true;
            }
            
            // Original extension auth check continues below`;
            
            // Insert after the opening brace
            html = html.substring(0, braceIndex + 1) + bartCheck + html.substring(braceIndex + 1);
            console.log('✅ Added bart check to checkExtensionAuth');
        }
        
        // Step 3: Initialize on page load (add to existing DOMContentLoaded)
        const domLoadIndex = html.indexOf("document.addEventListener('DOMContentLoaded'");
        if (domLoadIndex > -1) {
            const funcStart = html.indexOf('{', domLoadIndex);
            
            // Add initialization at the start
            const initCode = `
            // Check ToyBox user on load
            checkToyBoxUser();
            `;
            
            html = html.substring(0, funcStart + 1) + initCode + html.substring(funcStart + 1);
            console.log('✅ Added initialization on page load');
        }
        
        // Step 4: Listen for auth updates from ToyBox OS (non-invasive)
        const scriptEndIndex = html.lastIndexOf('</script>');
        if (scriptEndIndex > -1) {
            const listener = `
        
        // Listen for ToyBox OS auth updates
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'TOYBOX_AUTH') {
                try {
                    if (event.data.user) {
                        currentToyBoxUser = event.data.user;
                        console.log('ToyBox auth update:', currentToyBoxUser?.handle);
                        
                        // If bart just logged in, reload to show admin controls
                        if (currentToyBoxUser.handle === 'bart') {
                            if (typeof loadIssues === 'function') {
                                loadIssues();
                            }
                        }
                    }
                } catch (e) {
                    // Silently fail
                }
            }
        });
`;
            
            html = html.substring(0, scriptEndIndex) + listener + html.substring(scriptEndIndex);
            console.log('✅ Added message listener for auth updates');
        }
        
        console.log('\n💾 Saving minimally modified app...');
        
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
        
        console.log('✅ Successfully added minimal ToyBox authentication!\n');
        console.log('📋 What was added (minimal, safe):');
        console.log('1. currentToyBoxUser variable to track ToyBox login');
        console.log('2. checkToyBoxUser() function that returns true if bart');
        console.log('3. Added bart check to START of checkExtensionAuth');
        console.log('4. Listener for auth updates from ToyBox OS');
        console.log('5. Original auth still works unchanged\n');
        console.log('🔗 Test at: https://webtoys.ai/public/toybox-os');
        console.log('   - Login as "bart" → Admin mode auto-enabled');
        console.log('   - OR use ?superpower=true → Still works!');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

addMinimalAuth();