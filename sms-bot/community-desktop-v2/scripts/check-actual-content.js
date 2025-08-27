#!/usr/bin/env node

/**
 * Check the actual content of webtoysos-issue-tracker
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

async function checkContent() {
    try {
        console.log('📥 Fetching webtoysos-issue-tracker...');
        
        const { data, error } = await supabase
            .from('wtaf_content')
            .select('*')
            .eq('user_slug', 'public')
            .eq('app_slug', 'webtoysos-issue-tracker')
            .single();
        
        if (error || !data) {
            console.error('❌ Error fetching app:', error?.message || 'Not found');
            return;
        }
        
        const html = data.html_content;
        
        console.log('\n📋 App Details:');
        console.log(`   ID: ${data.id}`);
        console.log(`   Slug: ${data.user_slug}/${data.app_slug}`);
        console.log(`   Updated: ${data.updated_at}`);
        
        console.log('\n🔍 Checking for titles in HTML...');
        
        // Extract and show the <title> tag
        const titleMatch = html.match(/<title>(.*?)<\/title>/i);
        if (titleMatch) {
            console.log(`   <title> tag: "${titleMatch[1]}"`);
        } else {
            console.log('   ❌ No <title> tag found');
        }
        
        // Look for h1 headers
        const h1Matches = html.match(/<h1[^>]*>(.*?)<\/h1>/gi);
        if (h1Matches) {
            console.log(`   Found ${h1Matches.length} <h1> tag(s):`);
            h1Matches.forEach((h1, i) => {
                const content = h1.replace(/<[^>]*>/g, '');
                console.log(`     ${i + 1}. "${content}"`);
            });
        } else {
            console.log('   No <h1> tags found');
        }
        
        // Check for "Issue Tracker" vs "Fixit Board" text
        const issueTrackerCount = (html.match(/Issue Tracker/gi) || []).length;
        const fixitBoardCount = (html.match(/Fixit Board/gi) || []).length;
        const webtoysOSCount = (html.match(/WebtoysOS/gi) || []).length;
        
        console.log('\n📊 Text occurrence counts:');
        console.log(`   "Issue Tracker": ${issueTrackerCount} times`);
        console.log(`   "Fixit Board": ${fixitBoardCount} times`);
        console.log(`   "WebtoysOS": ${webtoysOSCount} times`);
        
        // Show a snippet of the HTML around the title area
        console.log('\n📄 HTML snippet (first 1500 chars):');
        console.log(html.substring(0, 1500));
        
    } catch (error) {
        console.error('❌ Unexpected error:', error);
    }
}

checkContent();