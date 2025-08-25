#!/usr/bin/env node

/**
 * Convert a Webtoys app to a ToyBox OS windowed app
 * Usage: node convert-webtoys-app.js [app-slug]
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });
if (!process.env.SUPABASE_URL) {
    dotenv.config({ path: path.join(__dirname, '..', '.env') });
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function convertWebtoysApp(appSlug) {
    try {
        console.log(`🔄 Converting Webtoys app: ${appSlug}`);
        
        // Step 1: Fetch the Webtoys app from Supabase
        console.log('📥 Fetching app from Webtoys...');
        
        // Try different user slugs where the app might be
        let webtoysApp = null;
        const userSlugs = ['public', 'demo', appSlug.split('-')[0]]; // Try common patterns
        
        for (const userSlug of userSlugs) {
            const { data } = await supabase
                .from('wtaf_content')
                .select('*')
                .eq('app_slug', appSlug)
                .eq('user_slug', userSlug)
                .single();
            
            if (data) {
                webtoysApp = data;
                console.log(`✅ Found app at ${userSlug}/${appSlug}`);
                break;
            }
        }
        
        // If still not found, search more broadly
        if (!webtoysApp) {
            const { data: searchResults } = await supabase
                .from('wtaf_content')
                .select('*')
                .eq('app_slug', appSlug)
                .limit(1);
            
            if (searchResults && searchResults.length > 0) {
                webtoysApp = searchResults[0];
                console.log(`✅ Found app at ${webtoysApp.user_slug}/${appSlug}`);
            }
        }
        
        if (!webtoysApp) {
            throw new Error(`App not found: ${appSlug}`);
        }
        
        // Step 2: Analyze and adapt the HTML
        console.log('🔧 Adapting for ToyBox OS...');
        let html = webtoysApp.html_content;
        
        // Extract title if it exists
        const titleMatch = html.match(/<title>(.*?)<\/title>/);
        const appTitle = titleMatch ? titleMatch[1] : appSlug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        
        // Create ToyBox OS compatible version
        const toyboxSlug = `toybox-${appSlug}`;
        
        // Wrap in proper HTML if needed
        if (!html.includes('<!DOCTYPE html>')) {
            html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${appTitle}</title>
</head>
<body>
${html}
</body>
</html>`;
        }
        
        // Add ToyBox OS compatibility
        const compatibility = `
    <!-- ToyBox OS Compatibility -->
    <script>
        // Listen for ToyBox OS auth if the app uses it
        window.addEventListener('message', function(event) {
            if (event.data && event.data.type === 'TOYBOX_AUTH') {
                console.log('${appTitle} received ToyBox OS auth:', event.data.user);
                // App can use this auth if needed
                window.toyboxUser = event.data.user;
            }
        });
        
        // Notify parent that app is loaded
        if (window.parent !== window) {
            window.parent.postMessage({ 
                type: 'APP_LOADED', 
                app: '${toyboxSlug}' 
            }, '*');
        }
    </script>`;
        
        // Insert compatibility before </body>
        html = html.replace('</body>', compatibility + '\n</body>');
        
        // Step 3: Save the converted app
        console.log('💾 Saving ToyBox OS version...');
        
        // Check if already exists
        const { data: existing } = await supabase
            .from('wtaf_content')
            .select('id')
            .eq('user_slug', 'public')
            .eq('app_slug', toyboxSlug)
            .single();
        
        if (existing) {
            // Update existing
            const { error } = await supabase
                .from('wtaf_content')
                .update({
                    html_content: html,
                    original_prompt: `Converted from Webtoys: ${webtoysApp.original_prompt || appSlug}`,
                    updated_at: new Date().toISOString()
                })
                .eq('user_slug', 'public')
                .eq('app_slug', toyboxSlug);
            
            if (error) throw error;
            console.log('📝 Updated existing ToyBox OS app');
        } else {
            // Create new
            const { error } = await supabase
                .from('wtaf_content')
                .insert({
                    user_slug: 'public',
                    app_slug: toyboxSlug,
                    html_content: html,
                    original_prompt: `Converted from Webtoys: ${webtoysApp.original_prompt || appSlug}`,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                });
            
            if (error) throw error;
            console.log('✨ Created new ToyBox OS app');
        }
        
        // Step 4: Register with ToyBox OS
        console.log('📱 Registering with ToyBox OS...');
        
        const { data: toyboxData } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os')
            .single();
        
        let toyboxHtml = toyboxData.html_content;
        
        // Add to windowedApps registry if not there
        const appKey = `'${toyboxSlug}'`;
        if (!toyboxHtml.includes(appKey)) {
            // Determine icon based on app type
            let icon = '📱'; // Default
            if (appSlug.includes('game')) icon = '🎮';
            else if (appSlug.includes('draw') || appSlug.includes('paint')) icon = '🎨';
            else if (appSlug.includes('calc')) icon = '🧮';
            else if (appSlug.includes('music')) icon = '🎵';
            else if (appSlug.includes('todo') || appSlug.includes('task')) icon = '✅';
            
            const registration = `
            ${appKey}: {
                name: '${appTitle}',
                url: '/public/${toyboxSlug}',
                icon: '${icon}',
                width: 800,
                height: 600
            },`;
            
            toyboxHtml = toyboxHtml.replace(
                'window.windowedApps = {',
                `window.windowedApps = {${registration}`
            );
            
            // Update ToyBox OS
            await supabase
                .from('wtaf_content')
                .update({
                    html_content: toyboxHtml,
                    updated_at: new Date().toISOString()
                })
                .eq('user_slug', 'public')
                .eq('app_slug', 'toybox-os');
            
            console.log('✅ Registered with ToyBox OS');
        }
        
        // Step 5: Add desktop icon
        console.log('🖱️ Adding desktop icon...');
        
        // This would be done by a separate script or manually
        // For now, just provide instructions
        
        console.log('\n✅ SUCCESS! Webtoys app converted to ToyBox OS');
        console.log(`📍 New URL: https://webtoys.ai/public/${toyboxSlug}`);
        console.log(`🏷️ App Name: ${appTitle}`);
        console.log('\n📋 To add desktop icon:');
        console.log(`   Add this to ToyBox OS desktop:`);
        console.log(`   <div class="desktop-icon" onclick="openWindowedApp('${toyboxSlug}')">`);
        console.log(`       <div class="icon">📱</div>`);
        console.log(`       <div class="label">${appTitle}</div>`);
        console.log(`   </div>`);
        
        return {
            success: true,
            toyboxSlug,
            appTitle,
            originalSlug: appSlug
        };
        
    } catch (error) {
        console.error('❌ Conversion failed:', error.message);
        return {
            success: false,
            error: error.message
        };
    }
}

// Run if called directly
if (process.argv[2]) {
    convertWebtoysApp(process.argv[2]);
}

// Export for use by other scripts
export default convertWebtoysApp;