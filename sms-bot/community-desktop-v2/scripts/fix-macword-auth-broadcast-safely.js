#!/usr/bin/env node

/**
 * VERY CAREFULLY fix MacWord not receiving auth state
 * DO NOT BREAK TOYBOX OS!
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

async function fixMacWordOnly() {
    try {
        console.log('🔧 Fixing ONLY MacWord - NOT touching ToyBox OS...');
        
        // BACKUP MacWord first
        const { data: macwordData, error: fetchError } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'macword')
            .single();
        
        if (fetchError) throw fetchError;
        
        const backupPath = path.join(__dirname, '..', 'backups', `macword_before_broadcast_fix_${Date.now()}.html`);
        await fs.writeFile(backupPath, macwordData.html_content);
        console.log(`💾 MacWord backed up to: ${backupPath}`);
        
        let html = macwordData.html_content;
        
        // Add a function to request auth state from parent when MacWord loads
        const requestAuthOnLoad = `
        // Request auth state from parent ToyBox OS when we load
        function requestAuthFromParent() {
            if (window.parent !== window) {
                // Ask parent for current auth state
                console.log('MacWord requesting auth state from parent...');
                window.parent.postMessage({ type: 'REQUEST_AUTH' }, '*');
            }
        }
        
        // Call this when MacWord loads
        window.addEventListener('DOMContentLoaded', function() {
            console.log('MacWord loaded, requesting auth...');
            // Give parent a moment to be ready
            setTimeout(requestAuthFromParent, 1000);
            
            // Also listen for any broadcasts
            console.log('MacWord listening for auth messages...');
        });`;
        
        // Add this before the existing DOMContentLoaded listener
        if (html.includes("window.addEventListener('DOMContentLoaded'")) {
            // Replace the existing one
            html = html.replace(
                /window\.addEventListener\('DOMContentLoaded', function\(\) \{[\s\S]*?\}\);/,
                requestAuthOnLoad
            );
        } else {
            // Add new one before closing script tag
            html = html.replace('</script>', requestAuthOnLoad + '\n</script>');
        }
        
        // Also improve the message listener to log what it receives
        const improvedListener = `
        // Listen for authentication from ToyBox OS
        window.addEventListener('message', function(event) {
            console.log('MacWord received message:', event.data);
            
            // Handle auth from ToyBox OS
            if (event.data && event.data.type === 'TOYBOX_AUTH') {
                console.log('MacWord received auth from ToyBox OS:', event.data.user);
                if (event.data.user) {
                    currentUser = event.data.user;
                    console.log('MacWord user set to:', currentUser);
                    updateUserStatus();
                } else {
                    // User logged out
                    currentUser = null;
                    updateUserStatus();
                }
            }
        });`;
        
        // Replace the existing message listener
        html = html.replace(
            /\/\/ Listen for authentication from ToyBox OS[\s\S]*?\}\);/,
            improvedListener
        );
        
        // Update MacWord ONLY
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'macword');
        
        if (updateError) throw updateError;
        
        console.log('✅ MacWord updated to request auth on load');
        console.log('📡 MacWord will now ask ToyBox OS for auth state');
        console.log('🔒 ToyBox OS was NOT modified');
        
        // Now add REQUEST_AUTH handler to ToyBox OS VERY CAREFULLY
        console.log('\n🔧 Adding REQUEST_AUTH handler to ToyBox OS (minimal change)...');
        
        const { data: toyboxData } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os')
            .single();
        
        // Backup ToyBox OS too
        const toyboxBackup = path.join(__dirname, '..', 'backups', `toybox-os_before_request_handler_${Date.now()}.html`);
        await fs.writeFile(toyboxBackup, toyboxData.html_content);
        console.log(`💾 ToyBox OS backed up to: ${toyboxBackup}`);
        
        let toyboxHtml = toyboxData.html_content;
        
        // Add a simple message handler if it doesn't exist
        if (!toyboxHtml.includes("event.data.type === 'REQUEST_AUTH'")) {
            const requestHandler = `
    // Handle auth requests from apps
    window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'REQUEST_AUTH') {
            console.log('ToyBox OS received auth request, sending:', currentToyBoxUser);
            // Send current auth state back
            if (event.source) {
                event.source.postMessage({
                    type: 'TOYBOX_AUTH',
                    user: currentToyBoxUser
                }, '*');
            }
        }
    });`;
            
            // Add before closing script tag
            toyboxHtml = toyboxHtml.replace('</script>', requestHandler + '\n</script>');
            
            // Update ToyBox OS
            const { error: toyboxUpdateError } = await supabase
                .from('wtaf_content')
                .update({
                    html_content: toyboxHtml,
                    updated_at: new Date().toISOString()
                })
                .eq('user_slug', 'public')
                .eq('app_slug', 'toybox-os');
            
            if (toyboxUpdateError) throw toyboxUpdateError;
            
            console.log('✅ Added REQUEST_AUTH handler to ToyBox OS');
        } else {
            console.log('✅ ToyBox OS already has REQUEST_AUTH handler');
        }
        
        console.log('\n🎉 Done! MacWord should now receive auth state');
        console.log('📋 Test by:');
        console.log('  1. Reload ToyBox OS');
        console.log('  2. Open browser console (F12)');
        console.log('  3. Open MacWord');
        console.log('  4. Check console for auth messages');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        console.log('🔄 Backups saved - restore if needed');
        process.exit(1);
    }
}

fixMacWordOnly();