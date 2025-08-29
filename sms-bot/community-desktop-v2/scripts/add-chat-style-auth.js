#!/usr/bin/env node

/**
 * Add Chat-style ToyBox authentication to webtoysos-issue-tracker
 * This uses the EXACT same pattern as ToyBox Chat
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

async function addChatStyleAuth() {
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
        
        console.log('🔍 Adding Chat-style authentication...\n');
        
        // Step 1: Add currentUser variable right after APP_ID
        const appIdLine = "window.APP_ID = '5b98f08a-60c7-48cd-bd1c-fb4bad3615ae';";
        const appIdIndex = html.indexOf(appIdLine);
        
        if (appIdIndex === -1) {
            console.error('❌ Could not find APP_ID');
            return;
        }
        
        // Add our auth code right after APP_ID
        const authCode = `
        
        // ToyBox OS Authentication (same as Chat app)
        let currentUser = null;
        
        // Load user from localStorage (shared with ToyBox OS)
        function loadToyBoxAuth() {
            const savedUser = localStorage.getItem('toybox_user');
            if (savedUser) {
                try {
                    currentUser = JSON.parse(savedUser);
                    console.log('Fixit Board loaded user:', currentUser);
                    
                    // Check if user is bart (admin)
                    if (currentUser && currentUser.handle === 'bart') {
                        console.log('🔐 Admin user detected: bart');
                        // Enable superpower mode for bart
                        if (typeof isInSuperpowerMode !== 'undefined') {
                            isInSuperpowerMode = true;
                        }
                        // Make auth work like the original
                        if (typeof isAuthenticated !== 'undefined') {
                            isAuthenticated = true;
                        }
                    }
                } catch (e) {
                    console.error('Failed to parse saved user:', e);
                }
            }
        }
        
        // Listen for auth updates from ToyBox OS
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'TOYBOX_AUTH') {
                console.log('Fixit Board received auth update:', event.data.user);
                if (event.data.user) {
                    currentUser = event.data.user;
                    
                    // Check if user is bart (admin)
                    if (currentUser.handle === 'bart') {
                        console.log('🔐 Admin user logged in: bart');
                        // Enable superpower mode for bart
                        if (typeof isInSuperpowerMode !== 'undefined') {
                            isInSuperpowerMode = true;
                        }
                        if (typeof isAuthenticated !== 'undefined') {
                            isAuthenticated = true;
                        }
                        // Reload issues to show admin controls
                        if (typeof loadIssues === 'function') {
                            loadIssues();
                        }
                    }
                } else {
                    currentUser = null;
                    if (typeof isInSuperpowerMode !== 'undefined') {
                        isInSuperpowerMode = false;
                    }
                    if (typeof isAuthenticated !== 'undefined') {
                        isAuthenticated = false;
                    }
                }
            }
        });`;
        
        // Insert the auth code after APP_ID (if not already there)
        if (!html.includes('ToyBox OS Authentication')) {
            const insertPoint = appIdIndex + appIdLine.length;
            html = html.substring(0, insertPoint) + authCode + html.substring(insertPoint);
            console.log('✅ Added ToyBox authentication code');
        }
        
        // Step 2: Find where isAuthenticated is checked in checkExtensionAuth
        // and make it also check for bart
        const checkExtensionAuthStart = html.indexOf('async function checkExtensionAuth()');
        if (checkExtensionAuthStart > -1) {
            // Find the return statement in this function
            const funcEnd = html.indexOf('}', html.indexOf('{', checkExtensionAuthStart));
            const funcContent = html.substring(checkExtensionAuthStart, funcEnd);
            
            // Add a check for bart at the beginning of the function
            const newCheckAuth = `async function checkExtensionAuth() {
            // Check if user is bart (admin) first
            if (currentUser && currentUser.handle === 'bart') {
                console.log('Auth check: bart is logged in');
                return true;
            }
            
            // Original extension auth check
            ${funcContent.substring(funcContent.indexOf('{') + 1)}`;
            
            html = html.replace(funcContent, newCheckAuth);
            console.log('✅ Updated checkExtensionAuth to recognize bart');
        }
        
        // Step 3: Add initialization on DOMContentLoaded
        const domContentLoadedIndex = html.indexOf("document.addEventListener('DOMContentLoaded'");
        if (domContentLoadedIndex > -1) {
            // Find the function body
            const funcStart = html.indexOf('{', domContentLoadedIndex);
            const afterBrace = funcStart + 1;
            
            // Add our init code at the beginning
            const initCode = `
            // Initialize ToyBox authentication
            loadToyBoxAuth();
            `;
            
            html = html.substring(0, afterBrace) + initCode + html.substring(afterBrace);
            console.log('✅ Added loadToyBoxAuth() to DOMContentLoaded');
        }
        
        // Step 4: Update author field to use currentUser if available
        const authorFieldCode = "document.getElementById('author').value";
        if (html.includes(authorFieldCode)) {
            // In submitIssue function, use currentUser.handle if available
            const submitIssueIndex = html.indexOf('async function submitIssue()');
            if (submitIssueIndex > -1) {
                const submitEnd = html.indexOf('author:', submitIssueIndex);
                if (submitEnd > -1) {
                    const authorLine = html.substring(submitEnd, html.indexOf(',', submitEnd));
                    const newAuthorLine = "author: currentUser ? currentUser.handle : document.getElementById('author').value.trim()";
                    html = html.replace(authorLine, newAuthorLine);
                    console.log('✅ Updated author to use currentUser.handle');
                }
            }
        }
        
        console.log('\n💾 Saving updated app...');
        
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
        
        console.log('✅ Successfully added Chat-style authentication!\n');
        console.log('📋 How it works now:');
        console.log('1. Reads localStorage.getItem("toybox_user")');
        console.log('2. Parses to get currentUser object');
        console.log('3. Checks if currentUser.handle === "bart"');
        console.log('4. If bart, enables admin/superpower mode');
        console.log('5. Works alongside existing API auth\n');
        console.log('🔗 Test at: https://webtoys.ai/public/toybox-os');
        console.log('   Login as "bart" and open Fixit Board!');
        
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

addChatStyleAuth();