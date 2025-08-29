#!/usr/bin/env node

/**
 * Generic ToyBox OS Update Script
 * 
 * This script can handle different types of updates:
 * - HTML changes (content updates)
 * - CSS theme changes 
 * - JavaScript functionality changes
 * 
 * Usage:
 *   node update-toybox.js html "description" --change="specific change"
 *   node update-toybox.js css "description" --change="specific change"
 */

import { fetchCurrentToyBoxOS, safeUpdateToyBoxOS } from './safe-update-wrapper.js';
import { fetchCurrentThemeCSS, safeUpdateThemeCSS } from './safe-css-wrapper.js';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
const result = dotenv.config({ path: '../.env.local' });
if (result.error) {
    console.error('Error loading .env.local:', result.error.message);
    process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

const updateType = process.argv[2]; // 'html' or 'css'
const description = process.argv[3] || 'Generic update';
const changeFlag = process.argv.find(arg => arg.startsWith('--change='));
const changeType = changeFlag ? changeFlag.split('=')[1] : null;

async function updateToyBox() {
    try {
        console.log(`🔧 Applying ${updateType} update: ${description}`);
        
        if (updateType === 'html') {
            await updateHTML();
        } else if (updateType === 'css') {
            await updateCSS();
        } else {
            console.log('Usage: node update-toybox.js [html|css] "description" --change="type"');
            console.log('Available changes:');
            console.log('  HTML: menu-item, icon-removal, padding-adjustment');
            console.log('  CSS: font-size, colors, layout');
            process.exit(1);
        }
        
    } catch (error) {
        console.error('❌ Error updating ToyBox:', error);
        process.exit(1);
    }
}

async function updateHTML() {
    const current = await fetchCurrentToyBoxOS();
    let html = current.html_content;
    
    // Apply specific HTML changes based on changeType
    switch (changeType) {
        case 'padding-adjustment':
            // Template for padding adjustments
            console.log('📏 Adjusting padding values...');
            // Add specific padding changes here
            break;
            
        case 'menu-item':
            // Template for menu item changes
            console.log('📋 Updating menu items...');
            // Add menu item changes here
            break;
            
        case 'icon-removal':
            // Template for icon removal
            console.log('🗑️ Removing icons...');
            // Add icon removal logic here
            break;
            
        default:
            console.log('🔧 Applying custom HTML change...');
            // For custom changes, edit this script with specific modifications
            break;
    }
    
    await safeUpdateToyBoxOS(html, description);
    console.log('✅ HTML updated successfully!');
}

async function updateCSS() {
    console.log('🎨 Updating theme CSS with automatic backup...');
    
    const current = await fetchCurrentThemeCSS();
    let css = current.css_content;
    
    // Apply specific CSS changes based on changeType
    switch (changeType) {
        case 'font-size':
            console.log('📝 Updating font sizes...');
            // Add font size changes here
            break;
            
        case 'colors':
            console.log('🎨 Updating colors...');
            // Add color changes here
            break;
            
        case 'layout':
            console.log('📐 Updating layout...');
            // Add layout changes here
            break;
            
        default:
            console.log('🔧 Applying custom CSS change...');
            // For custom changes, edit this script with specific modifications
            break;
    }
    
    // Use safe CSS update with automatic backup
    await safeUpdateThemeCSS(css, description);
    console.log('✅ CSS updated successfully!');
}

// Run the script
if (require.main === module) {
    updateToyBox();
}

export { updateToyBox, updateHTML, updateCSS };