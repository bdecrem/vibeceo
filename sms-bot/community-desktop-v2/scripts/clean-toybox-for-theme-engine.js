#!/usr/bin/env node

import { fetchCurrentToyBoxOS, safeUpdateToyBoxOS } from './safe-update-wrapper.js';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
const result = dotenv.config({ path: '../.env.local' });
if (result.error) {
    console.error('Error loading .env.local:', result.error.message);
    process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function cleanToyBoxForThemeEngine() {
    try {
        console.log('🧹 Cleaning ToyBox OS to use theme engine...');
        
        // Fetch current HTML
        const current = await fetchCurrentToyBoxOS();
        let htmlContent = current.html_content;
        
        console.log('1️⃣  Removing embedded theme CSS...');
        // Remove the entire embedded CSS, keep only minimal structural CSS
        const minimalCSS = `
        /* Minimal structural CSS - themes handle the rest */
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            height: 100vh;
            overflow: hidden;
        }
        
        #desktop {
            position: relative;
            width: 100%;
            height: calc(100vh - 22px);
            padding: 8px;
        }
        
        .desktop-icon {
            position: absolute;
            width: 75px;
            text-align: center;
            cursor: pointer;
            padding: 4px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            user-select: none;
        }
        
        .menu-bar {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            height: 22px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 6px;
            z-index: 2000;
        }
        
        .trash-can {
            position: absolute !important;
            right: 20px;
            bottom: 20px;
        }
        
        #window-container {
            position: absolute;
            top: 22px;
            left: 0;
            right: 0;
            bottom: 0;
            pointer-events: none;
        }
        
        .desktop-window {
            position: absolute;
            display: flex;
            flex-direction: column;
            pointer-events: auto;
            min-width: 200px;
            min-height: 150px;
        }
        
        .window-content {
            flex: 1;
            overflow: hidden;
        }
        
        .window-content iframe {
            width: 100%;
            height: 100%;
            border: none;
        }`;
        
        htmlContent = htmlContent.replace(
            /<style>[\s\S]*?<\/style>/,
            `<style>${minimalCSS}\n    </style>`
        );
        
        console.log('2️⃣  Adding theme class to body...');
        // Add theme class
        htmlContent = htmlContent.replace(
            /<body[^>]*>/,
            '<body class="theme-system7">'
        );
        
        console.log('3️⃣  Keeping menu bar structure...');
        // Menu bar is already there from previous update
        
        // Save the cleaned HTML
        await safeUpdateToyBoxOS(
            htmlContent,
            'Cleaned HTML to use theme engine instead of embedded CSS'
        );
        
        console.log('4️⃣  Setting theme_id in wtaf_content...');
        // Update the database to use the System 7 theme
        const { error } = await supabase
            .from('wtaf_content')
            .update({ 
                theme_id: '2ec89c02-d424-4cf6-81f1-371ca6b9afcf'
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os');
        
        if (error) {
            console.error('❌ Error setting theme_id:', error.message);
        } else {
            console.log('✅ Theme ID set successfully!');
        }
        
        console.log('\n🎉 ToyBox OS now uses the theme engine!');
        console.log('   - Minimal embedded CSS (structure only)');
        console.log('   - System 7 theme loads from wtaf_themes table');
        console.log('   - Theme switching now possible');
        
    } catch (error) {
        console.error('❌ Failed to clean ToyBox OS:', error.message);
        process.exit(1);
    }
}

// Run the cleanup
cleanToyBoxForThemeEngine();