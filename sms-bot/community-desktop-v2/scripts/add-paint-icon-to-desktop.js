#!/usr/bin/env node

/**
 * Add the converted paint app icon to ToyBox OS desktop
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

async function addPaintIcon() {
    try {
        console.log('🎨 Adding paint app icon to desktop...');
        
        // Fetch ToyBox OS
        const { data: toyboxData } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os')
            .single();
        
        let html = toyboxData.html_content;
        
        // Backup
        const backupPath = path.join(__dirname, '..', 'backups', `toybox_before_paint_icon_${Date.now()}.html`);
        await fs.writeFile(backupPath, html);
        console.log(`💾 Backup saved: ${backupPath}`);
        
        // Check if icon already exists
        if (html.includes('toybox-wave-wood-deconstructing')) {
            console.log('✅ Icon already exists on desktop');
            return;
        }
        
        // Add the paint app icon after the MacWord icon
        const paintIcon = `
            <div class="desktop-icon" onclick="openWindowedApp('toybox-wave-wood-deconstructing')">
                <div class="icon">🎨</div>
                <div class="label">Paint</div>
            </div>`;
        
        // Find where to insert - after MacWord
        const macwordPattern = /<div class="desktop-icon"[^>]*onclick="openWindowedApp\('macword'\)"[^>]*>[\s\S]*?<\/div>\s*<\/div>/;
        const macwordMatch = html.match(macwordPattern);
        
        if (macwordMatch) {
            // Insert after MacWord
            const insertPoint = macwordMatch.index + macwordMatch[0].length;
            html = html.slice(0, insertPoint) + '\n' + paintIcon + html.slice(insertPoint);
            console.log('✅ Added paint icon after MacWord');
        } else {
            // Insert after Chat if MacWord not found
            const chatPattern = /<div class="desktop-icon"[^>]*onclick="openWindowedApp\('toybox-chat'\)"[^>]*>[\s\S]*?<\/div>\s*<\/div>/;
            const chatMatch = html.match(chatPattern);
            
            if (chatMatch) {
                const insertPoint = chatMatch.index + chatMatch[0].length;
                html = html.slice(0, insertPoint) + '\n' + paintIcon + html.slice(insertPoint);
                console.log('✅ Added paint icon after Chat');
            } else {
                console.log('⚠️ Could not find good insertion point');
            }
        }
        
        // Update ToyBox OS
        const { error: updateError } = await supabase
            .from('wtaf_content')
            .update({
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os');
        
        if (updateError) throw updateError;
        
        console.log('\n✅ Paint app icon added to desktop!');
        console.log('🎨 Reload ToyBox OS to see the Paint icon');
        console.log('📱 Click it to open your converted paint app');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

addPaintIcon();