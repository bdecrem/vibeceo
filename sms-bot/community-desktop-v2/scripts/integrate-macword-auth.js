#!/usr/bin/env node

/**
 * Integrate MacWord with ToyBox OS unified authentication
 * - Listen for auth broadcasts from parent ToyBox OS
 * - Remove duplicate auth modal
 * - Use ToyBox OS login state
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

async function integrateMacWordAuth() {
    try {
        console.log('🔗 Integrating MacWord with ToyBox OS authentication...');
        
        // Fetch current MacWord
        const { data: macwordData, error: fetchError } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'macword')
            .single();
        
        if (fetchError) throw fetchError;
        
        let html = macwordData.html_content;
        
        // Add message listener for ToyBox OS auth broadcasts
        const authListener = `
        // Listen for authentication from ToyBox OS
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'TOYBOX_AUTH') {
                console.log('Received auth from ToyBox OS:', event.data.user);
                if (event.data.user) {
                    currentUser = event.data.user;
                    updateUserStatus();
                } else {
                    currentUser = null;
                    currentDocId = null;
                    currentDocTitle = 'Untitled';
                    updateUserStatus();
                }
            }
        });
        
        // Request current auth state from parent on load
        function requestAuthState() {
            if (window.parent !== window) {
                window.parent.postMessage({ type: 'REQUEST_AUTH' }, '*');
            }
        }`;
        
        // Insert the listener after the currentUser declaration
        html = html.replace(
            'let currentUser = null;',
            `let currentUser = null;
        
        ${authListener}`
        );
        
        // Modify the showAuth function to request auth from parent instead
        const newShowAuth = `function showAuth(callback) {
            // Instead of showing our own modal, request auth from parent
            if (window.parent !== window) {
                // Store the callback for after auth
                window.pendingAuthCallback = callback;
                
                // Ask parent to open auth modal
                window.parent.postMessage({ type: 'REQUEST_AUTH_MODAL' }, '*');
                
                // Listen for auth completion
                window.authCompleteListener = function(event) {
                    if (event.data && event.data.type === 'TOYBOX_AUTH' && event.data.user) {
                        currentUser = event.data.user;
                        updateUserStatus();
                        if (window.pendingAuthCallback) {
                            window.pendingAuthCallback();
                            window.pendingAuthCallback = null;
                        }
                        window.removeEventListener('message', window.authCompleteListener);
                    }
                };
                window.addEventListener('message', window.authCompleteListener);
            } else {
                // Fallback for standalone mode
                alert('Please login through ToyBox OS');
            }
        }`;
        
        // Replace the entire showAuth function
        html = html.replace(
            /function showAuth\([^)]*\) \{[\s\S]*?\n        \}/,
            newShowAuth
        );
        
        // Remove the auth modal HTML completely since we'll use ToyBox OS's modal
        html = html.replace(
            /<!-- Auth Modal -->[\s\S]*?<!-- End Auth Modal -->/,
            '<!-- Auth handled by ToyBox OS -->'
        );
        
        // Add request for auth state on load
        html = html.replace(
            'window.addEventListener(\'DOMContentLoaded\', function() {',
            `window.addEventListener('DOMContentLoaded', function() {
            requestAuthState(); // Get auth state from parent`
        );
        
        // Update the logout function to notify parent
        const newLogout = `function logout() {
            if (confirm('Are you sure you want to logout?')) {
                const content = document.getElementById('editor').value;
                if (content && isDirty) {
                    if (!confirm('You have unsaved changes. Are you sure?')) {
                        return;
                    }
                }
                
                currentUser = null;
                localStorage.removeItem('macword_user');
                currentDocId = null;
                currentDocTitle = 'Untitled';
                document.getElementById('editor').value = '';
                document.getElementById('docTitle').textContent = currentDocTitle;
                updateUserStatus();
                updateWordCount();
                isDirty = false;
                
                // Notify parent that we logged out
                if (window.parent !== window) {
                    window.parent.postMessage({ type: 'REQUEST_LOGOUT' }, '*');
                }
            }
        }`;
        
        html = html.replace(
            /function logout\(\) \{[\s\S]*?\n        \}/,
            newLogout
        );
        
        // Update MacWord
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'macword');
        
        if (updateError) throw updateError;
        
        console.log('✅ MacWord integrated with ToyBox OS auth!');
        console.log('🔐 Uses unified login from desktop');
        console.log('📡 Receives auth state via postMessage');
        console.log('🚫 Removed duplicate auth modal');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

// Also need to update ToyBox OS to handle auth requests from apps
async function updateToyBoxToHandleRequests() {
    try {
        console.log('📡 Updating ToyBox OS to handle auth requests from apps...');
        
        const { data: toyboxData, error: fetchError } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os')
            .single();
        
        if (fetchError) throw fetchError;
        
        let html = toyboxData.html_content;
        
        // Add message handler for auth requests from apps
        const requestHandler = `
    // Handle auth requests from windowed apps
    window.addEventListener('message', function(event) {
        if (event.data) {
            if (event.data.type === 'REQUEST_AUTH') {
                // Send current auth state to requesting app
                event.source.postMessage({
                    type: 'TOYBOX_AUTH',
                    user: currentToyBoxUser
                }, '*');
            } else if (event.data.type === 'REQUEST_AUTH_MODAL') {
                // App wants us to open the auth modal
                openAuthModal();
            } else if (event.data.type === 'REQUEST_LOGOUT') {
                // App is requesting logout
                doLogout();
            }
        }
    });`;
        
        // Insert after the broadcastAuth function
        html = html.replace(
            'function broadcastAuth() {',
            requestHandler + '\n\n    function broadcastAuth() {'
        );
        
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
        
        console.log('✅ ToyBox OS now handles auth requests from apps!');
        
    } catch (error) {
        console.error('❌ Failed to update ToyBox OS:', error);
        process.exit(1);
    }
}

// Run both updates
async function main() {
    await integrateMacWordAuth();
    await updateToyBoxToHandleRequests();
    console.log('\n🎉 Complete! MacWord now uses ToyBox OS unified authentication');
}

main();