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

async function checkIssueTracker() {
    try {
        console.log('🔍 Looking for issue tracker apps...');
        
        // Search for apps with 'issue' in the slug
        const { data: apps, error } = await supabase
            .from('wtaf_content')
            .select('user_slug, app_slug, created_at, original_prompt')
            .eq('user_slug', 'public')
            .ilike('app_slug', '%issue%')
            .order('created_at', { ascending: false });
        
        if (error) {
            console.error('❌ Error searching:', error.message);
            return;
        }
        
        if (!apps || apps.length === 0) {
            console.log('❌ No issue-related apps found');
            
            // Let's check for any public apps
            console.log('\n📋 Checking all public apps...');
            const { data: allApps, error: allError } = await supabase
                .from('wtaf_content')
                .select('app_slug, created_at')
                .eq('user_slug', 'public')
                .order('created_at', { ascending: false })
                .limit(20);
                
            if (allApps && allApps.length > 0) {
                console.log('Found public apps:');
                allApps.forEach((app, i) => {
                    console.log(`  ${i + 1}. ${app.app_slug} (${new Date(app.created_at).toLocaleDateString()})`);
                });
            }
            return;
        }
        
        console.log(`✅ Found ${apps.length} issue-related app(s):\n`);
        apps.forEach((app, i) => {
            console.log(`${i + 1}. ${app.user_slug}/${app.app_slug}`);
            console.log(`   Created: ${new Date(app.created_at).toLocaleString()}`);
            if (app.original_prompt) {
                console.log(`   Prompt: ${app.original_prompt.substring(0, 100)}...`);
            }
            console.log('');
        });
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

checkIssueTracker();
