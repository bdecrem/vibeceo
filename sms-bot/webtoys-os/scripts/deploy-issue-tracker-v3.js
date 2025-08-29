#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from sms-bot/.env.local
dotenv.config({ path: path.join(__dirname, '..', '..', '.env.local') });

// Load environment variables
const SUPABASE_URL = process.env.SUPABASE_URL || 'https://tqniseocczttrfwtpbdr.supabase.co';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_SERVICE_KEY) {
    console.error('❌ Error: SUPABASE_SERVICE_KEY environment variable is required');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function deployIssueTracker() {
    try {
        console.log('📦 Deploying Issue Tracker v3 to database...');
        
        // Read the HTML file
        const htmlPath = path.join(__dirname, '..', 'apps', 'issue-tracker-v3.html');
        const htmlContent = fs.readFileSync(htmlPath, 'utf8');
        
        console.log('📄 HTML loaded, size:', htmlContent.length, 'bytes');
        
        // Check if the app already exists
        const { data: existingApp, error: fetchError } = await supabase
            .from('wtaf_content')
            .select('id')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker-v3')
            .single();
        
        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }
        
        if (existingApp) {
            console.log('✏️ Updating existing Issue Tracker v3...');
            
            // Update existing app
            const { data, error } = await supabase
                .from('wtaf_content')
                .update({
                    html_content: htmlContent,
                    updated_at: new Date().toISOString()
                })
                .eq('user_slug', 'public')
                .eq('app_slug', 'toybox-issue-tracker-v3')
                .select()
                .single();
            
            if (error) throw error;
            
            console.log('✅ Issue Tracker v3 updated successfully!');
            console.log('🌐 URL: https://webtoys.ai/public/toybox-issue-tracker-v3');
        } else {
            console.log('➕ Creating new Issue Tracker v3...');
            
            // Insert new app
            const { data, error } = await supabase
                .from('wtaf_content')
                .insert({
                    user_slug: 'public',
                    app_slug: 'toybox-issue-tracker-v3',
                    html_content: htmlContent,
                    original_prompt: 'Issue Tracker v3 with direct Supabase access',
                    created_at: new Date().toISOString()
                })
                .select()
                .single();
            
            if (error) throw error;
            
            console.log('✅ Issue Tracker v3 created successfully!');
            console.log('🌐 URL: https://webtoys.ai/public/toybox-issue-tracker-v3');
        }
        
    } catch (error) {
        console.error('❌ Deployment failed:', error);
        process.exit(1);
    }
}

// Run deployment
deployIssueTracker();