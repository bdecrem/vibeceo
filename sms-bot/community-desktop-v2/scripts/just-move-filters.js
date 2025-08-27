#!/usr/bin/env node

/**
 * ONLY move filter tabs to below the form. Change NOTHING else.
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

async function justMoveFilters() {
    try {
        console.log('📍 Moving ONLY the filter tabs to below the form...\n');
        
        // Get current HTML
        const { data: current } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        let html = current.html_content;
        
        // Backup first
        const backupPath = path.join(__dirname, '..', 'backups', `issue-tracker_before_simple_move_${Date.now()}.html`);
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.writeFile(backupPath, html);
        console.log(`✓ Backup created: ${path.basename(backupPath)}`);
        
        // Extract the filter tabs HTML
        const filterTabsHTML = `            <!-- Status Filter Tabs -->
            <div class="filter-tabs">
                <div class="filter-tab active" data-filter="all">All Issues</div>
                <div class="filter-tab" data-filter="open">Open</div>
                <div class="filter-tab" data-filter="closed">Closed</div>
                <div class="filter-tab" data-filter="pending">Pending</div>
                <div class="filter-tab" data-filter="completed">Completed</div>
            </div>`;
        
        // Remove filter tabs from their current position (above the form)
        html = html.replace(`
            <!-- Status Filter Tabs -->
            <div class="filter-tabs">
                <div class="filter-tab active" data-filter="all">All Issues</div>
                <div class="filter-tab" data-filter="open">Open</div>
                <div class="filter-tab" data-filter="closed">Closed</div>
                <div class="filter-tab" data-filter="pending">Pending</div>
                <div class="filter-tab" data-filter="completed">Completed</div>
            </div>
            `, '');
        
        console.log('✓ Removed filter tabs from above the form');
        
        // Add filter tabs after the form section closes
        const formEndMarker = `                </form>
            </div>`;
        
        const formWithFilters = `                </form>
            </div>
            
${filterTabsHTML}`;
        
        html = html.replace(formEndMarker, formWithFilters);
        console.log('✓ Added filter tabs below the form');
        
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
        
        console.log('\n✅ SUCCESS! Filter tabs moved below the form.');
        console.log('Nothing else was changed.');
        console.log('\nRefresh: https://webtoys.ai/public/toybox-issue-tracker');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

justMoveFilters();