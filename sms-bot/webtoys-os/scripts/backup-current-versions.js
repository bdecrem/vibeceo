#!/usr/bin/env node

/**
 * Backup current WebtoysOS components from database
 * This creates timestamped backups before we start v3 development
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
let result = dotenv.config({ path: path.join(__dirname, '../../.env.local') });
if (result.error) {
    result = dotenv.config({ path: path.join(__dirname, '../../.env') });
    if (result.error) {
        console.error('Error loading .env files:', result.error.message);
        process.exit(1);
    }
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Create backup directory
const backupDir = path.join(__dirname, '../backups-v3-start');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

async function backupWebtoysOS() {
    console.log('📦 Backing up webtoys-os-v2 from database...');
    
    // Fetch current webtoys-os-v2
    const { data, error } = await supabase
        .from('wtaf_content')
        .select('*')
        .eq('user_slug', 'public')
        .eq('app_slug', 'webtoys-os-v2')
        .single();
    
    if (error) {
        console.error('Error fetching webtoys-os-v2:', error);
        return false;
    }
    
    if (!data) {
        console.error('webtoys-os-v2 not found in database');
        return false;
    }
    
    // Save HTML content
    const htmlPath = path.join(backupDir, `webtoys-os-v2_${timestamp}.html`);
    fs.writeFileSync(htmlPath, data.html_content);
    console.log(`✅ Saved webtoys-os-v2 to ${htmlPath}`);
    
    // Save metadata
    const metaPath = path.join(backupDir, `webtoys-os-v2_${timestamp}.json`);
    fs.writeFileSync(metaPath, JSON.stringify({
        app_slug: data.app_slug,
        user_slug: data.user_slug,
        theme_id: data.theme_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
        backup_timestamp: new Date().toISOString(),
        backup_reason: 'Pre-v3 development backup'
    }, null, 2));
    console.log(`✅ Saved metadata to ${metaPath}`);
    
    return true;
}

async function backupTheme() {
    console.log('🎨 Backing up System 7 WOS-v2 theme from database...');
    
    // First get the theme ID from webtoys-os-v2
    const { data: appData } = await supabase
        .from('wtaf_content')
        .select('theme_id')
        .eq('user_slug', 'public')
        .eq('app_slug', 'webtoys-os-v2')
        .single();
    
    if (!appData || !appData.theme_id) {
        console.log('No theme_id found for webtoys-os-v2, skipping theme backup');
        return true;
    }
    
    // Fetch the theme
    const { data, error } = await supabase
        .from('wtaf_themes')
        .select('*')
        .eq('id', appData.theme_id)
        .single();
    
    if (error) {
        console.error('Error fetching theme:', error);
        return false;
    }
    
    if (!data) {
        console.error('Theme not found');
        return false;
    }
    
    // Save CSS content
    const cssPath = path.join(backupDir, `system7-wos-v2_${timestamp}.css`);
    fs.writeFileSync(cssPath, data.css_content);
    console.log(`✅ Saved theme CSS to ${cssPath}`);
    
    // Save metadata
    const metaPath = path.join(backupDir, `system7-wos-v2_${timestamp}_meta.json`);
    fs.writeFileSync(metaPath, JSON.stringify({
        id: data.id,
        name: data.name,
        created_at: data.created_at,
        updated_at: data.updated_at,
        backup_timestamp: new Date().toISOString(),
        backup_reason: 'Pre-v3 development backup'
    }, null, 2));
    console.log(`✅ Saved theme metadata to ${metaPath}`);
    
    return true;
}

async function backupIssueTracker() {
    console.log('📋 Backing up toybox-issue-tracker from database...');
    
    // Fetch current issue tracker
    const { data, error } = await supabase
        .from('wtaf_content')
        .select('*')
        .eq('user_slug', 'public')
        .eq('app_slug', 'toybox-issue-tracker')
        .single();
    
    if (error) {
        console.error('Error fetching toybox-issue-tracker:', error);
        return false;
    }
    
    if (!data) {
        console.error('toybox-issue-tracker not found in database');
        return false;
    }
    
    // Save HTML content
    const htmlPath = path.join(backupDir, `toybox-issue-tracker_${timestamp}.html`);
    fs.writeFileSync(htmlPath, data.html_content);
    console.log(`✅ Saved issue tracker to ${htmlPath}`);
    
    // Save metadata
    const metaPath = path.join(backupDir, `toybox-issue-tracker_${timestamp}.json`);
    fs.writeFileSync(metaPath, JSON.stringify({
        app_slug: data.app_slug,
        user_slug: data.user_slug,
        theme_id: data.theme_id,
        created_at: data.created_at,
        updated_at: data.updated_at,
        backup_timestamp: new Date().toISOString(),
        backup_reason: 'Pre-v3 development backup'
    }, null, 2));
    console.log(`✅ Saved metadata to ${metaPath}`);
    
    return true;
}

async function main() {
    console.log('🚀 Starting WebtoysOS v3 pre-development backup...');
    console.log(`📅 Timestamp: ${timestamp}`);
    console.log(`📂 Backup directory: ${backupDir}\n`);
    
    const results = await Promise.all([
        backupWebtoysOS(),
        backupTheme(),
        backupIssueTracker()
    ]);
    
    if (results.every(r => r)) {
        console.log('\n✅ All backups completed successfully!');
        console.log('📁 Backups saved in:', backupDir);
        console.log('🔒 Original system remains untouched in database');
        console.log('🎯 Ready to start v3 development safely!');
    } else {
        console.error('\n❌ Some backups failed. Please check the errors above.');
        process.exit(1);
    }
}

main().catch(console.error);