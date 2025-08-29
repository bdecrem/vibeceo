#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../../.env.local') });
if (!process.env.SUPABASE_URL) {
    dotenv.config({ path: path.join(__dirname, '../../.env') });
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function emergencyCheck() {
    console.log('🚨 EMERGENCY CHECK - What is actually happening?\n');
    
    // 1. Check what's in the database
    console.log('1. DATABASE CHECK:');
    const { data: issues, error: issueError } = await supabase
        .from('wtaf_zero_admin_collaborative')
        .select('*')
        .eq('app_id', 'toybox-issue-tracker')
        .eq('action_type', 'update_request');
    
    if (issueError) {
        console.log('   ERROR fetching issues:', issueError);
    } else {
        console.log(`   ✓ Found ${issues?.length || 0} issue records in database`);
        if (issues && issues.length > 0) {
            const uniqueNums = new Set(issues.map(i => i.content_data?.issueNumber).filter(n => n));
            console.log(`   ✓ Unique issue numbers: ${Array.from(uniqueNums).sort((a,b) => a-b).join(', ')}`);
        }
    }
    
    // 2. Check current HTML
    console.log('\n2. CURRENT HTML CHECK:');
    const { data: current, error: htmlError } = await supabase
        .from('wtaf_content')
        .select('html_content, updated_at')
        .eq('user_slug', 'public')
        .eq('app_slug', 'toybox-issue-tracker')
        .single();
    
    if (htmlError) {
        console.log('   ERROR fetching HTML:', htmlError);
    } else {
        console.log(`   ✓ Last updated: ${new Date(current.updated_at).toLocaleString()}`);
        
        // Check key functions exist
        const hasLoadFunction = current.html_content.includes('async function loadRecentUpdates()');
        const hasLoadCall = current.html_content.includes('loadRecentUpdates()');
        const hasContainer = current.html_content.includes('id="recentUpdates"');
        
        console.log(`   ${hasLoadFunction ? '✓' : '✗'} Has loadRecentUpdates function`);
        console.log(`   ${hasLoadCall ? '✓' : '✗'} Calls loadRecentUpdates`);
        console.log(`   ${hasContainer ? '✓' : '✗'} Has recentUpdates container`);
        
        // Save current HTML for inspection
        await fs.writeFile(
            path.join(__dirname, '..', 'current-issue-tracker.html'),
            current.html_content
        );
        console.log('   ✓ Saved current HTML to current-issue-tracker.html for inspection');
    }
    
    // 3. Check if load function works
    console.log('\n3. TESTING LOAD FUNCTION:');
    try {
        const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/load_zad_data`, {
            method: 'POST',
            headers: {
                'apikey': process.env.SUPABASE_SERVICE_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                p_app_id: 'toybox-issue-tracker',
                p_action_type: 'update_request'
            })
        });
        
        if (!response.ok) {
            // Try the actual API endpoint
            const apiResponse = await fetch('https://webtoys.ai/api/zad/load?app_id=toybox-issue-tracker&action_type=update_request');
            if (apiResponse.ok) {
                const data = await apiResponse.json();
                console.log(`   ✓ API endpoint works, returned ${data.length} records`);
            } else {
                console.log('   ✗ API endpoint failed');
            }
        }
    } catch (e) {
        console.log('   Note: Could not test API directly from this script');
    }
    
    console.log('\n🔍 DIAGNOSIS:');
    if (issues && issues.length > 0) {
        console.log('✓ Issues exist in database');
    } else {
        console.log('✗ No issues in database!');
    }
    
    console.log('\n📋 NEXT STEP: Restoring from the last known good backup...\n');
}

emergencyCheck();