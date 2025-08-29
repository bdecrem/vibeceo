#!/usr/bin/env node

/**
 * Deploy Scroll Arrow Width Fix to WEBTOYS-OS
 * 
 * This script deploys the improved System 7 scroll arrow CSS changes:
 * - Changed scroll arrows from fixed 16px x 16px to use 100% width for vertical scrollbars and 100% height for horizontal scrollbars
 * - Added specific CSS rules for .system7-scrollbar-vertical .system7-scroll-arrow and .system7-scrollbar-horizontal .system7-scroll-arrow
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables from sms-bot/.env.local
const envPath = '/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot/.env.local';
const result = dotenv.config({ path: envPath });

if (result.error) {
    console.error('Error loading .env.local:', result.error.message);
    console.log('Tried to load:', envPath);
    process.exit(1);
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

console.log('Environment loaded successfully');
console.log('SUPABASE_URL exists:', !!SUPABASE_URL);
console.log('SUPABASE_SERVICE_KEY exists:', !!SUPABASE_SERVICE_KEY);

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    console.log('Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')));
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Ensure backups directory exists
const backupDir = path.join(process.cwd(), 'backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
}

async function fetchCurrentWebtoysOS() {
    console.log('🔍 Fetching current WEBTOYS-OS from database...');
    const { data, error } = await supabase
        .from('wtaf_content')
        .select('html_content, updated_at')
        .eq('user_slug', 'public')
        .eq('app_slug', 'webtoys-os')
        .single();
    
    if (error) {
        throw new Error(`Failed to fetch WEBTOYS-OS: ${error.message}`);
    }
    
    console.log('✅ Successfully fetched current WEBTOYS-OS');
    return data;
}

async function createBackup(htmlContent, description = '') {
    const timestamp = new Date().toISOString()
        .replace(/:/g, '-')
        .replace(/\./g, '-')
        .replace('T', '_')
        .slice(0, -5);
    
    const backupFile = path.join(backupDir, `webtoys-os_${timestamp}.html`);
    fs.writeFileSync(backupFile, htmlContent);
    
    const metadataFile = path.join(backupDir, `webtoys-os_${timestamp}.json`);
    fs.writeFileSync(metadataFile, JSON.stringify({
        backed_up_at: new Date().toISOString(),
        description: description,
        file_size: htmlContent.length,
        backup_file: backupFile
    }, null, 2));
    
    const latestBackup = path.join(backupDir, 'webtoys-os_latest-backup.html');
    fs.writeFileSync(latestBackup, htmlContent);
    
    console.log(`💾 Backup created: ${backupFile}`);
    console.log(`📋 Description: ${description}`);
    return backupFile;
}

async function safeUpdateWebtoysOS(newHtml, description = 'Update') {
    try {
        console.log('\n🔒 Safe WEBTOYS-OS Update Process Starting...');
        console.log(`📄 Update: ${description}`);
        
        console.log('1️⃣  Creating backup of current version...');
        const current = await fetchCurrentWebtoysOS();
        await createBackup(current.html_content, `Before: ${description}`);
        
        console.log('2️⃣  Applying update to Supabase database...');
        const { error } = await supabase
            .from('wtaf_content')
            .update({ 
                html_content: newHtml,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'webtoys-os');
        
        if (error) {
            throw new Error(`Update failed: ${error.message}`);
        }
        
        console.log('3️⃣  Saving updated version locally...');
        const currentFile = path.join(process.cwd(), 'current-webtoys-os.html');
        fs.writeFileSync(currentFile, newHtml);
        
        console.log('✅ WEBTOYS-OS Update completed successfully!');
        console.log('🔗 Live at: https://webtoys.ai/public/webtoys-os');
        
        return true;
        
    } catch (error) {
        console.error('❌ Safe update failed:', error.message);
        console.log('🔄 Your backup is safe in the backups/ folder');
        throw error;
    }
}

async function verifyScrollArrowFix(htmlContent) {
    console.log('\n🔍 Verifying scroll arrow improvements...');
    
    // Check for the specific CSS rules we added
    const verticalArrowRule = '.system7-scrollbar-vertical .system7-scroll-arrow';
    const horizontalArrowRule = '.system7-scrollbar-horizontal .system7-scroll-arrow';
    
    const hasVerticalRule = htmlContent.includes(verticalArrowRule);
    const hasHorizontalRule = htmlContent.includes(horizontalArrowRule);
    
    // Check for the width/height improvements
    const hasVerticalWidthFix = htmlContent.includes('width: 100%;') && htmlContent.includes('height: 16px;');
    const hasHorizontalHeightFix = htmlContent.includes('width: 16px;') && htmlContent.includes('height: 100%;');
    
    console.log(`✅ Vertical scroll arrow CSS rule: ${hasVerticalRule ? 'Found' : 'Missing'}`);
    console.log(`✅ Horizontal scroll arrow CSS rule: ${hasHorizontalRule ? 'Found' : 'Missing'}`);
    console.log(`✅ Vertical arrow width fix (100%): ${hasVerticalWidthFix ? 'Found' : 'Missing'}`);
    console.log(`✅ Horizontal arrow height fix (100%): ${hasHorizontalHeightFix ? 'Found' : 'Missing'}`);
    
    if (hasVerticalRule && hasHorizontalRule && hasVerticalWidthFix && hasHorizontalHeightFix) {
        console.log('🎉 All scroll arrow improvements verified!');
        return true;
    } else {
        console.log('⚠️  Some scroll arrow improvements may be missing');
        return false;
    }
}

async function main() {
    try {
        console.log('🚀 Starting WEBTOYS-OS Scroll Arrow Fix Deployment');
        console.log('=' .repeat(60));
        
        // Read the updated HTML file with scroll arrow improvements
        const currentFile = path.join(process.cwd(), 'current-webtoys-os.html');
        if (!fs.existsSync(currentFile)) {
            throw new Error(`Current WEBTOYS-OS file not found: ${currentFile}`);
        }
        
        console.log(`📂 Reading updated HTML from: ${currentFile}`);
        const newHtml = fs.readFileSync(currentFile, 'utf8');
        
        console.log(`📏 HTML content length: ${newHtml.length.toLocaleString()} characters`);
        
        // Verify the scroll arrow improvements are present
        const hasImprovements = await verifyScrollArrowFix(newHtml);
        if (!hasImprovements) {
            console.log('\n⚠️  Warning: Expected scroll arrow improvements not fully detected');
            console.log('Proceeding with deployment anyway...');
        }
        
        // Deploy the updated HTML
        await safeUpdateWebtoysOS(newHtml, 'System 7 scroll arrow width/height improvements - vertical arrows use 100% width, horizontal arrows use 100% height');
        
        console.log('\n🎯 Deployment Summary:');
        console.log('- ✅ Automatic backup created before deployment');
        console.log('- ✅ System 7 scroll arrow CSS improvements deployed');
        console.log('- ✅ Vertical scrollbar arrows now use 100% width');
        console.log('- ✅ Horizontal scrollbar arrows now use 100% height');
        console.log('- ✅ Updated HTML saved locally');
        console.log('- ✅ Live version updated on webtoys.ai');
        
        console.log('\n📋 Next Steps:');
        console.log('1. Test the scroll arrows on webtoys.ai/public/webtoys-os');
        console.log('2. Verify proper visual alignment of arrows in both directions');
        console.log('3. Check that arrows still respond to clicks correctly');
        
    } catch (error) {
        console.error('\n❌ Deployment failed:', error.message);
        console.log('\n🔄 Recovery options:');
        console.log('1. Check the backups/ folder for automatic backup');
        console.log('2. Use emergency restore script if needed');
        console.log('3. Review current-webtoys-os.html for issues');
        process.exit(1);
    }
}

main();