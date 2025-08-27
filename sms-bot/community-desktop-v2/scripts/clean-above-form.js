#!/usr/bin/env node

/**
 * Clean up the area above Submit New Issue - remove system status info
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

async function cleanAboveForm() {
    try {
        console.log('🧹 Cleaning up area above Submit New Issue form...\n');
        
        // Get current HTML
        const { data: current } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        let html = current.html_content;
        
        // Backup first
        const backupPath = path.join(__dirname, '..', 'backups', `issue-tracker_before_cleanup_${Date.now()}.html`);
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.writeFile(backupPath, html);
        console.log(`✓ Backup created: ${path.basename(backupPath)}`);
        
        // Remove the system-status div entirely
        const systemStatusPattern = /<div class="system-status">[\s\S]*?<\/div>\s*(?=<\/div>)/;
        html = html.replace(systemStatusPattern, '');
        console.log('✓ Removed system status box');
        
        // Also remove any leftover admin badge if it's outside the form
        const adminBadgePattern = /<div class="admin-badge">ADMIN MODE ACTIVE<\/div>\s*/g;
        // Only remove it if it's NOT inside the form
        const beforeForm = html.substring(0, html.indexOf('<form id="issueForm">'));
        const formAndAfter = html.substring(html.indexOf('<form id="issueForm">'));
        
        const cleanedBeforeForm = beforeForm.replace(adminBadgePattern, '');
        html = cleanedBeforeForm + formAndAfter;
        console.log('✓ Cleaned up admin badges outside form');
        
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
        
        console.log('\n✅ Cleaned up the area above Submit New Issue!');
        console.log('The form is now cleaner with no system status info above it.');
        console.log('\nRefresh: https://webtoys.ai/public/toybox-issue-tracker');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

cleanAboveForm();