#!/usr/bin/env node

/**
 * Remove title bar and System Status header, keep only issue count and login info
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

async function removeTitleAndHeader() {
    try {
        console.log('🧹 Removing title bar and System Status header...\n');
        
        // Get current HTML
        const { data: current } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        let html = current.html_content;
        
        // Backup first
        const backupPath = path.join(__dirname, '..', 'backups', `issue-tracker_before_header_removal_${Date.now()}.html`);
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.writeFile(backupPath, html);
        console.log(`✓ Backup created: ${path.basename(backupPath)}`);
        
        // 1. Remove the entire Classic Mac Title Bar section
        const titleBarPattern = /<!-- Classic Mac Title Bar -->[\s\S]*?<\/div>\s*(?=<div class="main-content">)/;
        html = html.replace(titleBarPattern, '');
        console.log('✓ Removed Classic Mac Title Bar');
        
        // 2. Remove the System Status header but keep the content divs
        // Find and remove just the header line
        html = html.replace('<div class="system-header">System Status</div>', '');
        console.log('✓ Removed System Status header');
        
        // 3. Clean up any empty wrapper divs that might be left
        // Remove empty system-status wrapper if it exists with no content
        html = html.replace(/<div class="system-status">\s*<\/div>/g, '');
        
        // 4. Make sure the info divs (lastIssueInfo and currentUserInfo) are still visible
        // They should remain where they are, just without the header
        
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
        
        console.log('\n✅ Removed title bar and System Status header!');
        console.log('Kept: Issue count and login info');
        console.log('\nRefresh: https://webtoys.ai/public/toybox-issue-tracker');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

removeTitleAndHeader();