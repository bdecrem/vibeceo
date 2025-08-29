#!/usr/bin/env node

/**
 * Deploy TEXTY text editor app and register it with ToyBox OS
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

async function deployTexty() {
    try {
        console.log('🚀 Deploying TEXTY text editor...');
        
        // Step 1: Read the TEXTY HTML
        const textyPath = path.join(__dirname, '..', 'texty.html');
        const textyHtml = await fs.readFile(textyPath, 'utf-8');
        
        // Step 2: Check if TEXTY already exists
        const { data: existing } = await supabase
            .from('wtaf_content')
            .select('id')
            .eq('user_slug', 'public')
            .eq('app_slug', 'texty')
            .single();
        
        if (existing) {
            // Update existing
            console.log('📝 Updating existing TEXTY...');
            const { error } = await supabase
                .from('wtaf_content')
                .update({
                    html_content: textyHtml,
                    updated_at: new Date().toISOString()
                })
                .eq('user_slug', 'public')
                .eq('app_slug', 'texty');
            
            if (error) throw error;
        } else {
            // Create new
            console.log('✨ Creating new TEXTY...');
            const { error } = await supabase
                .from('wtaf_content')
                .insert({
                    user_slug: 'public',
                    app_slug: 'texty',
                    html_content: textyHtml,
                    original_prompt: 'TEXTY - Simple text editor with save/load functionality and authentication integration',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            
            if (error) throw error;
        }
        
        console.log('✅ TEXTY deployed to Supabase');
        console.log('📍 URL: https://webtoys.ai/public/texty');
        
        // Step 3: Register with ToyBox OS
        console.log('\n📱 Registering with ToyBox OS...');
        
        const { data: toyboxData } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os')
            .single();
        
        let toyboxHtml = toyboxData.html_content;
        
        // Backup first
        const backupPath = path.join(__dirname, 'backups', `toybox-os_before_texty_${Date.now()}.html`);
        await fs.writeFile(backupPath, toyboxHtml);
        console.log(`💾 Backup saved: ${backupPath}`);
        
        // Add TEXTY to windowedApps if not already there
        if (!toyboxHtml.includes("'texty':")) {
            const textyRegistration = `
            'texty': {
                name: 'TEXTY',
                url: '/public/texty',
                icon: '📄',
                width: 700,
                height: 500
            },`;
            
            // Add after windowedApps declaration
            toyboxHtml = toyboxHtml.replace(
                'window.windowedApps = {',
                `window.windowedApps = {${textyRegistration}`
            );
            
            console.log('✅ Added TEXTY to app registry');
        }
        
        // Add TEXTY desktop icon if not already there
        if (!toyboxHtml.includes('TEXTY')) {
            const textyIcon = `
            <div class="desktop-icon" onclick="openWindowedApp('texty')">
                <div class="icon">📄</div>
                <div class="label">TEXTY</div>
            </div>`;
            
            // Add after existing icons (before the closing </div> of icons-container)
            const iconsPattern = /(<div class="icons-container">[\s\S]*?)(<\/div>\s*<\/div>)/;
            toyboxHtml = toyboxHtml.replace(iconsPattern, `$1${textyIcon}
        $2`);
            
            console.log('✅ Added TEXTY desktop icon');
        }
        
        // Update ToyBox OS
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({
                html_content: toyboxHtml,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os');
        
        if (updateError) throw updateError;
        
        console.log('✅ ToyBox OS updated with TEXTY app');
        
        console.log('\n🎉 SUCCESS! TEXTY is ready');
        console.log('📋 Features:');
        console.log('  • Simple text editor with syntax highlighting');
        console.log('  • Save and load text files (requires login)');
        console.log('  • Word and character count');
        console.log('  • Uses ToyBox OS authentication');
        console.log('  • File management with list view');
        console.log('  • Windows 95-style UI');
        
        console.log('\n🧪 To test:');
        console.log('  1. Reload ToyBox OS');
        console.log('  2. Login with your account');
        console.log('  3. Click the TEXTY icon');
        console.log('  4. Start editing!');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

// Run
deployTexty();