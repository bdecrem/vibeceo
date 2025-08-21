#!/usr/bin/env node

/**
 * Simple fix: Make MacWord read auth directly from localStorage
 * Since both apps are on same domain, they share localStorage
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

async function simpleAuthFix() {
    try {
        console.log('🔧 Simple fix: Make MacWord read localStorage directly...');
        
        // Backup MacWord
        const { data: macwordData, error: fetchError } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'macword')
            .single();
        
        if (fetchError) throw fetchError;
        
        const backupPath = path.join(__dirname, '..', 'backups', `macword_simple_fix_${Date.now()}.html`);
        await fs.writeFile(backupPath, macwordData.html_content);
        console.log(`💾 Backup saved: ${backupPath}`);
        
        let html = macwordData.html_content;
        
        // Add simple auth check on load
        const simpleAuthCheck = `
        // Simple auth: Check localStorage directly (same domain = shared storage)
        function checkToyBoxAuth() {
            const savedUser = localStorage.getItem('toybox_user');
            if (savedUser) {
                try {
                    currentUser = JSON.parse(savedUser);
                    console.log('MacWord loaded user from localStorage:', currentUser);
                    updateUserStatus();
                    return true;
                } catch (e) {
                    console.error('Failed to parse saved user:', e);
                }
            }
            return false;
        }
        
        // Check on load and periodically
        window.addEventListener('DOMContentLoaded', function() {
            console.log('MacWord checking for ToyBox auth...');
            checkToyBoxAuth();
            
            // Also check every 2 seconds in case user logs in after MacWord opens
            setInterval(checkToyBoxAuth, 2000);
        });`;
        
        // Replace or add the DOMContentLoaded listener
        if (html.includes("window.addEventListener('DOMContentLoaded'")) {
            html = html.replace(
                /window\.addEventListener\('DOMContentLoaded'[^}]+\}\);/,
                simpleAuthCheck
            );
        } else {
            html = html.replace('</script>', simpleAuthCheck + '\n</script>');
        }
        
        // Also update showAuth to be simpler
        const simplerShowAuth = `function showAuth(callback) {
            // Check localStorage first
            if (checkToyBoxAuth()) {
                if (callback) callback();
                return;
            }
            
            // Not logged in - tell user to use ToyBox OS
            alert('Please login using the profile icon in the upper right corner of ToyBox OS.');
            
            // Store callback and wait for auth
            window.pendingAuthCallback = callback;
            
            // Start checking for auth
            const authChecker = setInterval(() => {
                if (checkToyBoxAuth()) {
                    clearInterval(authChecker);
                    if (window.pendingAuthCallback) {
                        window.pendingAuthCallback();
                        window.pendingAuthCallback = null;
                    }
                }
            }, 1000);
        }`;
        
        html = html.replace(
            /function showAuth\([^)]*\) \{[\s\S]*?\n        \}/,
            simplerShowAuth
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
        
        console.log('✅ Simple fix applied!');
        console.log('📦 MacWord now reads auth directly from localStorage');
        console.log('🔄 Checks every 2 seconds for login changes');
        console.log('\nTest: Reload ToyBox OS, login, open MacWord');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

simpleAuthFix();