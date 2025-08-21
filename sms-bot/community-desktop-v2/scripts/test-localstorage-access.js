#!/usr/bin/env node

/**
 * Add console logging to both ToyBox OS and MacWord to debug localStorage
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

async function addDebugLogging() {
    try {
        console.log('🔍 Adding debug logging to see what\'s in localStorage...');
        
        // Update MacWord with debug logging
        const { data: macwordData } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'macword')
            .single();
        
        let html = macwordData.html_content;
        
        // Backup first
        const backupPath = path.join(__dirname, '..', 'backups', `macword_debug_${Date.now()}.html`);
        await fs.writeFile(backupPath, macwordData.html_content);
        
        // Add comprehensive debug logging
        const debugCode = `
        // DEBUG: Log everything about auth
        console.log('=== MacWord Debug Info ===');
        console.log('Window location:', window.location.href);
        console.log('Is in iframe:', window.parent !== window);
        console.log('LocalStorage available:', typeof(Storage) !== "undefined");
        
        // Try to read localStorage
        try {
            console.log('All localStorage keys:', Object.keys(localStorage));
            const toyboxUser = localStorage.getItem('toybox_user');
            console.log('toybox_user in localStorage:', toyboxUser);
            
            // Also check for other possible keys
            const macwordUser = localStorage.getItem('macword_user');
            console.log('macword_user in localStorage:', macwordUser);
            
            // Log the currentUser variable
            console.log('currentUser variable:', typeof currentUser !== 'undefined' ? currentUser : 'undefined');
        } catch (e) {
            console.error('Error accessing localStorage:', e);
        }
        
        // Original check function with more logging
        function checkToyBoxAuth() {
            console.log('checkToyBoxAuth called...');
            const savedUser = localStorage.getItem('toybox_user');
            console.log('Found in localStorage:', savedUser);
            
            if (savedUser) {
                try {
                    const parsed = JSON.parse(savedUser);
                    console.log('Parsed user:', parsed);
                    currentUser = parsed;
                    console.log('Set currentUser to:', currentUser);
                    updateUserStatus();
                    return true;
                } catch (e) {
                    console.error('Failed to parse saved user:', e);
                }
            } else {
                console.log('No toybox_user in localStorage');
            }
            return false;
        }`;
        
        // Add this debug code early in the script
        html = html.replace(
            'let currentUser = null;',
            `let currentUser = null;
        
        ${debugCode}`
        );
        
        // Update MacWord
        await supabase
            .from('wtaf_content')
            .update({
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'macword');
        
        console.log('✅ Debug logging added to MacWord');
        
        // Also add debug to ToyBox OS
        const { data: toyboxData } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os')
            .single();
        
        let toyboxHtml = toyboxData.html_content;
        
        // Backup ToyBox
        const toyboxBackup = path.join(__dirname, '..', 'backups', `toybox_debug_${Date.now()}.html`);
        await fs.writeFile(toyboxBackup, toyboxData.html_content);
        
        // Add debug logging to ToyBox OS login
        const toyboxDebug = `
            console.log('=== ToyBox OS Debug ===');
            console.log('Saving to localStorage:', userData);
            localStorage.setItem('toybox_user', JSON.stringify(userData));
            console.log('Saved! Can read back:', localStorage.getItem('toybox_user'));`;
        
        // Find where localStorage.setItem is called and add logging
        toyboxHtml = toyboxHtml.replace(
            "localStorage.setItem('toybox_user', JSON.stringify(userData));",
            toyboxDebug
        );
        
        // Also for existing user login
        toyboxHtml = toyboxHtml.replace(
            "localStorage.setItem('toybox_user', JSON.stringify(currentToyBoxUser));",
            `console.log('Saving existing user to localStorage:', currentToyBoxUser);
            localStorage.setItem('toybox_user', JSON.stringify(currentToyBoxUser));
            console.log('Saved! Can read back:', localStorage.getItem('toybox_user'));`
        );
        
        // Update ToyBox OS
        await supabase
            .from('wtaf_content')
            .update({
                html_content: toyboxHtml,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os');
        
        console.log('✅ Debug logging added to ToyBox OS');
        console.log('\n📋 Now:');
        console.log('1. Open browser console (F12)');
        console.log('2. Reload ToyBox OS');
        console.log('3. Login');
        console.log('4. Open MacWord');
        console.log('5. Check console for debug messages');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

addDebugLogging();