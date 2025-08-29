#!/usr/bin/env node

/**
 * Clone bart/issue-tracker to public/webtoysos-issue-tracker
 * Creates an exact copy of bart's issue-tracker app with a new slug
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

async function cloneBartIssueTracker() {
    try {
        console.log('🗑️  First, removing any existing webtoysos-issue-tracker...');
        
        // Delete any existing webtoysos-issue-tracker
        const { error: deleteError } = await supabase
            .from('wtaf_content')
            .delete()
            .eq('user_slug', 'public')
            .eq('app_slug', 'webtoysos-issue-tracker');
        
        if (deleteError) {
            console.log('⚠️  Warning during deletion:', deleteError.message);
        } else {
            console.log('✅ Cleaned up any existing webtoysos-issue-tracker');
        }
        
        console.log('📥 Fetching bart/issue-tracker...');
        
        // Fetch bart's issue-tracker
        const { data: originalArray, error: fetchError } = await supabase
            .from('wtaf_content')
            .select('*')
            .eq('user_slug', 'bart')
            .eq('app_slug', 'issue-tracker')
            .order('created_at', { ascending: false })
            .limit(1);
        
        if (fetchError || !originalArray || originalArray.length === 0) {
            console.error('❌ Error fetching bart/issue-tracker:', fetchError?.message || 'Not found');
            console.log('\n🔍 Let me check what bart apps exist...');
            
            const { data: bartApps, error: listError } = await supabase
                .from('wtaf_content')
                .select('app_slug, created_at')
                .eq('user_slug', 'bart')
                .order('created_at', { ascending: false })
                .limit(10);
            
            if (bartApps && bartApps.length > 0) {
                console.log('Found bart apps:');
                bartApps.forEach((app, i) => {
                    console.log(`  ${i + 1}. bart/${app.app_slug}`);
                });
            }
            return;
        }
        
        const original = originalArray[0];
        
        console.log('✅ Found bart/issue-tracker');
        console.log('📋 Creating clone as public/webtoysos-issue-tracker...');
        
        // Create the clone with new slug under public
        const cloneData = {
            user_slug: 'public',  // Change from 'bart' to 'public'
            app_slug: 'webtoysos-issue-tracker',
            html_content: original.html_content,
            original_prompt: original.original_prompt || 'Clone of bart/issue-tracker for WebToys OS',
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
        
        console.log('✅ Successfully cloned bart/issue-tracker to public/webtoysos-issue-tracker!');
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
cloneBartIssueTracker();