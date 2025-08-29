#!/usr/bin/env node

/**
 * Add ToyBox OS authentication to webtoysos-issue-tracker
 * Makes admin features available to logged-in "bart" user
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
let result = dotenv.config({ path: '../../.env.local' });
if (result.error) {
    result = dotenv.config({ path: '../../.env' });
    if (result.error) {
        console.error('Error loading .env files:', result.error.message);
        process.exit(1);
    }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function addToyBoxAuth() {
    try {
        console.log('📥 Fetching webtoysos-issue-tracker...');
        
        const { data, error } = await supabase
            .from('wtaf_content')
            .select('*')
            .eq('user_slug', 'public')
            .eq('app_slug', 'webtoysos-issue-tracker')
            .single();
        
        if (error || !data) {
            console.error('❌ Error fetching app:', error?.message || 'Not found');
            return;
        }
        
        let html = data.html_content;
        
        console.log('🔍 Adding ToyBox OS authentication...');
        
        // Step 1: Add currentUser variable at the beginning of the script
        const scriptStart = html.indexOf('<script>');
        if (scriptStart > -1) {
            const insertPoint = scriptStart + '<script>'.length;
            
            const authCode = `
        // ToyBox OS Authentication
        let currentUser = null;
        let isAdmin = false;
        
        // Load user from localStorage (fallback)
        function loadToyBoxUser() {
            const savedUser = localStorage.getItem('toybox_user');
            if (savedUser) {
                try {
                    currentUser = JSON.parse(savedUser);
                    console.log('Loaded user from localStorage:', currentUser?.handle);
                    checkAdminStatus();
                    updateUIForAuth();
                } catch (e) {
                    console.error('Failed to parse saved user');
                }
            }
        }
        
        // Check if current user is admin (bart)
        function checkAdminStatus() {
            isAdmin = currentUser && currentUser.handle === 'bart';
            if (isAdmin) {
                console.log('🔐 Admin mode enabled for bart');
                // Enable superpower mode automatically for bart
                isInSuperpowerMode = true;
            }
        }
        
        // Update UI based on authentication
        function updateUIForAuth() {
            // Update any user display
            const userDisplay = document.getElementById('user-display');
            if (userDisplay) {
                userDisplay.textContent = currentUser ? currentUser.handle : 'Not logged in';
            }
            
            // Show/hide admin controls
            if (isAdmin) {
                // Show superpower controls
                document.querySelectorAll('.superpower-controls').forEach(el => {
                    el.style.display = 'block';
                });
                // Add admin badge
                const header = document.querySelector('h1');
                if (header && !header.textContent.includes('(Admin)')) {
                    header.textContent += ' (Admin)';
                }
            }
        }
        
        // Listen for authentication updates from ToyBox OS
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'TOYBOX_AUTH') {
                console.log('Received auth update from ToyBox OS:', event.data.user);
                currentUser = event.data.user;
                checkAdminStatus();
                updateUIForAuth();
                
                if (isAdmin) {
                    // Reload issues to show admin controls
                    loadIssues();
                }
            }
        });
        
        // Request authentication from ToyBox OS parent
        window.addEventListener('DOMContentLoaded', function() {
            // Load from localStorage first
            loadToyBoxUser();
            
            // Request fresh auth state from ToyBox OS
            if (window.parent !== window) {
                window.parent.postMessage({ type: 'REQUEST_AUTH' }, '*');
            }
        });
`;
            
            html = html.substring(0, insertPoint) + authCode + html.substring(insertPoint);
        }
        
        // Step 2: Replace the checkAuth function to use ToyBox user instead of API
        console.log('🔄 Replacing API auth with ToyBox user check...');
        
        // Find and replace the checkAuth function
        const checkAuthStart = html.indexOf('async function checkAuth()');
        if (checkAuthStart > -1) {
            const checkAuthEnd = html.indexOf('}', html.indexOf('{', checkAuthStart)) + 1;
            const oldCheckAuth = html.substring(checkAuthStart, checkAuthEnd);
            
            const newCheckAuth = `async function checkAuth() {
            // Use ToyBox OS authentication instead of API
            return isAdmin; // Returns true if user is bart
        }`;
            
            html = html.replace(oldCheckAuth, newCheckAuth);
        }
        
        // Step 3: Update isAuthenticated checks to use isAdmin
        html = html.replace(/isAuthenticated\s*&&\s*isInSuperpowerMode/g, 'isAdmin');
        html = html.replace(/const isAuthenticated = await checkAuth\(\);/g, 'const isAuthenticated = isAdmin;');
        
        // Step 4: Auto-enable superpower mode for bart
        const superpowerCheckPattern = /const urlParams = new URLSearchParams\(window\.location\.search\);[\s\S]*?isInSuperpowerMode = urlParams\.get\('superpower'\) === 'true';/;
        
        if (superpowerCheckPattern.test(html)) {
            html = html.replace(superpowerCheckPattern, `const urlParams = new URLSearchParams(window.location.search);
        isInSuperpowerMode = urlParams.get('superpower') === 'true' || isAdmin; // Auto-enable for bart`);
        }
        
        // Step 5: Update the submitIssue function to include the username
        const submitIssuePattern = /author:\s*document\.getElementById\('author'\)\.value/;
        if (submitIssuePattern.test(html)) {
            html = html.replace(submitIssuePattern, 
                `author: currentUser ? currentUser.handle : document.getElementById('author').value`);
        }
        
        // Step 6: Show username in the form if logged in
        const authorFieldPattern = /<input type="text" id="author"[^>]*>/;
        if (authorFieldPattern.test(html)) {
            html = html.replace(authorFieldPattern, 
                `<input type="text" id="author" placeholder="Your name" required>`);
            
            // Add script to auto-fill if logged in
            const formInitPattern = /document\.addEventListener\('DOMContentLoaded'/;
            if (formInitPattern.test(html)) {
                html = html.replace(formInitPattern, 
                    `// Auto-fill author if logged in
        setTimeout(() => {
            if (currentUser && document.getElementById('author')) {
                document.getElementById('author').value = currentUser.handle;
                document.getElementById('author').readOnly = true;
            }
        }, 100);
        
        document.addEventListener('DOMContentLoaded'`);
            }
        }
        
        console.log('💾 Saving updated app with ToyBox authentication...');
        
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({ 
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'webtoysos-issue-tracker');
        
        if (updateError) {
            console.error('❌ Error updating app:', updateError.message);
            return;
        }
        
        console.log('✅ Successfully added ToyBox OS authentication!');
        console.log('');
        console.log('📋 Changes made:');
        console.log('   • Added currentUser variable to track ToyBox login');
        console.log('   • Listen for TOYBOX_AUTH messages from parent');
        console.log('   • Check if user.handle === "bart" for admin');
        console.log('   • Auto-enable superpower mode for bart');
        console.log('   • Replace API auth with ToyBox user check');
        console.log('   • Auto-fill author field with logged-in username');
        console.log('');
        console.log('🎉 Now when bart logs into ToyBox OS and opens the Issue Tracker:');
        console.log('   • Admin controls will automatically appear');
        console.log('   • No API key or URL parameter needed');
        console.log('   • Full superpower features available');
        console.log('');
        console.log('🔗 Test at: https://webtoys.ai/public/toybox-os');
        console.log('   1. Login as "bart"');
        console.log('   2. Open Issue Tracker from desktop');
        console.log('   3. Admin controls should be visible!');
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

addToyBoxAuth();