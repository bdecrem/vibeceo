#!/usr/bin/env node

/**
 * Restore the complete auth system with modal and fix toggleAuth
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

async function restoreAuthSystem() {
    try {
        console.log('🔧 Restoring complete auth system...');
        
        // Fetch current ToyBox OS
        const { data: toyboxData, error: fetchError } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os')
            .single();
        
        if (fetchError) throw fetchError;
        
        let html = toyboxData.html_content;
        
        // Add the auth modal HTML if missing
        if (!html.includes('id="authModal"')) {
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
            console.log('✅ Added auth modal HTML');
        }
        
        // Fix the toggleAuth function
        const fixedToggleAuth = `function toggleAuth(event) {
        if (event) { 
            event.preventDefault();
            event.stopPropagation(); 
        }
        openAuthModal();
    }
    
    function openAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.style.display = 'block';
            if (currentToyBoxUser) {
                showProfileScreen();
            } else {
                showWelcomeScreen();
            }
        }
    }
    
    function closeAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.style.display = 'none';
        }
    }`;
        
        // Replace the broken toggleAuth
        html = html.replace(
            /function toggleAuth\(event\) \{[\s\S]*?\n    \}/,
            fixedToggleAuth
        );
        
        // Make sure all the auth functions exist
        if (!html.includes('function showWelcomeScreen()')) {
            const authFunctions = `
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
        
        try {
            const response = await fetch('/api/zad/load?app_id=toybox-os-users&action_type=user_registry');
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
        
        if (!/^\d{4}$/.test(pin)) {
            document.getElementById('regError').textContent = 'PIN must be 4 digits';
            return;
        }
        
        if (pin !== confirmPin) {
            document.getElementById('regError').textContent = 'PINs do not match';
            return;
        }
        
        try {
            const response = await fetch('/api/zad/load?app_id=toybox-os-users&action_type=user_registry');
            const users = await response.json();
            
            const exists = users.find(u => 
                u.content_data && u.content_data.handle === handle
            );
            
            if (exists) {
                document.getElementById('regError').textContent = 'Handle already taken';
                return;
            }
            
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
                    app_id: 'toybox-os-users',
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
        const usernameDisplay = document.getElementById('username-display');
        if (usernameDisplay) {
            usernameDisplay.textContent = currentToyBoxUser ? currentToyBoxUser.handle : '';
        }
    }
    
    function broadcastAuth() {
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            try {
                iframe.contentWindow.postMessage({
                    type: 'TOYBOX_AUTH',
                    user: currentToyBoxUser
                }, '*');
            } catch (e) {}
        });
    }`;
            
            // Add before the closing script tag
            html = html.replace('</script>', authFunctions + '\n</script>');
            console.log('✅ Added auth functions');
        }
        
        // Make sure currentToyBoxUser is declared
        if (!html.includes('let currentToyBoxUser')) {
            html = html.replace(
                '<script>',
                '<script>\n    let currentToyBoxUser = null;'
            );
        }
        
        // Make sure initToyBoxAuth is called on load
        if (!html.includes('initToyBoxAuth')) {
            const initAuth = `
    // Initialize auth on load
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
    
    window.addEventListener('DOMContentLoaded', initToyBoxAuth);`;
            
            html = html.replace('</script>', initAuth + '\n</script>');
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
        
        console.log('✅ Complete auth system restored!');
        console.log('👤 Click on profile icon to open auth modal');
        console.log('🔐 Shows profile/logout when logged in');
        console.log('🆕 Shows login/register when logged out');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

// Run
restoreAuthSystem();