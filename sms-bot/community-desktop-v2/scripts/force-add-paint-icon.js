#!/usr/bin/env node

/**
 * Force add the paint icon to desktop
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

async function forceAddIcon() {
    try {
        console.log('🎨 Force-adding paint icon to desktop...');
        
        const { data: toyboxData } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os')
            .single();
        
        let html = toyboxData.html_content;
        
        // Backup
        const backupPath = path.join(__dirname, '..', 'backups', `toybox_force_paint_${Date.now()}.html`);
        await fs.writeFile(backupPath, html);
        console.log(`💾 Backup saved: ${backupPath}`);
        
        // Add paint icon - find the last desktop icon and add after it
        const paintIcon = `
            <div class="desktop-icon" onclick="openWindowedApp('toybox-wave-wood-deconstructing')">
                <div class="icon">🎨</div>
                <div class="label">Paint</div>
            </div>`;
        
        // Find the desktop-icons container
        const desktopPattern = /<div class="desktop-icons">/;
        const match = html.match(desktopPattern);
        
        if (match) {
            // Find the closing tag of desktop-icons
            const startIndex = match.index + match[0].length;
            const endPattern = html.indexOf('</div><!-- desktop-icons -->', startIndex);
            
            if (endPattern > -1) {
                // Insert before the closing tag
                html = html.slice(0, endPattern) + paintIcon + '\n        ' + html.slice(endPattern);
                console.log('✅ Added paint icon to desktop');
            } else {
                // Try a different approach - add after the last desktop-icon
                const lastIconPattern = /<div class="desktop-icon"[\s\S]*?<\/div>\s*<\/div>(?![\s\S]*<div class="desktop-icon")/;
                const lastIcon = html.match(lastIconPattern);
                if (lastIcon) {
                    const insertPoint = lastIcon.index + lastIcon[0].length;
                    html = html.slice(0, insertPoint) + '\n' + paintIcon + html.slice(insertPoint);
                    console.log('✅ Added paint icon after last icon');
                }
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
        
        console.log('\n✅ Paint icon FORCED onto desktop!');
        console.log('🎨 Reload ToyBox OS - you should see Paint icon now');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

forceAddIcon();