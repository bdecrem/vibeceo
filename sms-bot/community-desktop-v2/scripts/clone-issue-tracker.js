#!/usr/bin/env node

/**
 * Clone public/toybox-issue-tracker to public/webtoysos-issue-tracker
 * Creates an exact copy of the toybox-issue-tracker app with a new slug
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
let result = dotenv.config({ path: '../../.env.local' });
if (result.error) {
    // Try the regular .env file
    result = dotenv.config({ path: '../../.env' });
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

async function cloneIssueTracker() {
    try {
        console.log('🔍 Checking if webtoysos-issue-tracker slug is available...');
        
        // Check if target slug already exists
        const { data: existing, error: checkError } = await supabase
            .from('wtaf_content')
            .select('app_slug')
            .eq('user_slug', 'public')
            .eq('app_slug', 'webtoysos-issue-tracker')
            .single();
        
        if (existing) {
            console.error('❌ Error: webtoysos-issue-tracker already exists!');
            console.log('Please choose a different slug or delete the existing app first.');
            return;
        }
        
        console.log('✅ Slug is available');
        console.log('📥 Fetching public/toybox-issue-tracker...');
        
        // Fetch the original toybox-issue-tracker
        const { data: originalArray, error: fetchError } = await supabase
            .from('wtaf_content')
            .select('*')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-issue-tracker')
            .order('created_at', { ascending: false })
            .limit(1);
        
        if (fetchError || !originalArray || originalArray.length === 0) {
            console.error('❌ Error fetching issue-tracker:', fetchError?.message || 'Not found');
            return;
        }
        
        const original = originalArray[0];
        
        console.log('✅ Found issue-tracker app');
        console.log('📋 Creating clone as webtoysos-issue-tracker...');
        
        // Create the clone with new slug
        const cloneData = {
            user_slug: 'public',
            app_slug: 'webtoysos-issue-tracker',
            html_content: original.html_content,
            original_prompt: original.original_prompt || 'Clone of Issue Tracker for WebToys OS',
            app_type: original.app_type,
            is_remix: false,
            parent_app_id: original.id,  // Reference to original
            created_at: new Date().toISOString(),
            current_revision: 1,
            theme_id: original.theme_id,
            code_blocks: original.code_blocks
        };
        
        const { data: newApp, error: insertError } = await supabase
            .from('wtaf_content')
            .insert(cloneData)
            .select()
            .single();
        
        if (insertError) {
            console.error('❌ Error creating clone:', insertError.message);
            return;
        }
        
        console.log('✅ Successfully cloned toybox-issue-tracker to webtoysos-issue-tracker!');
        console.log('');
        console.log('📌 New app details:');
        console.log(`   URL: https://webtoys.ai/public/webtoysos-issue-tracker`);
        console.log(`   ID: ${newApp.id}`);
        console.log(`   Created: ${newApp.created_at}`);
        console.log('');
        console.log('🎉 Clone complete! The app is now available at the URL above.');
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

// Run the clone operation
cloneIssueTracker();
