#!/usr/bin/env node

/**
 * Fetch Current Issue Tracker from Database
 * 
 * This script fetches the current Issue Tracker app from Supabase
 * so we can analyze and work with it.
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

async function fetchIssueTracker() {
    console.log('📥 Fetching Issue Tracker from database...');
    
    const { data, error } = await supabase
        .from('wtaf_content')
        .select('html_content, updated_at, app_slug')
        .eq('user_slug', 'public')
        .eq('app_slug', 'toybox-issue-tracker')
        .single();
    
    if (error) {
        console.error('❌ Failed to fetch Issue Tracker:', error.message);
        process.exit(1);
    }
    
    console.log('✅ Successfully fetched Issue Tracker');
    console.log(`📅 Last updated: ${data.updated_at}`);
    console.log(`🔗 Live URL: https://webtoys.ai/public/toybox-issue-tracker`);
    
    // Save to file
    const outputFile = path.join(process.cwd(), 'current-issue-tracker-from-db.html');
    fs.writeFileSync(outputFile, data.html_content);
    console.log(`💾 Saved to: ${outputFile}`);
    
    return data.html_content;
}

// Run the fetch
fetchIssueTracker().catch(console.error);