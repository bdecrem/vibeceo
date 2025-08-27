#!/usr/bin/env node

/**
 * Remove title bar and header from Issue Tracker
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try multiple paths for .env files
dotenv.config({ path: path.join(__dirname, '../../.env.local') });
if (!process.env.SUPABASE_URL) {
    dotenv.config({ path: path.join(__dirname, '../../.env') });
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function fixIssueTrackerHeader() {
    try {
        console.log('🧹 Removing ALL header elements from Issue Tracker...\n');
        
        // Get current HTML
        const { data: current } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .single();
        
        let html = current.html_content;
        
        // Create backup
        const timestamp = new Date().toISOString()
            .replace(/:/g, '-')
            .replace(/\./g, '-')
            .replace('T', '_')
            .slice(0, -5);
        
        const backupPath = path.join(__dirname, '..', 'backups', `issue-tracker_${timestamp}.html`);
        await fs.mkdir(path.dirname(backupPath), { recursive: true });
        await fs.writeFile(backupPath, html);
        console.log(`✓ Backup created: ${path.basename(backupPath)}`);
        
        // Remove ALL header elements completely
        // 1. Remove the entire header div with window controls and title
        const headerPattern = /<div class="header">[\s\S]*?<\/div>\s*<div class="main-content">/;
        html = html.replace(headerPattern, '<div class="main-content">');
        console.log('✓ Removed entire header section');
        
        // 2. Remove any system-header divs
        html = html.replace(/<div class="system-header">[\s\S]*?<\/div>/g, '');
        console.log('✓ Removed system header');
        
        // 3. Remove window-title divs
        html = html.replace(/<div class="window-title">[\s\S]*?<\/div>/g, '');
        console.log('✓ Removed window title');
        
        // 4. Clean up any remaining title bar references
        html = html.replace(/<!-- Classic Mac Title Bar -->[\s\S]*?<!-- End Title Bar -->/g, '');
        
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
        
        console.log('\n✅ Successfully removed ALL header elements!');
        console.log('The page now starts directly with the issue info and form.');
        console.log('\nRefresh: https://webtoys.ai/public/toybox-issue-tracker');
        
    } catch (error) {
        console.error('❌ Failed:', error);
        process.exit(1);
    }
}

fixIssueTrackerHeader();