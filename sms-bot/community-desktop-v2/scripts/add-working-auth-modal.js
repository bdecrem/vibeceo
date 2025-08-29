#!/usr/bin/env node

/**
 * Add the working auth modal now that we know the button works
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

async function addWorkingModal() {
    try {
        console.log('🔐 Adding working auth modal...');
        
        // Fetch current ToyBox OS
        const { data: toyboxData, error: fetchError } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os')
            .single();
        
        if (fetchError) throw fetchError;
        
        let html = toyboxData.html_content;
        
        // Replace the simple alert button with proper auth button
        html = html.replace(
            `<button onclick="alert('Login clicked! Modal would open here.')" style="border: none; background: transparent; cursor: pointer; padding: 4px; font-size: 12px;">👤</button>`,
            `<button id="profileBtn" onclick="openAuthModal()" style="border: none; background: transparent; cursor: pointer; padding: 4px; font-size: 12px;">
                <span id="profileIcon">👤</span>
                <span id="profileName" style="margin-left: 4px;"></span>
            </button>`
        );
        
        // Check if auth modal already exists, if not add it
        if (!html.includes('id="authModal"')) {
            // Add the modal HTML before </body>
            const modalHTML = `
    <!-- Auth Modal -->
    <div id="authModal" style="display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 9999;">
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: #c0c0c0; border: 2px solid #000; padding: 0; width: 320px; box-shadow: 2px 2px 4px rgba(0,0,0,0.3);">
            <div style="background: linear-gradient(90deg, #000080, #1084d0); color: white; padding: 4px 8px; font-size: 12px; display: flex; justify-content: space-between; align-items: center;">
                <span>ToyBox OS Login</span>
                <button onclick="closeAuthModal()" style="background: #c0c0c0; border: 1px solid #000; padding: 0 4px; cursor: pointer;">✕</button>
            </div>
            <div style="padding: 20px;">
                <div id="authContent">
                    <!-- Welcome Screen -->
                    <div id="welcomeScreen" style="text-align: center;">
                        <h3>Welcome to ToyBox OS</h3>
                        <p style="font-size: 12px; margin: 16px 0;">Sign in to access personalized apps</p>
                        <button onclick="showLoginScreen()" style="padding: 6px 16px; margin: 4px; cursor: pointer;">Sign In</button>
                        <button onclick="showRegisterScreen()" style="padding: 6px 16px; margin: 4px; cursor: pointer;">Create Account</button>
                    </div>
                    
                    <!-- Login Screen (hidden initially) -->
                    <div id="loginScreen" style="display: none; text-align: center;">
                        <h3>Sign In</h3>
                        <input type="text" id="loginHandle" placeholder="Your Handle" style="display: block; width: 100%; margin: 8px 0; padding: 6px;">
                        <input type="password" id="loginPin" placeholder="4-digit PIN" maxlength="4" style="display: block; width: 100%; margin: 8px 0; padding: 6px;">
                        <div id="loginError" style="color: red; font-size: 12px; margin: 8px 0;"></div>
                        <button onclick="doLogin()" style="padding: 6px 16px; margin: 4px; cursor: pointer;">Sign In</button>
                        <button onclick="showWelcomeScreen()" style="padding: 6px 16px; margin: 4px; cursor: pointer;">Back</button>
                    </div>
                    
                    <!-- Register Screen (hidden initially) -->
                    <div id="registerScreen" style="display: none; text-align: center;">
                        <h3>Create Account</h3>
                        <input type="text" id="regHandle" placeholder="Choose Handle (3-15 chars)" maxlength="15" style="display: block; width: 100%; margin: 8px 0; padding: 6px;">
                        <input type="password" id="regPin" placeholder="Create 4-digit PIN" maxlength="4" style="display: block; width: 100%; margin: 8px 0; padding: 6px;">
                        <input type="password" id="confirmPin" placeholder="Confirm PIN" maxlength="4" style="display: block; width: 100%; margin: 8px 0; padding: 6px;">
                        <div id="regError" style="color: red; font-size: 12px; margin: 8px 0;"></div>
                        <button onclick="doRegister()" style="padding: 6px 16px; margin: 4px; cursor: pointer;">Create Account</button>
                        <button onclick="showWelcomeScreen()" style="padding: 6px 16px; margin: 4px; cursor: pointer;">Back</button>
                    </div>
                    
                    <!-- Profile Screen (hidden initially) -->
                    <div id="profileScreen" style="display: none; text-align: center;">
                        <h3>Profile</h3>
                        <p>Signed in as: <strong id="profileHandle"></strong></p>
                        <button onclick="doLogout()" style="padding: 6px 16px; margin: 4px; cursor: pointer;">Sign Out</button>
                        <button onclick="closeAuthModal()" style="padding: 6px 16px; margin: 4px; cursor: pointer;">Close</button>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
            
            html = html.replace('</body>', modalHTML + '\n</body>');
        }
        
        // Add the auth JavaScript if not already there
        if (!html.includes('function openAuthModal')) {
            const authScript = `
    // ToyBox OS Simple Auth System
    let currentToyBoxUser = null;
    const TOYBOX_APP_ID = 'toybox-os-users';
    
    // Check for saved user on load
    function initToyBoxAuth() {
        const savedUser = localStorage.getItem('toybox_user');
        if (savedUser) {
            try {
                currentToyBoxUser = JSON.parse(savedUser);
                updateProfileDisplay();
            } catch (e) {
                localStorage.removeItem('toybox_user');
            }
        }
    }
    
    function openAuthModal() {
        document.getElementById('authModal').style.display = 'block';
        if (currentToyBoxUser) {
            showProfileScreen();
        } else {
            showWelcomeScreen();
        }
    }
    
    function closeAuthModal() {
        document.getElementById('authModal').style.display = 'none';
    }
    
    function showWelcomeScreen() {
        document.getElementById('welcomeScreen').style.display = 'block';
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('registerScreen').style.display = 'none';
        document.getElementById('profileScreen').style.display = 'none';
    }
    
    function showLoginScreen() {
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('loginScreen').style.display = 'block';
        document.getElementById('registerScreen').style.display = 'none';
        document.getElementById('profileScreen').style.display = 'none';
    }
    
    function showRegisterScreen() {
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('registerScreen').style.display = 'block';
        document.getElementById('profileScreen').style.display = 'none';
    }
    
    function showProfileScreen() {
        document.getElementById('welcomeScreen').style.display = 'none';
        document.getElementById('loginScreen').style.display = 'none';
        document.getElementById('registerScreen').style.display = 'none';
        document.getElementById('profileScreen').style.display = 'block';
        if (currentToyBoxUser) {
            document.getElementById('profileHandle').textContent = currentToyBoxUser.handle;
        }
    }
    
    async function doLogin() {
        const handle = document.getElementById('loginHandle').value.trim();
        const pin = document.getElementById('loginPin').value;
        
        if (!handle || !pin) {
            document.getElementById('loginError').textContent = 'Please enter handle and PIN';
            return;
        }
        
        // Load users and check credentials
        try {
            const response = await fetch('/api/zad/load?app_id=' + TOYBOX_APP_ID + '&action_type=user_registry');
            const users = await response.json();
            
            const user = users.find(u => 
                u.content_data && 
                u.content_data.handle === handle && 
                u.content_data.pin === pin
            );
            
            if (user) {
                currentToyBoxUser = user.content_data;
                localStorage.setItem('toybox_user', JSON.stringify(currentToyBoxUser));
                updateProfileDisplay();
                showProfileScreen();
                broadcastAuth();
            } else {
                document.getElementById('loginError').textContent = 'Invalid handle or PIN';
            }
        } catch (error) {
            document.getElementById('loginError').textContent = 'Login failed';
        }
    }
    
    async function doRegister() {
        const handle = document.getElementById('regHandle').value.trim();
        const pin = document.getElementById('regPin').value;
        const confirmPin = document.getElementById('confirmPin').value;
        
        if (handle.length < 3 || handle.length > 15) {
            document.getElementById('regError').textContent = 'Handle must be 3-15 characters';
            return;
        }
        
        if (!/^\\d{4}$/.test(pin)) {
            document.getElementById('regError').textContent = 'PIN must be 4 digits';
            return;
        }
        
        if (pin !== confirmPin) {
            document.getElementById('regError').textContent = 'PINs do not match';
            return;
        }
        
        // Check if handle exists
        try {
            const response = await fetch('/api/zad/load?app_id=' + TOYBOX_APP_ID + '&action_type=user_registry');
            const users = await response.json();
            
            const exists = users.find(u => 
                u.content_data && u.content_data.handle === handle
            );
            
            if (exists) {
                document.getElementById('regError').textContent = 'Handle already taken';
                return;
            }
            
            // Register new user
            const userData = {
                handle: handle,
                pin: pin,
                id: handle,
                created: new Date().toISOString()
            };
            
            const saveResponse = await fetch('/api/zad/save', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    app_id: TOYBOX_APP_ID,
                    data_type: 'user_registry',
                    content_data: userData,
                    participant_id: handle,
                    action_type: 'user_registry'
                })
            });
            
            if (saveResponse.ok) {
                currentToyBoxUser = userData;
                localStorage.setItem('toybox_user', JSON.stringify(userData));
                updateProfileDisplay();
                showProfileScreen();
                broadcastAuth();
            } else {
                document.getElementById('regError').textContent = 'Registration failed';
            }
        } catch (error) {
            document.getElementById('regError').textContent = 'Registration failed';
        }
    }
    
    function doLogout() {
        currentToyBoxUser = null;
        localStorage.removeItem('toybox_user');
        updateProfileDisplay();
        closeAuthModal();
        broadcastAuth();
    }
    
    function updateProfileDisplay() {
        const nameSpan = document.getElementById('profileName');
        if (nameSpan) {
            nameSpan.textContent = currentToyBoxUser ? currentToyBoxUser.handle : '';
        }
    }
    
    function broadcastAuth() {
        // Send auth state to all iframes
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            try {
                iframe.contentWindow.postMessage({
                    type: 'TOYBOX_AUTH',
                    user: currentToyBoxUser
                }, '*');
            } catch (e) {}
        });
    }
    
    // Initialize on load
    if (window.addEventListener) {
        window.addEventListener('DOMContentLoaded', initToyBoxAuth);
    }`;
            
            html = html.replace('</script>', authScript + '\n</script>');
        }
        
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
        
        console.log('✅ Working auth modal added!');
        console.log('🔐 Users can now login/register');
        console.log('📱 Auth state broadcasts to all apps');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

// Run
addWorkingModal();