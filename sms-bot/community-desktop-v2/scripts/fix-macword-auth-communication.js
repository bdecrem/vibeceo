#!/usr/bin/env node

/**
 * Fix MacWord authentication to properly work with ToyBox OS
 * The issue: ToyBox OS needs to actively broadcast auth state when apps load
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

async function fixToyBoxOSBroadcast() {
    try {
        console.log('🔧 Fixing ToyBox OS to broadcast auth when apps open...');
        
        const { data: toyboxData, error: fetchError } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os')
            .single();
        
        if (fetchError) throw fetchError;
        
        let html = toyboxData.html_content;
        
        // Update openWindowedApp to broadcast auth state when opening apps
        const updatedOpenFunction = `function openWindowedApp(appId) {
        const app = window.windowedApps[appId];
        if (!app) {
            console.error('App not found:', appId);
            return;
        }
        
        // Create the window with iframe
        const windowEl = createWindow(app.name, app.width || 600, app.height || 400, app.icon);
        const content = windowEl.querySelector('.window-content');
        
        // Create iframe for the app
        const iframe = document.createElement('iframe');
        iframe.src = app.url;
        iframe.style.width = '100%';
        iframe.style.height = '100%';
        iframe.style.border = 'none';
        iframe.style.background = 'white';
        
        // IMPORTANT: Wait for iframe to load, then send auth state
        iframe.onload = function() {
            console.log('App loaded, sending auth state:', currentToyBoxUser);
            // Give iframe a moment to initialize
            setTimeout(() => {
                iframe.contentWindow.postMessage({
                    type: 'TOYBOX_AUTH',
                    user: currentToyBoxUser
                }, '*');
            }, 100);
        };
        
        content.appendChild(iframe);
        
        // Store reference for future broadcasts
        if (!window.openedApps) window.openedApps = [];
        window.openedApps.push(iframe);
    }`;
        
        // Replace the openWindowedApp function
        html = html.replace(
            /function openWindowedApp\(appId\) \{[\s\S]*?\n    \}/,
            updatedOpenFunction
        );
        
        // Also update broadcastAuth to send to all open apps
        const updatedBroadcast = `function broadcastAuth() {
        // Send auth state to all iframes
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            try {
                console.log('Broadcasting auth to iframe:', currentToyBoxUser);
                iframe.contentWindow.postMessage({
                    type: 'TOYBOX_AUTH',
                    user: currentToyBoxUser
                }, '*');
            } catch (e) {
                console.error('Failed to broadcast to iframe:', e);
            }
        });
    }`;
        
        html = html.replace(
            /function broadcastAuth\(\) \{[\s\S]*?\n    \}/,
            updatedBroadcast
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
        
        console.log('✅ ToyBox OS now broadcasts auth when apps open!');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

async function fixMacWordAuthHandling() {
    try {
        console.log('🔧 Fixing MacWord to properly handle auth messages...');
        
        const { data: macwordData, error: fetchError } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'macword')
            .single();
        
        if (fetchError) throw fetchError;
        
        let html = macwordData.html_content;
        
        // Fix the showAuth function to work properly
        const fixedShowAuth = `function showAuth(callback) {
            // If we have a user, just run the callback
            if (currentUser) {
                if (callback) callback();
                return;
            }
            
            // Request auth from parent ToyBox OS
            if (window.parent !== window) {
                alert('Please login using the profile icon in the upper right corner of ToyBox OS');
                // Store callback for later
                window.pendingAuthCallback = callback;
            } else {
                alert('Please login through ToyBox OS');
            }
        }`;
        
        // Replace showAuth function
        html = html.replace(
            /function showAuth\([^)]*\) \{[\s\S]*?\n        \}/,
            fixedShowAuth
        );
        
        // Make sure message listener properly updates the UI
        const improvedListener = `
        // Listen for authentication from ToyBox OS
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'TOYBOX_AUTH') {
                console.log('MacWord received auth from ToyBox OS:', event.data.user);
                if (event.data.user) {
                    currentUser = event.data.user;
                    updateUserStatus();
                    // If we have a pending callback from trying to save/open, run it
                    if (window.pendingAuthCallback) {
                        window.pendingAuthCallback();
                        window.pendingAuthCallback = null;
                    }
                } else {
                    currentUser = null;
                    currentDocId = null;
                    currentDocTitle = 'Untitled';
                    updateUserStatus();
                }
            }
        });`;
        
        // Replace the existing listener
        html = html.replace(
            /\/\/ Listen for authentication from ToyBox OS[\s\S]*?\}\);/,
            improvedListener
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
        
        console.log('✅ MacWord auth handling fixed!');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

// Run both fixes
async function main() {
    await fixToyBoxOSBroadcast();
    await fixMacWordAuthHandling();
    console.log('\n🎉 Auth communication fixed! Try logging in via ToyBox OS profile icon, then open MacWord');
}

main();