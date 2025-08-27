#!/usr/bin/env node

/**
 * Deploy Beautiful System 7 Issue Tracker
 * 
 * This script safely deploys the beautifully redesigned System 7 issue tracker
 * with proper backups and error handling.
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

// Load environment variables
let result = dotenv.config({ path: '../.env.local' });
if (result.error) {
    result = dotenv.config({ path: '../.env' });
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

// Ensure backups directory exists
const backupDir = path.join(process.cwd(), 'backups');
if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir);
}

async function fetchCurrentIssueTracker() {
    const { data, error } = await supabase
        .from('wtaf_content')
        .select('html_content, updated_at')
        .eq('user_slug', 'public')
        .eq('app_slug', 'toybox-issue-tracker')
        .single();
    
    if (error) {
        throw new Error(`Failed to fetch Issue Tracker: ${error.message}`);
    }
    
    return data;
}

async function createBackup(htmlContent, description = '') {
    const timestamp = Date.now();
    
    // Save HTML backup
    const backupFile = path.join(backupDir, `issue-tracker_beautiful_system7_${timestamp}.html`);
    fs.writeFileSync(backupFile, htmlContent);
    
    console.log(`💾 Backup created: ${backupFile}`);
    return backupFile;
}

async function safeUpdateIssueTracker(newHtml, description = 'Update') {
    try {
        console.log('\n🎨 Beautiful System 7 Issue Tracker Deployment Starting...');
        
        // Step 1: Fetch and backup current version
        console.log('1️⃣  Backing up current version...');
        const current = await fetchCurrentIssueTracker();
        await createBackup(current.html_content, `Before: ${description}`);
        
        // Step 2: Update in Supabase
        console.log('2️⃣  Deploying beautiful System 7 design to Supabase...');
        const { error } = await supabase
            .from('wtaf_content')
            .update({ 
                html_content: newHtml,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker');
        
        if (error) {
            throw new Error(`Deployment failed: ${error.message}`);
        }
        
        console.log('✅ Beautiful System 7 Issue Tracker deployed successfully!');
        console.log(`🎨 Description: ${description}`);
        console.log('🔗 Live at: https://webtoys.ai/public/toybox-issue-tracker');
        console.log('🖥️  Features: Classic Mac window chrome, filter tabs, pixel-perfect System 7 aesthetic');
        
        return true;
        
    } catch (error) {
        console.error('❌ Deployment failed:', error.message);
        console.log('🔄 Your backup is safe in the backups/ folder');
        throw error;
    }
}

async function main() {
    try {
        // Read the beautiful System 7 design
        const newHtml = fs.readFileSync('current-issue-tracker.html', 'utf8');
        
        // Deploy with beautiful description
        await safeUpdateIssueTracker(newHtml, 
            'Beautiful System 7 transformation with classic Mac window chrome, filter tabs, Chicago font, and pixel-perfect nostalgic aesthetic'
        );
        
        console.log('\n🎉 SUCCESS! The ToyBox OS Issue Tracker is now beautifully styled like classic System 7!');
        console.log('🖱️  Try the filter tabs: All Issues, Open, Closed, Pending, Completed');
        console.log('👨‍💻 Admin users (BART) can close issues with classic Mac buttons');
        console.log('🎨 Every detail crafted for authentic Mac nostalgia');
        
    } catch (error) {
        console.error('Deployment failed:', error);
        process.exit(1);
    }
}

if (process.argv[1] === new URL(import.meta.url).pathname) {
    main();
}