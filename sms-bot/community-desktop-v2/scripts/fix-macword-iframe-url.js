#!/usr/bin/env node

/**
 * Fix MacWord to load from actual URL instead of srcdoc
 * This will allow localStorage sharing
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

async function fixIframeURL() {
    try {
        console.log('🔧 Fixing MacWord to load from proper URL...');
        
        // Backup ToyBox OS
        const { data: toyboxData } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os')
            .single();
        
        const backupPath = path.join(__dirname, '..', 'backups', `toybox_iframe_fix_${Date.now()}.html`);
        await fs.writeFile(backupPath, toyboxData.html_content);
        console.log(`💾 Backup saved: ${backupPath}`);
        
        let html = toyboxData.html_content;
        
        // Check if MacWord is registered with proper URL
        if (!html.includes("'macword':")) {
            // Add MacWord to windowedApps registry
            const macwordRegistration = `
            'macword': {
                name: 'MacWord',
                url: '/public/macword',
                icon: '📝',
                width: 800,
                height: 600
            },`;
            
            // Add after windowedApps declaration
            html = html.replace(
                'window.windowedApps = {',
                `window.windowedApps = {
            ${macwordRegistration}`
            );
            
            console.log('✅ Added MacWord to app registry');
        } else {
            // Make sure the URL is correct
            html = html.replace(
                /'macword':\s*{[^}]*}/,
                `'macword': {
                name: 'MacWord',
                url: '/public/macword',
                icon: '📝',
                width: 800,
                height: 600
            }`
            );
            console.log('✅ Updated MacWord URL in registry');
        }
        
        // Make sure the desktop icon calls openWindowedApp
        if (html.includes('MacWord')) {
            // Find and fix the MacWord icon
            html = html.replace(
                /<div class="desktop-icon"[^>]*onclick="[^"]*macword[^"]*"[^>]*>[\s\S]*?MacWord[\s\S]*?<\/div>\s*<\/div>/gi,
                `<div class="desktop-icon" onclick="openWindowedApp('macword')">
                <div class="icon">📝</div>
                <div class="label">MacWord</div>
            </div>`
            );
            console.log('✅ Fixed MacWord desktop icon');
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
        
        console.log('\n✅ Fixed! MacWord will now load from proper URL');
        console.log('📍 MacWord will load from: /public/macword');
        console.log('🔐 This allows localStorage sharing with ToyBox OS');
        console.log('\nTest: Reload ToyBox OS and open MacWord');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

fixIframeURL();