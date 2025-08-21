#!/usr/bin/env node

/**
 * Deploy MacWord to Supabase and add to ToyBox OS
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

async function deployMacWord() {
    try {
        console.log('📝 Deploying MacWord to Supabase...');
        
        // Read MacWord HTML
        const htmlPath = path.join(__dirname, '..', 'macword.html');
        const htmlContent = await fs.readFile(htmlPath, 'utf-8');
        
        // Check if MacWord already exists
        const { data: existing } = await supabase
            .from('wtaf_content')
            .select('id')
            .eq('user_slug', 'public')
            .eq('app_slug', 'macword')
            .single();
        
        if (existing) {
            // Update existing
            const { error } = await supabase
                .from('wtaf_content')
                .update({
                    html_content: htmlContent,
                    updated_at: new Date().toISOString()
                })
                .eq('id', existing.id);
            
            if (error) throw error;
            console.log('✅ Updated existing MacWord app');
        } else {
            // Create new
            const { error } = await supabase
                .from('wtaf_content')
                .insert({
                    user_slug: 'public',
                    app_slug: 'macword',
                    html_content: htmlContent,
                    original_prompt: 'MacWord - A classic text editor with ZAD authentication for ToyBox OS'
                });
            
            if (error) throw error;
            console.log('✅ Created new MacWord app');
        }
        
        // Now add MacWord to ToyBox OS desktop
        console.log('🖥️ Adding MacWord to ToyBox OS desktop...');
        
        // Fetch current ToyBox OS
        const { data: toyboxData, error: fetchError } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os')
            .single();
        
        if (fetchError) throw fetchError;
        
        let toyboxHtml = toyboxData.html_content;
        
        // Check if MacWord is already registered
        if (!toyboxHtml.includes("'macword':")) {
            // Add to windowedApps registry
            const appsRegistryPattern = /window\.windowedApps = \{([^}]*)\}/s;
            const appsMatch = toyboxHtml.match(appsRegistryPattern);
            
            if (appsMatch) {
                const newAppEntry = `
            'macword': {
                name: 'MacWord',
                url: '/public/macword',
                icon: '📝',
                width: 900,
                height: 650
            },`;
                
                const updatedRegistry = appsMatch[0].replace(
                    'window.windowedApps = {',
                    'window.windowedApps = {' + newAppEntry
                );
                
                toyboxHtml = toyboxHtml.replace(appsMatch[0], updatedRegistry);
                console.log('✅ Added MacWord to windowedApps registry');
            }
        }
        
        // Check if MacWord icon is already on desktop
        if (!toyboxHtml.includes('openWindowedApp(\'macword\')')) {
            // Find the desktop icons section
            const desktopEndPattern = /<!-- Desktop Icons End -->/;
            const insertPoint = toyboxHtml.search(desktopEndPattern);
            
            if (insertPoint > -1) {
                const macwordIcon = `
            <div class="desktop-icon" onclick="openWindowedApp('macword')">
                <div class="icon">📝</div>
                <div class="label">MacWord</div>
            </div>
            `;
                
                toyboxHtml = toyboxHtml.slice(0, insertPoint) + macwordIcon + toyboxHtml.slice(insertPoint);
                console.log('✅ Added MacWord icon to desktop');
            } else {
                console.log('⚠️ Could not find desktop icons section, appending to end');
                // Find the last desktop icon and add after it
                const lastIconPattern = /<div class="desktop-icon"[^>]*>[\s\S]*?<\/div>\s*<\/div>/g;
                let lastMatch;
                let match;
                while ((match = lastIconPattern.exec(toyboxHtml)) !== null) {
                    lastMatch = match;
                }
                
                if (lastMatch) {
                    const insertPoint = lastMatch.index + lastMatch[0].length;
                    const macwordIcon = `
            
            <div class="desktop-icon" onclick="openWindowedApp('macword')">
                <div class="icon">📝</div>
                <div class="label">MacWord</div>
            </div>`;
                    
                    toyboxHtml = toyboxHtml.slice(0, insertPoint) + macwordIcon + toyboxHtml.slice(insertPoint);
                }
            }
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
        
        console.log('✅ MacWord successfully deployed!');
        console.log('🌐 Available at: https://webtoys.ai/public/macword');
        console.log('🖥️ Also available in ToyBox OS: https://webtoys.ai/public/toybox-os');
        
    } catch (error) {
        console.error('❌ Deployment failed:', error);
        process.exit(1);
    }
}

// Run deployment
deployMacWord();