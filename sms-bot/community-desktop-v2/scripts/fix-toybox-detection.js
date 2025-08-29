#!/usr/bin/env node

/**
 * Fix ToyBox user detection - it's not reading localStorage properly
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

async function fixDetection() {
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
        
        console.log('🔍 Fixing ToyBox user detection...\n');
        
        // Find the checkToyBoxUser function
        const checkFuncStart = html.indexOf('function checkToyBoxUser()');
        if (checkFuncStart > -1) {
            const funcEnd = html.indexOf('return false;', checkFuncStart) + 'return false;'.length;
            const funcEndBrace = html.indexOf('}', funcEnd);
            
            // Replace with better detection
            const newFunction = `function checkToyBoxUser() {
            try {
                const savedUser = localStorage.getItem('toybox_user');
                console.log('Checking localStorage toybox_user:', savedUser);
                
                if (savedUser) {
                    currentToyBoxUser = JSON.parse(savedUser);
                    console.log('Parsed ToyBox user:', currentToyBoxUser);
                    
                    // If bart, activate admin mode immediately
                    if (currentToyBoxUser && currentToyBoxUser.handle === 'bart') {
                        console.log('🎯 BART DETECTED - Activating admin mode');
                        isInSuperpowerMode = true;
                        isAuthenticated = true;
                        return true;
                    }
                }
            } catch (e) {
                console.error('Error checking ToyBox user:', e);
            }
            return false;
        }`;
            
            const oldFunction = html.substring(checkFuncStart, funcEndBrace + 1);
            html = html.replace(oldFunction, newFunction);
            console.log('✅ Fixed checkToyBoxUser function');
        }
        
        // Update the debug display function to be more informative
        const updateDebugStart = html.indexOf('function updateDebugDisplay()');
        if (updateDebugStart > -1) {
            const funcEnd = html.indexOf('setInterval(updateDebugDisplay', updateDebugStart);
            
            const newDebugFunction = `function updateDebugDisplay() {
            const status = document.getElementById('user-status');
            if (!status) return;
            
            // Check localStorage directly
            const stored = localStorage.getItem('toybox_user');
            let parsedUser = null;
            try {
                if (stored) parsedUser = JSON.parse(stored);
            } catch (e) {}
            
            if (currentToyBoxUser) {
                const isAdmin = currentToyBoxUser.handle === 'bart';
                status.innerHTML = 
                    'User: <span style="color: #0f0;">' + currentToyBoxUser.handle + '</span>' +
                    (isAdmin ? ' <span style="color: gold;">[ADMIN]</span>' : '') +
                    ' | SuperPower: <span style="color: ' + (isInSuperpowerMode ? '#0f0' : '#f00') + ';">' + isInSuperpowerMode + '</span>' +
                    ' | Auth: <span style="color: ' + (isAuthenticated ? '#0f0' : '#f00') + ';">' + isAuthenticated + '</span>';
            } else if (parsedUser) {
                status.innerHTML = '<span style="color: yellow;">Found in localStorage but not loaded: ' + parsedUser.handle + '</span> - Reloading...';
                // Try to load it
                checkToyBoxUser();
                if (currentToyBoxUser) {
                    setTimeout(updateDebugDisplay, 100);
                }
            } else if (stored) {
                status.innerHTML = '<span style="color: yellow;">localStorage has data but can\\'t parse</span>';
            } else {
                status.innerHTML = '<span style="color: #f00;">Not logged into ToyBox OS</span> (no toybox_user in localStorage)';
            }
        }
        
        // Initial check and update
        checkToyBoxUser();
        setTimeout(updateDebugDisplay, 100);`;
            
            const oldDebug = html.substring(updateDebugStart, funcEnd);
            html = html.replace(oldDebug, newDebugFunction);
            console.log('✅ Updated debug display function');
        }
        
        // Make sure checkToyBoxUser is called BEFORE checkExtensionAuth
        const domContentIndex = html.indexOf("document.addEventListener('DOMContentLoaded'");
        if (domContentIndex > -1) {
            const funcBody = html.indexOf('{', domContentIndex);
            const checkExtCall = html.indexOf('checkExtensionAuth()', domContentIndex);
            
            if (checkExtCall > -1) {
                // Find if checkToyBoxUser is already there
                const toyBoxCheckExists = html.substring(funcBody, checkExtCall).includes('checkToyBoxUser()');
                
                if (!toyBoxCheckExists) {
                    // Add it right at the start of DOMContentLoaded
                    const initCode = `
            // First thing: check ToyBox user
            console.log('Page loaded - checking ToyBox auth...');
            checkToyBoxUser();
            updateDebugDisplay();
            `;
                    
                    html = html.substring(0, funcBody + 1) + initCode + html.substring(funcBody + 1);
                    console.log('✅ Added ToyBox check at page load');
                }
            }
        }
        
        console.log('\n💾 Saving fixed detection...');
        
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
        
        console.log('✅ Successfully fixed ToyBox detection!\n');
        console.log('📋 What was fixed:');
        console.log('1. Better localStorage checking with logging');
        console.log('2. Debug display shows localStorage status');
        console.log('3. Auto-retry if data found but not loaded');
        console.log('4. Check runs immediately on page load\n');
        console.log('🔗 Test at: https://webtoys.ai/public/webtoysos-issue-tracker');
        console.log('   Check browser console for detailed logs');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

fixDetection();