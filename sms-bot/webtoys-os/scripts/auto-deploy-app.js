#!/usr/bin/env node

/**
 * Auto-deploy any app to WebtoysOS v3
 * This script:
 * 1. Takes an HTML file from /apps directory
 * 2. Deploys it to Supabase
 * 3. Registers it in the desktop config
 * 4. Adds icon to desktop
 * 
 * Usage: node auto-deploy-app.js <app-filename> [icon-emoji]
 * Example: node auto-deploy-app.js paint.html 🎨
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Ensure backups directory exists
const backupDir = path.join(__dirname, '../backups/apps');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

// Load environment variables
let result = dotenv.config({ path: path.join(__dirname, '../../.env.local') });
if (result.error) {
    result = dotenv.config({ path: path.join(__dirname, '../../.env') });
    if (result.error) {
        console.error('Error loading .env files:', result.error.message);
        process.exit(1);
    }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Icon mapping for common app types
const DEFAULT_ICONS = {
    'paint': '🎨',
    'draw': '🎨',
    'calculator': '🧮',
    'calc': '🧮',
    'text': '📝',
    'editor': '📝',
    'notepad': '📝',
    'flappy': '🐦',
    'bird': '🐦',
    'game': '🎮',
    'music': '🎵',
    'chat': '💬',
    'settings': '⚙️',
    'file': '📁',
    'folder': '📁',
    'terminal': '💻',
    'browser': '🌐',
    'email': '📧',
    'calendar': '📅',
    'clock': '🕐',
    'camera': '📷',
    'photo': '🖼️',
    'video': '🎬',
    'audio': '🔊',
    'default': '📱'
};

function guessIcon(appName) {
    const lower = appName.toLowerCase();
    for (const [key, icon] of Object.entries(DEFAULT_ICONS)) {
        if (lower.includes(key)) {
            return icon;
        }
    }
    return DEFAULT_ICONS.default;
}

function generateAppSlug(filename) {
    // Convert filename to app slug
    // paint.html -> toybox-paint
    // text-editor.html -> toybox-text-editor
    const base = filename.replace('.html', '').toLowerCase();
    return `toybox-${base}`;
}

function generateAppId(filename) {
    // Convert filename to app ID for registry
    // paint.html -> paint
    // text-editor.html -> text-editor
    return filename.replace('.html', '').toLowerCase();
}

function generateAppName(filename) {
    // Convert filename to display name
    // paint.html -> Paint
    // text-editor.html -> Text Editor
    const base = filename.replace('.html', '');
    return base
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

async function deployApp(filename, iconOverride = null) {
    console.log(`\n🚀 Auto-deploying ${filename} to WebtoysOS v3...\n`);
    
    // Step 1: Read the app HTML
    const appPath = path.join(__dirname, '../apps', filename);
    if (!fs.existsSync(appPath)) {
        console.error(`❌ App file not found: ${appPath}`);
        process.exit(1);
    }
    
    const htmlContent = fs.readFileSync(appPath, 'utf8');
    console.log(`✅ Read ${filename} (${htmlContent.length} bytes)`);
    
    // Generate app metadata
    const appSlug = generateAppSlug(filename);
    const appId = generateAppId(filename);
    const appName = generateAppName(filename);
    const appIcon = iconOverride || guessIcon(appName);
    
    // Try to detect canvas dimensions from HTML for games
    let appWidth = 800;
    let appHeight = 600;
    let resizable = true;
    
    // Check for window metadata first
    const windowMetaMatch = htmlContent.match(/<meta\s+name=["']window:[^"']+["']\s+content=["']([^"']+)["']/);
    if (windowMetaMatch) {
        const metaContent = windowMetaMatch[1];
        const widthMatch = metaContent.match(/width=(\d+)/);
        const heightMatch = metaContent.match(/height=(\d+)/);
        const resizableMatch = metaContent.match(/resizable=(true|false)/);
        
        if (widthMatch) appWidth = parseInt(widthMatch[1]);
        if (heightMatch) appHeight = parseInt(heightMatch[1]);
        if (resizableMatch) resizable = resizableMatch[1] === 'true';
        
        console.log(`   Detected window metadata: ${appWidth}x${appHeight}, resizable: ${resizable}`);
    } else {
        // Check for canvas element with width/height attributes
        const canvasMatch = htmlContent.match(/<canvas[^>]+width=["'](\d+)["'][^>]+height=["'](\d+)["']/);
        if (canvasMatch) {
            appWidth = parseInt(canvasMatch[1]);
            appHeight = parseInt(canvasMatch[2]);
            resizable = false; // Games with fixed canvas should not be resizable
            console.log(`   Detected canvas size: ${appWidth}x${appHeight}`);
        } else {
            // Check for explicit window size in a comment or meta tag
            const sizeMatch = htmlContent.match(/<!--\s*window-size:\s*(\d+)x(\d+)\s*-->/);
            if (sizeMatch) {
                appWidth = parseInt(sizeMatch[1]);
                appHeight = parseInt(sizeMatch[2]);
                console.log(`   Detected window size from comment: ${appWidth}x${appHeight}`);
            }
        }
    }
    
    console.log(`\n📦 App Metadata:`);
    console.log(`   Slug: ${appSlug}`);
    console.log(`   ID: ${appId}`);
    console.log(`   Name: ${appName}`);
    console.log(`   Icon: ${appIcon}`);
    console.log(`   Dimensions: ${appWidth}x${appHeight} (resizable: ${resizable})`);
    
    // Step 2: Deploy to Supabase
    console.log(`\n📤 Deploying to Supabase...`);
    
    // Check if it already exists
    const { data: existing, error: checkError } = await supabase
        .from('wtaf_content')
        .select('id')
        .eq('user_slug', 'public')
        .eq('app_slug', appSlug)
        .single();
    
    const timestamp = new Date().toISOString();
    
    if (existing) {
        // Backup existing app before updating
        console.log('💾 Creating backup of existing app...');
        const { data: currentApp, error: fetchError } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', appSlug)
            .single();
        
        if (currentApp && currentApp.html_content) {
            const backupTimestamp = new Date().toISOString()
                .replace(/:/g, '-')
                .replace(/\./g, '-')
                .replace('T', '_')
                .slice(0, -5);
            const backupFile = path.join(backupDir, `${appSlug}_${backupTimestamp}_before_update.html`);
            fs.writeFileSync(backupFile, currentApp.html_content);
            console.log(`   Backup saved: ${backupFile}`);
        }
        
        // Update existing
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({
                html_content: htmlContent,
                updated_at: timestamp,
                original_prompt: `${appName} for WebtoysOS v3 - Auto-deployed`
            })
            .eq('user_slug', 'public')
            .eq('app_slug', appSlug);
        
        if (updateError) {
            console.error('❌ Error updating app:', updateError);
            process.exit(1);
        }
        console.log('✅ Updated existing app in database');
    } else {
        // Insert new
        const { error: insertError } = await supabase
            .from('wtaf_content')
            .insert({
                user_slug: 'public',
                app_slug: appSlug,
                html_content: htmlContent,
                created_at: timestamp,
                updated_at: timestamp,
                original_prompt: `${appName} for WebtoysOS v3 - Auto-deployed`
            });
        
        if (insertError) {
            console.error('❌ Error inserting app:', insertError);
            process.exit(1);
        }
        console.log('✅ Inserted new app in database');
    }
    
    // Step 3: Register in desktop config
    console.log('\n📋 Registering in desktop config...');
    
    // Get current desktop config
    const { data: configData, error: configError } = await supabase
        .from('wtaf_desktop_config')
        .select('*')
        .eq('desktop_version', 'webtoys-os-v3')
        .is('user_id', null)  // Get the public/default desktop
        .single();
    
    if (configError) {
        console.error('❌ Error fetching desktop config:', configError);
        console.log('Make sure the wtaf_desktop_config table exists');
        process.exit(1);
    }
    
    // Parse the app registry
    let appRegistry = configData.app_registry || [];
    
    // Check if app is already registered
    const existingIndex = appRegistry.findIndex(app => app.id === appId);
    
    const appEntry = {
        id: appId,
        name: appName,
        url: `/public/${appSlug}`,
        icon: appIcon,
        width: appWidth,
        height: appHeight,
        resizable: resizable,
        category: 'apps'
    };
    
    if (existingIndex >= 0) {
        // Update existing entry
        appRegistry[existingIndex] = appEntry;
        console.log('✅ Updated existing app registration');
    } else {
        // Add new entry
        appRegistry.push(appEntry);
        console.log('✅ Added new app registration');
    }
    
    // Update the desktop config
    const { error: updateConfigError } = await supabase
        .from('wtaf_desktop_config')
        .update({
            app_registry: appRegistry,
            updated_at: timestamp
        })
        .eq('desktop_version', 'webtoys-os-v3')
        .is('user_id', null);
    
    if (updateConfigError) {
        console.error('❌ Error updating desktop config:', updateConfigError);
        process.exit(1);
    }
    
    // Step 4: Add icon position if not exists
    let iconPositions = configData.icon_positions || {};
    
    if (!iconPositions[appId]) {
        // Calculate position based on existing icons
        const existingCount = Object.keys(iconPositions).length;
        const row = Math.floor(existingCount / 8);  // 8 icons per row
        const col = existingCount % 8;
        
        iconPositions[appId] = {
            x: 20 + (col * 100),  // 100px spacing horizontally
            y: 20 + (row * 100)   // 100px spacing vertically
        };
        
        const { error: positionError } = await supabase
            .from('wtaf_desktop_config')
            .update({
                icon_positions: iconPositions
            })
            .eq('desktop_version', 'webtoys-os-v3')
            .is('user_id', null);
        
        if (positionError) {
            console.error('⚠️  Warning: Could not set icon position:', positionError);
        } else {
            console.log(`✅ Set icon position at (${iconPositions[appId].x}, ${iconPositions[appId].y})`);
        }
    }
    
    console.log('\n✨ Deployment complete!');
    console.log(`📍 App URL: https://webtoys.ai/public/${appSlug}`);
    console.log(`🖥️  Desktop: https://webtoys.ai/public/toybox-os-v3-test`);
    console.log(`\nThe ${appName} app should now appear on the desktop with a ${appIcon} icon.`);
    
    return {
        appSlug,
        appId,
        appName,
        appIcon,
        url: `/public/${appSlug}`
    };
}

// Export for use in other scripts
export { deployApp, generateAppSlug, generateAppId, generateAppName, guessIcon };

// If run directly from command line
if (import.meta.url === `file://${process.argv[1]}`) {
    const filename = process.argv[2];
    const icon = process.argv[3];
    
    if (!filename) {
        console.error('❌ Usage: node auto-deploy-app.js <filename> [icon]');
        console.error('   Example: node auto-deploy-app.js paint.html 🎨');
        process.exit(1);
    }
    
    deployApp(filename, icon).catch(console.error);
}