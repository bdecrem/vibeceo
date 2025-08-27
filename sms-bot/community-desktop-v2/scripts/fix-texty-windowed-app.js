#!/usr/bin/env node

/**
 * Fix TEXTY to use openWindowedApp pattern in webtoys-os-v2
 * 1. Add TEXTY to windowedApps registry
 * 2. Update TEXTY icon to use openWindowedApp('texty')
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));

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

async function fetchCurrentWebToysOSv2() {
    const { data, error } = await supabase
        .from('wtaf_content')
        .select('html_content, updated_at')
        .eq('user_slug', 'public')
        .eq('app_slug', 'webtoys-os-v2')
        .single();
    
    if (error) {
        throw new Error(`Failed to fetch webtoys-os-v2: ${error.message}`);
    }
    
    return data;
}

async function safeUpdateWebToysOSv2(newHtml, description = 'Update') {
    try {
        console.log('\n🔒 Safe Update Process Starting for webtoys-os-v2...');
        
        // Step 1: Fetch and backup current version
        console.log('1️⃣  Backing up current webtoys-os-v2...');
        const current = await fetchCurrentWebToysOSv2();
        const timestamp = new Date().toISOString()
            .replace(/:/g, '-')
            .replace(/\./g, '-')
            .replace('T', '_')
            .slice(0, -5);
        
        const backupFile = path.join(process.cwd(), `webtoys-os-v2_backup_${timestamp}.html`);
        fs.writeFileSync(backupFile, current.html_content);
        console.log(`💾 Backup created: ${backupFile}`);
        
        // Step 2: Update in Supabase
        console.log('2️⃣  Applying update to Supabase...');
        const { error } = await supabase
            .from('wtaf_content')
            .update({
                html_content: newHtml,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'webtoys-os-v2');
        
        if (error) {
            throw new Error(`Update failed: ${error.message}`);
        }
        
        // Step 3: Save new version locally
        console.log('3️⃣  Saving new version locally...');
        fs.writeFileSync('current-webtoys-os-v2-fixed.html', newHtml);
        
        console.log(`✅ webtoys-os-v2 updated successfully: ${description}`);
        console.log('🔗 Live at: https://webtoys.ai/public/webtoys-os-v2');
        
        return { success: true, backup: backupFile };
        
    } catch (error) {
        console.error('❌ webtoys-os-v2 update failed:', error.message);
        console.log('🔄 Your backup is safe in the current directory');
        throw error;
    }
}

async function fixTextyApp() {
    console.log('🔧 Fixing TEXTY to use windowed app pattern...');
    
    // Fetch current content
    const current = await fetchCurrentWebToysOSv2();
    let html = current.html_content;
    
    // 1. Add TEXTY to windowedApps registry
    // Find the windowedApps object and add texty entry
    const textyRegistryEntry = `
        'texty': {
            name: 'TEXTY',
            url: '/public/texty',
            icon: '📄',
            width: 700,
            height: 500
        },`;
    
    // Find where to insert it (before the closing brace of windowedApps)
    const windowedAppsEnd = html.lastIndexOf('        };');
    if (windowedAppsEnd === -1) {
        throw new Error('Could not find windowedApps closing brace');
    }
    
    // Insert the texty entry
    html = html.slice(0, windowedAppsEnd) + textyRegistryEntry + '\n' + html.slice(windowedAppsEnd);
    
    // 2. Update TEXTY icon onclick to use openWindowedApp
    const oldTextyIcon = `onclick="window.open('/public/texty', 'texty', 'width=700,height=500,menubar=no,toolbar=no')"`;
    const newTextyIcon = `onclick="openWindowedApp('texty')"`;
    
    html = html.replace(oldTextyIcon, newTextyIcon);
    
    console.log('✅ Fixed TEXTY icon and registry entry');
    
    // Update the database
    await safeUpdateWebToysOSv2(html, 'Fix TEXTY to use openWindowedApp pattern with proper windowedApps registry entry');
    
    console.log('🎉 TEXTY is now properly integrated as a windowed app!');
}

// Run the fix
fixTextyApp().catch(console.error);