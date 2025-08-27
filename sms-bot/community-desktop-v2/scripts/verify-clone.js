#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
let result = dotenv.config({ path: '../../.env.local' });
if (result.error) {
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

async function verifyClone() {
    try {
        const { data: app, error } = await supabase
            .from('wtaf_content')
            .select('id, user_slug, app_slug, created_at, original_prompt')
            .eq('user_slug', 'public')
            .eq('app_slug', 'webtoysos-issue-tracker')
            .single();
        
        if (error) {
            console.error('❌ Error fetching clone:', error.message);
            return;
        }
        
        if (!app) {
            console.log('❌ Clone not found');
            return;
        }
        
        console.log('✅ Clone verified successfully!');
        console.log('');
        console.log('📋 App Details:');
        console.log(`   ID: ${app.id}`);
        console.log(`   Slug: ${app.user_slug}/${app.app_slug}`);
        console.log(`   Created: ${new Date(app.created_at).toLocaleString()}`);
        console.log(`   URL: https://webtoys.ai/public/webtoysos-issue-tracker`);
        if (app.original_prompt) {
            console.log(`   Prompt: ${app.original_prompt.substring(0, 100)}...`);
        }
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

verifyClone();
