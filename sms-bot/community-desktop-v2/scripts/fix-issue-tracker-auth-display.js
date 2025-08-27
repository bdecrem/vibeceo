#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { fetchCurrentToyBoxOS, safeUpdateToyBoxOS } from './safe-update-wrapper.js';

// Environment variables will be loaded by safe-update-wrapper.js
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('❌ Missing required environment variables');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function fixIssueTrackerAuth() {
    console.log('🔧 Fixing Issue Tracker authentication display...');

    try {
        // First, find the Issue Tracker app
        console.log('🔍 Looking for Issue Tracker app in database...');
        const { data: apps, error: listError } = await supabase
            .from('wtaf_content')
            .select('app_slug, user_slug')
            .eq('user_slug', 'public')
            .ilike('app_slug', '%issue-tracker%');
            
        if (listError) {
            console.error('❌ Failed to list apps:', listError);
            return;
        }
        
        console.log('Found apps:', apps);
        
        if (!apps || apps.length === 0) {
            console.error('❌ No Issue Tracker app found');
            return;
        }
        
        const appSlug = apps[0].app_slug;
        console.log(`📱 Using app slug: ${appSlug}`);
        
        // Fetch the current Issue Tracker from database
        const { data, error } = await supabase
            .from('wtaf_content')
            .select('*')
            .eq('user_slug', 'public')
            .eq('app_slug', appSlug)
            .single();

        if (error || !data) {
            console.error('❌ Failed to fetch Issue Tracker:', error);
            return;
        }

        let html = data.html_content;
        console.log('📄 Fetched Issue Tracker from database');

        // Fix 1: Update the loadAuth function to properly display user immediately
        const loadAuthPattern = /function loadAuth\(\) \{[\s\S]*?\n\s*\}/;
        const newLoadAuth = `function loadAuth() {
            console.log('🔍 Loading auth from localStorage...');
            const savedUser = localStorage.getItem('toybox_user');
            if (savedUser) {
                try {
                    currentUser = JSON.parse(savedUser);
                    console.log('✅ Loaded user from localStorage:', currentUser);
                    
                    // Immediately update all displays
                    updateCurrentUserInfo();
                    updateAdminIndicator();
                    checkBartStatus();
                    
                    // Update the user info display
                    const userDisplay = document.getElementById('userInfo');
                    if (userDisplay && currentUser) {
                        userDisplay.textContent = \`Logged in as: \${currentUser.handle}\`;
                    }
                } catch (e) {
                    console.error('❌ Failed to parse saved user:', e);
                    localStorage.removeItem('toybox_user');
                }
            } else {
                console.log('ℹ️ No user in localStorage');
                updateCurrentUserInfo();
            }
        }`;

        html = html.replace(loadAuthPattern, newLoadAuth);

        // Fix 2: Update the message listener to properly handle auth updates
        const messageListenerPattern = /window\.addEventListener\('message', function\(event\) \{[\s\S]*?\n\s*\}\);/;
        const newMessageListener = `window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'TOYBOX_AUTH') {
                console.log('📬 Received TOYBOX_AUTH message:', event.data.user);
                currentUser = event.data.user;
                
                // Update all displays
                updateCurrentUserInfo();
                updateAdminIndicator();
                checkBartStatus();
                
                // Update the user info display
                const userDisplay = document.getElementById('userInfo');
                if (userDisplay && currentUser) {
                    userDisplay.textContent = \`Logged in as: \${currentUser.handle}\`;
                } else if (userDisplay) {
                    userDisplay.textContent = 'Not logged in';
                }
            }
        });`;

        html = html.replace(messageListenerPattern, newMessageListener);

        // Fix 3: Update DOMContentLoaded to request auth from parent
        const domLoadPattern = /window\.addEventListener\('DOMContentLoaded', function\(\) \{[\s\S]*?\n\s*\}\);/;
        const newDomLoad = `window.addEventListener('DOMContentLoaded', function() {
            console.log('📱 Issue Tracker initializing...');
            
            // Load from localStorage first
            loadAuth();
            
            // Load recent updates
            loadRecentUpdates();
            
            // Request current auth state from ToyBox OS (if in iframe)
            if (window.parent !== window) {
                console.log('📤 Requesting auth from ToyBox OS...');
                window.parent.postMessage({ type: 'REQUEST_AUTH' }, '*');
            }
            
            // Initialize filters and other UI
            initializeFilters();
        });`;

        html = html.replace(domLoadPattern, newDomLoad);

        // Fix 4: Ensure updateCurrentUserInfo shows proper status
        const updateUserInfoPattern = /function updateCurrentUserInfo\(\) \{[\s\S]*?\n\s*\}/;
        const newUpdateUserInfo = `function updateCurrentUserInfo() {
            const userInfo = document.getElementById('currentUserInfo');
            if (userInfo) {
                const username = currentUser?.handle;
                if (username && username !== 'anonymous') {
                    userInfo.innerHTML = \`<span style="color: #4CAF50;">👤 Logged in as: <strong>\${username}</strong></span>\`;
                    console.log('✅ Display updated: Logged in as', username);
                } else {
                    userInfo.innerHTML = '<span style="color: #666;">👤 Not logged in</span>';
                    console.log('ℹ️ Display updated: Not logged in');
                }
            }
        }`;

        html = html.replace(updateUserInfoPattern, newUpdateUserInfo);

        // Fix 5: Add initialization of filters function if missing
        if (!html.includes('function initializeFilters()')) {
            const beforeClosingScript = '</script>';
            const initFiltersFunc = `
        // Initialize filter UI
        function initializeFilters() {
            // Set up any filter listeners
            const statusFilter = document.getElementById('statusFilter');
            const priorityFilter = document.getElementById('priorityFilter');
            
            if (statusFilter) {
                statusFilter.addEventListener('change', filterIssues);
            }
            if (priorityFilter) {
                priorityFilter.addEventListener('change', filterIssues);
            }
        }

        `;
            html = html.replace(beforeClosingScript, initFiltersFunc + beforeClosingScript);
        }

        // Save the updated Issue Tracker back to database
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({ 
                html_content: html
            })
            .eq('user_slug', 'public')
            .eq('app_slug', appSlug);

        if (updateError) {
            console.error('❌ Failed to update Issue Tracker:', updateError);
            return;
        }

        console.log('✅ Issue Tracker authentication display fixed!');
        console.log('');
        console.log('The app now:');
        console.log('1. ✅ Loads and displays user immediately on startup');
        console.log('2. ✅ Shows "Logged in as: [username]" when authenticated');
        console.log('3. ✅ Shows "Not logged in" when no user');
        console.log('4. ✅ Updates display when receiving TOYBOX_AUTH messages');
        console.log('5. ✅ Requests auth from parent ToyBox OS when in iframe');
        console.log('');
        console.log(`Test it at: https://webtoys.ai/public/${appSlug}`);

    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// Run the fix
fixIssueTrackerAuth();