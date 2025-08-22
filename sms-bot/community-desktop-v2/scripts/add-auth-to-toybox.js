#!/usr/bin/env node

/**
 * Add unified authentication system to ToyBox OS
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });
if (!process.env.SUPABASE_URL) {
    dotenv.config({ path: path.join(__dirname, '../../.env') });
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function addAuthToToyBox() {
    try {
        console.log('🔐 Adding authentication system to ToyBox OS...');
        
        // Fetch current ToyBox OS
        const { data: toyboxData, error: fetchError } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os')
            .single();
        
        if (fetchError) throw fetchError;
        
        let html = toyboxData.html_content;
        
        // Add auth styles to existing styles
        const authStyles = `
        /* Profile Icon Styles */
        #profile-icon {
            cursor: pointer;
            padding: 0 8px;
            font-size: 16px;
            display: flex;
            align-items: center;
            gap: 4px;
            user-select: none;
        }
        
        #profile-icon:hover {
            background: rgba(0, 0, 0, 0.1);
        }
        
        #username-display {
            font-size: 11px;
            font-family: Chicago, Geneva, sans-serif;
            max-width: 100px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
        
        /* Login Modal Styles */
        .auth-modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.3);
            z-index: 9999;
            align-items: center;
            justify-content: center;
        }
        
        .auth-modal.active {
            display: flex;
        }
        
        .auth-dialog {
            background: #c0c0c0;
            border: 2px solid #000;
            box-shadow: 
                inset -1px -1px 0 #808080,
                inset 1px 1px 0 #fff,
                2px 2px 0 #000;
            padding: 0;
            width: 320px;
            font-family: Chicago, Geneva, sans-serif;
        }
        
        .auth-title {
            background: linear-gradient(90deg, #000080, #1084d0);
            color: white;
            padding: 2px 4px;
            font-size: 11px;
            font-weight: bold;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .auth-close {
            width: 14px;
            height: 14px;
            border: 1px solid #000;
            background: #c0c0c0;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: monospace;
            font-size: 10px;
        }
        
        .auth-content {
            padding: 20px;
            text-align: center;
        }
        
        .auth-screen {
            display: none;
        }
        
        .auth-screen.active {
            display: block;
        }
        
        .auth-input {
            width: 100%;
            padding: 6px;
            margin: 8px 0;
            border: 2px solid #000;
            background: white;
            font-family: Chicago, Geneva, sans-serif;
            font-size: 12px;
        }
        
        .auth-button {
            background: #fff;
            border: 2px solid #000;
            padding: 6px 16px;
            margin: 4px;
            cursor: pointer;
            font-family: Chicago, Geneva, sans-serif;
            font-size: 11px;
            box-shadow: 
                inset -1px -1px 0 #808080,
                inset 1px 1px 0 #fff;
        }
        
        .auth-button:hover {
            background: #000;
            color: white;
        }
        
        .auth-button:active {
            box-shadow: 
                inset 1px 1px 0 #808080,
                inset -1px -1px 0 #fff;
        }
        
        .auth-message {
            font-size: 11px;
            margin: 10px 0;
            padding: 8px;
            background: #ffffcc;
            border: 1px solid #000;
        }
        
        .auth-message.error {
            background: #ffcccc;
        }
        
        .auth-message.success {
            background: #ccffcc;
        }`;
        
        // Add styles before </style>
        html = html.replace('</style>', authStyles + '\n    </style>');
        
        // Update menu bar to include profile icon
        const menuBarUpdate = `
            <div id="profile-icon" onclick="toggleAuth()">
                <span id="profile-emoji">👤</span>
                <span id="username-display"></span>
            </div>`;
        
        // Insert profile icon before clock
        html = html.replace(
            '<div id="menu-clock"',
            menuBarUpdate + '\n            <div id="menu-clock"'
        );
        
        // Add auth modal HTML before window-container
        const authModalHTML = `
    <!-- Login Modal -->
    <div id="authModal" class="auth-modal">
        <div class="auth-dialog">
            <div class="auth-title">
                <span>ToyBox OS Login</span>
                <div class="auth-close" onclick="closeAuth()">✕</div>
            </div>
            <div class="auth-content">
                <!-- Welcome Screen -->
                <div class="auth-screen active" id="welcomeScreen">
                    <h3 style="margin-bottom: 16px;">Welcome to ToyBox OS</h3>
                    <p style="font-size: 12px; margin-bottom: 16px;">Sign in to access personalized apps and save your work across the desktop.</p>
                    <button class="auth-button" onclick="showScreen('loginScreen')">Sign In</button>
                    <button class="auth-button" onclick="showScreen('registerScreen')">Create Account</button>
                </div>
                
                <!-- Login Screen -->
                <div class="auth-screen" id="loginScreen">
                    <h3 style="margin-bottom: 16px;">Sign In</h3>
                    <input type="text" class="auth-input" id="loginHandle" placeholder="Your Handle">
                    <input type="password" class="auth-input" id="loginPin" placeholder="4-digit PIN" maxlength="4">
                    <div id="loginMessage"></div>
                    <button class="auth-button" onclick="login()">Sign In</button>
                    <button class="auth-button" onclick="showScreen('welcomeScreen')">Back</button>
                </div>
                
                <!-- Register Screen -->
                <div class="auth-screen" id="registerScreen">
                    <h3 style="margin-bottom: 16px;">Create Account</h3>
                    <input type="text" class="auth-input" id="registerHandle" placeholder="Choose Handle (3-15 chars)" maxlength="15">
                    <input type="password" class="auth-input" id="registerPin" placeholder="Create 4-digit PIN" maxlength="4">
                    <input type="password" class="auth-input" id="confirmPin" placeholder="Confirm PIN" maxlength="4">
                    <div id="registerMessage"></div>
                    <button class="auth-button" onclick="register()">Create Account</button>
                    <button class="auth-button" onclick="showScreen('welcomeScreen')">Back</button>
                </div>
                
                <!-- Profile Screen (when logged in) -->
                <div class="auth-screen" id="profileScreen">
                    <h3 style="margin-bottom: 16px;">Profile</h3>
                    <p style="font-size: 12px; margin-bottom: 8px;">Signed in as:</p>
                    <p style="font-size: 14px; font-weight: bold; margin-bottom: 16px;" id="profileHandle"></p>
                    <p style="font-size: 11px; color: #666; margin-bottom: 16px;">All ToyBox apps will use this account</p>
                    <button class="auth-button" onclick="logout()">Sign Out</button>
                    <button class="auth-button" onclick="closeAuth()">Close</button>
                </div>
            </div>
        </div>
    </div>
    `;
        
        html = html.replace(
            '<div id="window-container">',
            authModalHTML + '\n    <div id="window-container">'
        );
        
        // Add auth JavaScript after window manager code
        const authScript = `
    // ToyBox OS Authentication System
    let currentUser = null;
    const AUTH_APP_ID = 'toybox-os-users';
    
    // Check for saved user on load
    function initAuth() {
        const savedUser = localStorage.getItem('toybox_user');
        if (savedUser) {
            try {
                currentUser = JSON.parse(savedUser);
                updateUIForUser();
                broadcastAuthState();
            } catch (e) {
                console.error('Failed to restore user session:', e);
                localStorage.removeItem('toybox_user');
            }
        }
    }
    
    // ZAD Helper Functions for Auth
    async function saveAuth(dataType, data) {
        try {
            const response = await fetch('/api/zad/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    app_id: AUTH_APP_ID,
                    data_type: dataType,
                    content_data: data,
                    participant_id: currentUser ? currentUser.id : 'anonymous',
                    action_type: dataType
                })
            });
            return await response.json();
        } catch (error) {
            console.error('Save error:', error);
            return null;
        }
    }
    
    async function loadAuth(dataType) {
        try {
            const url = \`/api/zad/load?app_id=\${encodeURIComponent(AUTH_APP_ID)}&action_type=\${encodeURIComponent(dataType)}\`;
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(\`Load failed: \${response.statusText}\`);
            }
            
            const result = await response.json();
            
            if (Array.isArray(result)) {
                return result.map(record => ({
                    ...record.content_data,
                    _participant_id: record.participant_id,
                    _created_at: record.created_at
                }));
            }
            
            return [];
        } catch (error) {
            console.error('Load error:', error);
            return [];
        }
    }
    
    // UI Functions
    function toggleAuth() {
        const modal = document.getElementById('authModal');
        if (modal.classList.contains('active')) {
            closeAuth();
        } else {
            modal.classList.add('active');
            if (currentUser) {
                showScreen('profileScreen');
                document.getElementById('profileHandle').textContent = currentUser.handle;
            } else {
                showScreen('welcomeScreen');
            }
        }
    }
    
    function closeAuth() {
        document.getElementById('authModal').classList.remove('active');
        clearMessages();
    }
    
    function showScreen(screenId) {
        document.querySelectorAll('.auth-screen').forEach(s => s.classList.remove('active'));
        document.getElementById(screenId).classList.add('active');
        clearMessages();
    }
    
    function clearMessages() {
        const loginMsg = document.getElementById('loginMessage');
        const registerMsg = document.getElementById('registerMessage');
        if (loginMsg) loginMsg.innerHTML = '';
        if (registerMsg) registerMsg.innerHTML = '';
    }
    
    function showMessage(elementId, message, type = '') {
        const el = document.getElementById(elementId);
        if (el) {
            el.innerHTML = \`<div class="auth-message \${type}">\${message}</div>\`;
        }
    }
    
    // Authentication Functions
    async function register() {
        const handle = document.getElementById('registerHandle').value.trim();
        const pin = document.getElementById('registerPin').value;
        const confirmPin = document.getElementById('confirmPin').value;
        
        if (handle.length < 3 || handle.length > 15) {
            showMessage('registerMessage', 'Handle must be 3-15 characters', 'error');
            return;
        }
        
        if (!/^\\d{4}$/.test(pin)) {
            showMessage('registerMessage', 'PIN must be exactly 4 digits', 'error');
            return;
        }
        
        if (pin !== confirmPin) {
            showMessage('registerMessage', 'PINs do not match', 'error');
            return;
        }
        
        // Check if handle exists
        const users = await loadAuth('user_registry');
        const existingUser = users.find(u => u.handle === handle);
        
        if (existingUser) {
            showMessage('registerMessage', 'Handle already taken', 'error');
            return;
        }
        
        // Create user
        const userData = {
            handle: handle,
            pin: pin,
            id: handle,
            created: new Date().toISOString()
        };
        
        currentUser = userData;
        await saveAuth('user_registry', userData);
        
        // Save session
        localStorage.setItem('toybox_user', JSON.stringify(userData));
        
        showMessage('registerMessage', 'Account created!', 'success');
        setTimeout(() => {
            updateUIForUser();
            broadcastAuthState();
            closeAuth();
        }, 1000);
    }
    
    async function login() {
        const handle = document.getElementById('loginHandle').value.trim();
        const pin = document.getElementById('loginPin').value;
        
        // Load all users
        const users = await loadAuth('user_registry');
        const user = users.find(u => 
            u.handle && u.handle.toLowerCase() === handle.toLowerCase() && 
            u.pin === pin
        );
        
        if (!user) {
            showMessage('loginMessage', 'Invalid handle or PIN', 'error');
            return;
        }
        
        currentUser = user;
        localStorage.setItem('toybox_user', JSON.stringify(user));
        
        showMessage('loginMessage', 'Welcome back!', 'success');
        setTimeout(() => {
            updateUIForUser();
            broadcastAuthState();
            closeAuth();
        }, 1000);
    }
    
    function logout() {
        currentUser = null;
        localStorage.removeItem('toybox_user');
        updateUIForUser();
        broadcastAuthState();
        closeAuth();
    }
    
    // Update UI based on auth state
    function updateUIForUser() {
        const profileEmoji = document.getElementById('profile-emoji');
        const usernameDisplay = document.getElementById('username-display');
        
        if (currentUser) {
            profileEmoji.textContent = '👤';
            usernameDisplay.textContent = currentUser.handle;
        } else {
            profileEmoji.textContent = '👤';
            usernameDisplay.textContent = '';
        }
    }
    
    // Broadcast auth state to all apps
    function broadcastAuthState() {
        const windows = document.querySelectorAll('.desktop-window iframe');
        windows.forEach(iframe => {
            try {
                iframe.contentWindow.postMessage({
                    type: 'TOYBOX_AUTH',
                    user: currentUser
                }, '*');
            } catch (e) {
                console.error('Could not send auth to iframe:', e);
            }
        });
    }
    
    // Modify openWindowedApp to notify new windows
    const originalOpenWindowedApp = openWindowedApp;
    openWindowedApp = function(appId) {
        originalOpenWindowedApp(appId);
        // Wait a bit for the window to load, then send auth
        setTimeout(() => {
            broadcastAuthState();
        }, 2000);
    };
    
    // Initialize auth on load
    window.addEventListener('DOMContentLoaded', () => {
        initAuth();
    });
`;
        
        // Insert auth script before closing </script> tag
        html = html.replace('</script>', authScript + '\n</script>');
        
        // Update ToyBox OS
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os');
        
        if (updateError) throw updateError;
        
        console.log('✅ Authentication system added to ToyBox OS!');
        console.log('🔐 Users can now login from the profile icon in the menu bar');
        console.log('📱 All apps will receive authentication via postMessage');
        
    } catch (error) {
        console.error('❌ Failed to add auth:', error);
        process.exit(1);
    }
}

// Run
addAuthToToyBox();