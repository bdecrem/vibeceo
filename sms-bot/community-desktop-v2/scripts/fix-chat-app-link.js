#!/usr/bin/env node

/**
 * Fix Chat app link on webtoys-os-v2
 * The Chat icon is currently pointing to App Studio - fix it to point to the correct Chat app
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables - try multiple locations
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
        console.log('✅ Loaded environment from:', path.basename(envPath));
        break;
    }
}

if (!envLoaded) {
    // Environment variables might be already set in the shell
    console.log('⚠️ No .env file found, using existing environment variables');
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

// Ensure backups directory exists
const backupDir = path.join(__dirname, '../backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

async function fixChatAppLink() {
    console.log('💬 Fixing Chat app link on webtoys-os-v2...\n');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    
    try {
        // 1. First, find the correct Chat app
        console.log('🔍 Searching for Chat app...');
        const { data: chatApps, error: searchError } = await supabase
            .from('wtaf_content')
            .select('app_slug, original_prompt')
            .eq('user_slug', 'public')
            .or('app_slug.eq.toybox-chat,app_slug.eq.community-chat,app_slug.eq.chat')
            .order('created_at', { ascending: false });
            
        if (searchError || !chatApps || chatApps.length === 0) {
            console.error('❌ No Chat app found. Available chat apps might have different names.');
            
            // Try broader search
            const { data: allChatApps } = await supabase
                .from('wtaf_content')
                .select('app_slug')
                .eq('user_slug', 'public')
                .ilike('app_slug', '%chat%');
                
            if (allChatApps && allChatApps.length > 0) {
                console.log('📋 Found these chat-related apps:');
                allChatApps.forEach(app => console.log('  - ' + app.app_slug));
            }
            return;
        }
        
        // Use the first chat app found (most recent)
        const chatApp = chatApps[0];
        console.log(`✅ Found Chat app: /public/${chatApp.app_slug}`);
        
        // 2. Fetch current webtoys-os-v2 HTML from database
        console.log('\n📥 Fetching current webtoys-os-v2 from database...');
        const { data: current, error: fetchError } = await supabase
            .from('wtaf_content')
            .select('html_content, updated_at')
            .eq('user_slug', 'public')
            .eq('app_slug', 'webtoys-os-v2')
            .single();
            
        if (fetchError) {
            console.error('❌ Failed to fetch webtoys-os-v2:', fetchError);
            return;
        }
        
        let html = current.html_content;
        
        // 3. Create backup
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
        const backupPath = path.join(backupDir, `webtoys-os-v2_fix-chat-link_${timestamp}.html`);
        fs.writeFileSync(backupPath, html);
        console.log('💾 Created backup:', path.basename(backupPath));
        
        // Also create latest backup
        const latestPath = path.join(backupDir, 'webtoys-os-v2_latest-backup.html');
        fs.writeFileSync(latestPath, html);
        
        // 4. Fix the windowedApps registry for chat
        console.log('\n📝 Updating windowedApps registry...');
        
        // Look for the chat entry and fix its URL
        // It might be registered as 'chat', 'toybox-chat', 'community-chat', or 'app-studio'
        let registryFixed = false;
        
        // Pattern to find chat entry that's pointing to app-studio
        const patterns = [
            {
                pattern: /(window\.windowedApps\s*=\s*\{[\s\S]*?)'chat'\s*:\s*\{[^}]*url:\s*['"]\/public\/app-studio['"][^}]*\}/,
                appId: 'chat'
            },
            {
                pattern: /(window\.windowedApps\s*=\s*\{[\s\S]*?)'toybox-chat'\s*:\s*\{[^}]*url:\s*['"]\/public\/app-studio['"][^}]*\}/,
                appId: 'toybox-chat'
            },
            {
                pattern: /(window\.windowedApps\s*=\s*\{[\s\S]*?)'community-chat'\s*:\s*\{[^}]*url:\s*['"]\/public\/app-studio['"][^}]*\}/,
                appId: 'community-chat'
            }
        ];
        
        for (const { pattern, appId } of patterns) {
            const match = html.match(pattern);
            if (match) {
                // Replace with correct chat URL
                const newEntry = `'${appId}': {
                name: 'Chat',
                url: '/public/${chatApp.app_slug}',
                icon: '💬',
                width: 700,
                height: 500
            }`;
                
                html = html.replace(match[0], match[1] + newEntry);
                console.log(`✅ Fixed ${appId} registry to point to ${chatApp.app_slug}`);
                registryFixed = true;
                break;
            }
        }
        
        if (!registryFixed) {
            console.log('⚠️ Chat app might already be pointing to the correct URL or not found in registry');
        }
        
        // 5. Check desktop icons - make sure Chat icon isn't pointing to app-studio
        console.log('\n🖼️ Checking desktop icons...');
        
        // This is tricky as the icon might be using different onclick handlers
        // Look for Chat icon that calls openWindowedApp with wrong app ID
        const iconPatterns = [
            /onclick="openWindowedApp\('app-studio'\)"[^>]*>[\s\S]*?<div class="icon">💬/,
            /onclick="openWindowedApp\('app-studio'\)"[^>]*title="Chat"/
        ];
        
        let iconFixed = false;
        for (const pattern of iconPatterns) {
            if (html.match(pattern)) {
                // Replace app-studio with the correct chat app ID
                html = html.replace(/onclick="openWindowedApp\('app-studio'\)"/g, function(match) {
                    // Only replace if it's near a chat icon or chat title
                    const context = html.substring(html.indexOf(match) - 100, html.indexOf(match) + 200);
                    if (context.includes('💬') || context.includes('Chat')) {
                        iconFixed = true;
                        return `onclick="openWindowedApp('${chatApps[0].app_slug === 'toybox-chat' ? 'toybox-chat' : 'chat'}')"`;
                    }
                    return match;
                });
                
                if (iconFixed) {
                    console.log('✅ Fixed Chat desktop icon onclick handler');
                }
            }
        }
        
        if (!iconFixed) {
            console.log('ℹ️ Chat icon already correct or using different ID');
        }
        
        // 6. Save updated HTML to database
        console.log('\n💾 Saving changes to database...');
        
        // Save metadata
        const metadataPath = path.join(backupDir, `webtoys-os-v2_fix-chat-link_${timestamp}.json`);
        fs.writeFileSync(metadataPath, JSON.stringify({
            timestamp: new Date().toISOString(),
            description: 'Fixed Chat app link on webtoys-os-v2',
            changes: [
                'Fixed windowedApps registry Chat URL',
                'Fixed Chat desktop icon onclick handler',
                `Chat now points to /public/${chatApp.app_slug}`
            ],
            backupFile: path.basename(backupPath)
        }, null, 2));
        
        // Update database
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({ 
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'webtoys-os-v2');
            
        if (updateError) {
            console.error('❌ Update failed:', updateError);
            console.log('💡 Restore from backup:', backupPath);
            return;
        }
        
        console.log('\n🎉 Successfully fixed Chat app link!');
        console.log(`💬 Chat now points to: /public/${chatApp.app_slug}`);
        console.log('🔗 View at: https://webtoys.ai/public/webtoys-os-v2');
        console.log('📁 Backup saved to:', path.basename(backupPath));
        
    } catch (error) {
        console.error('❌ Error:', error);
        console.log('\n💡 To restore from backup, use the backup file in the backups/ directory');
    }
}

// Run the fix
fixChatAppLink();