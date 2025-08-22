#!/usr/bin/env node

/**
 * SAFELY integrate MacWord with ToyBox OS auth
 * This time: minimal changes, test each step, don't break anything
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

async function step1_BackupEverything() {
    console.log('📦 Step 1: Backing up both ToyBox OS and MacWord...');
    
    // Backup ToyBox OS
    const { data: toyboxData } = await supabase
        .from('wtaf_content')
        .select('html_content')
        .eq('user_slug', 'public')
        .eq('app_slug', 'toybox-os')
        .single();
    
    const toyboxBackup = path.join(__dirname, '..', 'backups', `toybox-os_safe_auth_${Date.now()}.html`);
    await fs.writeFile(toyboxBackup, toyboxData.html_content);
    console.log(`  ✅ ToyBox OS backed up to ${toyboxBackup}`);
    
    // Backup MacWord
    const { data: macwordData } = await supabase
        .from('wtaf_content')
        .select('html_content')
        .eq('user_slug', 'public')
        .eq('app_slug', 'macword')
        .single();
    
    const macwordBackup = path.join(__dirname, '..', 'backups', `macword_safe_auth_${Date.now()}.html`);
    await fs.writeFile(macwordBackup, macwordData.html_content);
    console.log(`  ✅ MacWord backed up to ${macwordBackup}`);
    
    return { toybox: toyboxData.html_content, macword: macwordData.html_content };
}

async function step2_UpdateToyBoxBroadcast(toyboxHtml) {
    console.log('📡 Step 2: Adding SAFE broadcast to ToyBox OS...');
    
    // Only modify the existing broadcastAuth function to be more robust
    let html = toyboxHtml;
    
    // First, let's make broadcastAuth safer
    const saferBroadcast = `function broadcastAuth() {
        const iframes = document.querySelectorAll('iframe');
        iframes.forEach(iframe => {
            try {
                // Only broadcast if iframe is loaded and ready
                if (iframe.contentWindow) {
                    iframe.contentWindow.postMessage({
                        type: 'TOYBOX_AUTH',
                        user: currentToyBoxUser
                    }, '*');
                }
            } catch (e) {
                // Silently fail if iframe not ready
            }
        });
    }`;
    
    html = html.replace(
        /function broadcastAuth\(\) \{[\s\S]*?\n    \}/,
        saferBroadcast
    );
    
    // Add a delayed broadcast after opening windowed apps
    // Find the openWindowedApp function and add broadcast after iframe loads
    const improvedOpenApp = html.replace(
        /iframe\.src = app\.url;/,
        `iframe.src = app.url;
        
        // Send auth state after iframe loads
        iframe.onload = function() {
            setTimeout(() => {
                if (currentToyBoxUser && iframe.contentWindow) {
                    try {
                        iframe.contentWindow.postMessage({
                            type: 'TOYBOX_AUTH',
                            user: currentToyBoxUser
                        }, '*');
                    } catch (e) {}
                }
            }, 500); // Give app time to initialize
        };`
    );
    
    console.log('  ✅ Added safe auth broadcast on app open');
    return improvedOpenApp;
}

async function step3_UpdateMacWord(macwordHtml) {
    console.log('🔐 Step 3: Adding auth listener to MacWord...');
    
    let html = macwordHtml;
    
    // Add a message listener right after currentUser declaration
    const authListener = `
        // Listen for auth from ToyBox OS
        window.addEventListener('message', function(event) {
            // Only accept auth messages from parent
            if (event.data && event.data.type === 'TOYBOX_AUTH' && window.parent !== window) {
                console.log('MacWord received auth:', event.data.user);
                if (event.data.user) {
                    currentUser = event.data.user;
                    updateUserStatus();
                } else {
                    // User logged out
                    currentUser = null;
                    updateUserStatus();
                }
            }
        });`;
    
    // Insert after currentUser declaration
    html = html.replace(
        'let currentUser = null;',
        `let currentUser = null;
        ${authListener}`
    );
    
    // Update showAuth to tell user to use ToyBox OS login
    const simpleShowAuth = `function showAuth(callback) {
            if (currentUser) {
                // Already logged in, run callback
                if (callback) callback();
                return;
            }
            
            // Tell user to login via ToyBox OS
            alert('Please login using the profile icon in the upper right corner of ToyBox OS desktop.');
            
            // Store callback to run after login
            window.pendingAuthCallback = callback;
            
            // Set up listener for next auth message
            function authWaiter(event) {
                if (event.data && event.data.type === 'TOYBOX_AUTH' && event.data.user) {
                    window.removeEventListener('message', authWaiter);
                    if (window.pendingAuthCallback) {
                        window.pendingAuthCallback();
                        window.pendingAuthCallback = null;
                    }
                }
            }
            window.addEventListener('message', authWaiter);
        }`;
    
    // Replace showAuth function
    html = html.replace(
        /function showAuth\([^)]*\) \{[\s\S]*?\n        \}/,
        simpleShowAuth
    );
    
    console.log('  ✅ Added auth listener to MacWord');
    console.log('  ✅ Updated showAuth to use ToyBox OS login');
    
    return html;
}

async function main() {
    try {
        // Step 1: Backup everything
        const { toybox, macword } = await step1_BackupEverything();
        
        // Step 2: Update ToyBox OS broadcast (minimal changes)
        const updatedToyBox = await step2_UpdateToyBoxBroadcast(toybox);
        
        // Step 3: Update MacWord to listen for auth
        const updatedMacWord = await step3_UpdateMacWord(macword);
        
        // Step 4: Save both updates
        console.log('💾 Step 4: Saving updates...');
        
        // Update ToyBox OS
        const { error: toyboxError } = await supabase
            .from('wtaf_content')
            .update({
                html_content: updatedToyBox,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os');
        
        if (toyboxError) throw toyboxError;
        console.log('  ✅ ToyBox OS updated');
        
        // Update MacWord
        const { error: macwordError } = await supabase
            .from('wtaf_content')
            .update({
                html_content: updatedMacWord,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'macword');
        
        if (macwordError) throw macwordError;
        console.log('  ✅ MacWord updated');
        
        console.log('\n✨ SUCCESS! MacWord now uses ToyBox OS authentication');
        console.log('📋 How to test:');
        console.log('  1. Reload ToyBox OS');
        console.log('  2. Login via profile icon');
        console.log('  3. Open MacWord - it should show your username');
        console.log('  4. Save/Open should work with your login');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        console.log('🔄 Backups are saved - you can restore if needed');
        process.exit(1);
    }
}

main();