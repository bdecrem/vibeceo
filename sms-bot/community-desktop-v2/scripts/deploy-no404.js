#!/usr/bin/env node

/**
 * Deploy No404 Cloud Text Editor app and register it with ToyBox OS
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

async function deployNo404() {
    try {
        console.log('🚀 Deploying No404 Cloud Text Editor...');
        
        // Step 1: Read the No404 HTML
        const no404Path = path.join(__dirname, '..', 'no404.html');
        const no404Html = await fs.readFile(no404Path, 'utf-8');
        
        // Step 2: Update existing No404 app
        console.log('📝 Updating existing No404 app...');
        const { error } = await supabase
            .from('wtaf_content')
            .update({
                html_content: no404Html,
                original_prompt: 'No404 - Cloud Text Editor with User Authentication and ZAD File Storage',
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'no404');
        
        if (error) throw error;
        
        console.log('✅ No404 deployed to Supabase');
        console.log('📍 URL: https://webtoys.ai/public/no404');
        
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
        const backupPath = path.join(__dirname, 'backups', `toybox-os_before_no404_${Date.now()}.html`);
        await fs.writeFile(backupPath, toyboxHtml);
        console.log(`💾 Backup saved: ${backupPath}`);
        
        // Add No404 to windowedApps if not already there
        if (!toyboxHtml.includes("'no404':")) {
            const no404Registration = `
            'no404': {
                name: 'No404 Text Editor',
                url: '/public/no404',
                icon: '📝',
                width: 800,
                height: 600
            },`;
            
            // Add after windowedApps declaration
            toyboxHtml = toyboxHtml.replace(
                'window.windowedApps = {',
                `window.windowedApps = {${no404Registration}`
            );
            
            console.log('✅ Added No404 to app registry');
        }
        
        // Add No404 desktop icon if not already there
        if (!toyboxHtml.includes('No404 Text Editor')) {
            const no404Icon = `
            <div class="desktop-icon" onclick="openWindowedApp('no404')">
                <div class="icon">📝</div>
                <div class="label">No404</div>
            </div>`;
            
            // Add after existing icons (before the closing </div> of icons-container)
            const iconsPattern = /(<div class="icons-container">[\s\S]*?)(<\/div>\s*<\/div>)/;
            toyboxHtml = toyboxHtml.replace(iconsPattern, `$1${no404Icon}
        $2`);
            
            console.log('✅ Added No404 desktop icon');
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
        
        console.log('✅ ToyBox OS updated with No404 app');
        
        console.log('\n🎉 SUCCESS! No404 is ready');
        console.log('📋 Features:');
        console.log('  • VS Code-style text editor with dark theme');
        console.log('  • Cloud save/load with ZAD API (requires login)');
        console.log('  • Auto-save every 60 seconds when logged in');
        console.log('  • Local file import/export');
        console.log('  • Real-time statistics (lines, words, characters)');
        console.log('  • Drag & drop file loading');
        console.log('  • ToyBox OS authentication integration');
        console.log('  • Keyboard shortcuts (Ctrl+S, Ctrl+O, etc.)');
        
        console.log('\n🧪 To test:');
        console.log('  1. Reload ToyBox OS');
        console.log('  2. Login with your account');
        console.log('  3. Click the No404 icon (📝)');
        console.log('  4. Start editing and saving files to the cloud!');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

// Run
deployNo404();