#!/usr/bin/env node

/**
 * Move filter tabs to below the issue creation form
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env.local') });
if (!process.env.SUPABASE_URL) {
    dotenv.config({ path: path.join(__dirname, '../../.env') });
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function moveFiltersBelow() {
    try {
        console.log('🔧 Moving filter tabs below the form...\n');
        
        // Get current HTML
        const { data: current } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        let html = current.html_content;
        
        // Backup first
        const backupPath = path.join(__dirname, '..', 'backups', `issue-tracker_before_move_filters_${Date.now()}.html`);
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.writeFile(backupPath, html);
        console.log(`✓ Backup created: ${path.basename(backupPath)}`);
        
        // Find and remove the current filter tabs
        const filterTabsPattern = /<div class="filter-tabs">[\s\S]*?<\/div>(?=\s*<div class="form-section">)/;
        const filterTabsMatch = html.match(filterTabsPattern);
        
        if (filterTabsMatch) {
            // Save the filter tabs HTML
            const filterTabsHTML = filterTabsMatch[0];
            
            // Remove from current position (above form)
            html = html.replace(filterTabsPattern, '');
            console.log('✓ Removed filter tabs from above form');
            
            // Find the end of the form section
            const formEndPattern = /<\/div>\s*<!-- Issues Display Container -->/;
            
            // Insert filter tabs after form, before issues display
            const replacement = `</div>

        ${filterTabsHTML}
        
        <!-- Issues Display Container -->`;
            
            html = html.replace(formEndPattern, replacement);
            console.log('✓ Added filter tabs below form');
        } else {
            console.log('⚠️  Could not find filter tabs in current position');
        }
        
        // Save the updated HTML
        const { error } = await supabase
            .from('wtaf_content')
            .update({
                html_content: html,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker');
        
        if (error) throw error;
        
        console.log('\n🎉 Filter tabs moved successfully!');
        console.log('\n📋 What changed:');
        console.log('  • Filter tabs now appear BELOW the issue creation form');
        console.log('  • Form comes first, then filters, then issues list');
        
        console.log('\n🔄 Refresh the page:');
        console.log('  https://webtoys.ai/public/toybox-issue-tracker');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

moveFiltersBelow();