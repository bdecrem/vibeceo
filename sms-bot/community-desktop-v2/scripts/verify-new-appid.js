#!/usr/bin/env node

/**
 * Verify that webtoysos-issue-tracker is using its new app_id
 */

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

const NEW_APP_ID = '5b98f08a-60c7-48cd-bd1c-fb4bad3615ae';
const OLD_APP_ID = '83218c2e-281e-4265-a95f-1d3f763870d4';

async function verifyAppId() {
    try {
        console.log('🔍 Verifying app_id update...\n');
        
        // 1. Check the HTML contains the new app_id
        console.log('1️⃣ Checking HTML content...');
        const { data: appData, error: appError } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'webtoysos-issue-tracker')
            .single();
        
        if (appError || !appData) {
            console.error('❌ Error fetching app:', appError?.message);
            return;
        }
        
        const html = appData.html_content;
        const hasNewId = html.includes(NEW_APP_ID);
        const hasOldId = html.includes(OLD_APP_ID);
        
        console.log(`   New app_id (${NEW_APP_ID}): ${hasNewId ? '✅ Found' : '❌ Not found'}`);
        console.log(`   Old app_id (${OLD_APP_ID}): ${hasOldId ? '❌ Still present!' : '✅ Removed'}`);
        
        // 2. Check ZAD data for both app_ids
        console.log('\n2️⃣ Checking ZAD data (wtaf_zero_admin_collaborative)...');
        
        // Check new app_id
        const { data: newData, error: newError } = await supabase
            .from('wtaf_zero_admin_collaborative')
            .select('*')
            .eq('app_id', NEW_APP_ID)
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (newData) {
            console.log(`   New app_id has ${newData.length} record(s)`);
            if (newData.length > 0) {
                console.log('   Recent records:');
                newData.forEach((record, i) => {
                    console.log(`     ${i + 1}. ${record.action_type} - ${record.participant_id || 'no participant'} - ${new Date(record.created_at).toLocaleString()}`);
                });
            }
        }
        
        // Check old app_id (for comparison)
        const { data: oldData } = await supabase
            .from('wtaf_zero_admin_collaborative')
            .select('id, action_type, created_at')
            .eq('app_id', OLD_APP_ID)
            .order('created_at', { ascending: false })
            .limit(3);
        
        if (oldData && oldData.length > 0) {
            console.log(`\n   Old app_id (bart's) has ${oldData.length}+ records (showing latest 3):`);
            oldData.forEach((record, i) => {
                console.log(`     ${i + 1}. ${record.action_type} - ${new Date(record.created_at).toLocaleString()}`);
            });
        }
        
        // 3. Summary
        console.log('\n📊 Summary:');
        if (hasNewId && !hasOldId) {
            console.log('✅ App successfully updated to use new app_id!');
            console.log(`   WebtoysOS Fixit Board is now independent with app_id: ${NEW_APP_ID}`);
            console.log('   It will store its own data separate from bart/issue-tracker');
        } else if (hasOldId) {
            console.log('⚠️ Old app_id still present in HTML - update may be incomplete');
        } else if (!hasNewId) {
            console.log('❌ New app_id not found in HTML - update failed');
        }
        
        console.log('\n🔗 Test the app at: https://webtoys.ai/public/webtoysos-issue-tracker');
        console.log('   Any new issues created will use the new app_id');
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

verifyAppId();