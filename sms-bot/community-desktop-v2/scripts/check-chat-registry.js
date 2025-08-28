#!/usr/bin/env node

/**
 * Check the current state of Chat app in windowedApps registry
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
let envLoaded = false;
const envPaths = [
    path.join(__dirname, '../../../.env.local'),
    path.join(__dirname, '../../../.env'),
    path.join(__dirname, '../../.env.local'),
    path.join(__dirname, '../../.env')
];

for (const envPath of envPaths) {
    const result = dotenv.config({ path: envPath });
    if (!result.error) {
        envLoaded = true;
        break;
    }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

async function checkChatRegistry() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    console.log('🔍 Checking Chat app configuration in webtoys-os-v2...\n');
    
    // Fetch current HTML
    const { data: current, error } = await supabase
        .from('wtaf_content')
        .select('html_content')
        .eq('user_slug', 'public')
        .eq('app_slug', 'webtoys-os-v2')
        .single();
        
    if (error) {
        console.error('Failed to fetch webtoys-os-v2');
        return;
    }
    
    const html = current.html_content;
    
    // Extract windowedApps registry
    const registryMatch = html.match(/window\.windowedApps\s*=\s*(\{[\s\S]*?\});/);
    
    if (registryMatch) {
        try {
            // Clean up the JavaScript object string to make it valid JSON
            let registryStr = registryMatch[1];
            
            // Find all app entries
            const appPattern = /'([^']+)':\s*\{([^}]*)\}/g;
            let match;
            const apps = {};
            
            while ((match = appPattern.exec(registryStr)) !== null) {
                const appId = match[1];
                const configStr = match[2];
                
                // Extract URL
                const urlMatch = configStr.match(/url:\s*['"]([^'"]+)['"]/);
                const nameMatch = configStr.match(/name:\s*['"]([^'"]+)['"]/);
                const iconMatch = configStr.match(/icon:\s*['"]([^'"]+)['"]/);
                
                apps[appId] = {
                    name: nameMatch ? nameMatch[1] : 'Unknown',
                    url: urlMatch ? urlMatch[1] : 'Unknown',
                    icon: iconMatch ? iconMatch[1] : '?'
                };
            }
            
            // Check for chat-related apps
            console.log('📋 Chat-related apps in registry:\n');
            let foundChat = false;
            
            for (const [appId, config] of Object.entries(apps)) {
                if (appId.includes('chat') || config.name.toLowerCase().includes('chat') || config.icon === '💬') {
                    foundChat = true;
                    console.log(`  ID: '${appId}'`);
                    console.log(`  Name: ${config.name}`);
                    console.log(`  URL: ${config.url}`);
                    console.log(`  Icon: ${config.icon}`);
                    
                    if (config.url.includes('app-studio')) {
                        console.log('  ⚠️ WARNING: This chat app points to App Studio!');
                    } else if (config.url.includes('chat')) {
                        console.log('  ✅ Correctly points to a chat app');
                    }
                    console.log('');
                }
            }
            
            if (!foundChat) {
                console.log('❌ No chat apps found in registry');
            }
            
            // Also check for App Studio
            console.log('📋 App Studio entries:\n');
            for (const [appId, config] of Object.entries(apps)) {
                if (appId.includes('studio') || config.url.includes('app-studio')) {
                    console.log(`  ID: '${appId}'`);
                    console.log(`  Name: ${config.name}`);
                    console.log(`  URL: ${config.url}`);
                    console.log(`  Icon: ${config.icon}`);
                    console.log('');
                }
            }
            
        } catch (e) {
            console.error('Error parsing registry:', e.message);
        }
    } else {
        console.log('Could not find windowedApps registry');
    }
    
    // Check desktop icons
    console.log('\n🖼️ Desktop Icons:\n');
    
    const iconPattern = /<div class="desktop-icon"[^>]*onclick="openWindowedApp\('([^']+)'\)"[^>]*>[\s\S]*?<div class="icon">([^<]+)<\/div>[\s\S]*?<div class="label">([^<]+)<\/div>/g;
    let iconMatch;
    
    while ((iconMatch = iconPattern.exec(html)) !== null) {
        const appId = iconMatch[1];
        const icon = iconMatch[2].trim();
        const label = iconMatch[3].trim();
        
        if (icon === '💬' || label.toLowerCase().includes('chat') || appId.includes('chat')) {
            console.log(`  Label: "${label}"`);
            console.log(`  Icon: ${icon}`);
            console.log(`  Opens: '${appId}'`);
            
            if (appId === 'app-studio') {
                console.log('  ⚠️ WARNING: Chat icon opens App Studio!');
            }
            console.log('');
        }
    }
}

checkChatRegistry();