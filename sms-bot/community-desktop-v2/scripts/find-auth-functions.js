#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
let result = dotenv.config({ path: '../../.env.local' });
if (result.error) {
    result = dotenv.config({ path: '../../.env' });
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function findAuthFunctions() {
    try {
        const { data, error } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'webtoysos-issue-tracker')
            .single();
        
        if (error || !data) {
            console.error('Error:', error?.message);
            return;
        }
        
        const html = data.html_content;
        
        // Look for authentication-related functions
        console.log('🔍 Looking for auth-related code:\n');
        
        // Find checkAuth or similar
        const authFunctions = [
            'checkAuth',
            'isAuthenticated',
            'checkSuperpowerAuth',
            'getAuthToken',
            'webtoysAuthToken'
        ];
        
        authFunctions.forEach(func => {
            if (html.includes(func)) {
                console.log(`✅ Found: ${func}`);
                // Get context
                const index = html.indexOf(func);
                const snippet = html.substring(Math.max(0, index - 50), Math.min(html.length, index + 200));
                console.log(`   Context: ${snippet.replace(/\n/g, ' ').substring(0, 150)}...`);
            } else {
                console.log(`❌ Not found: ${func}`);
            }
        });
        
        // Look for where superpower controls are shown
        console.log('\n🔍 Looking for superpower control logic:\n');
        const superpowerIndex = html.indexOf('superpower-controls');
        if (superpowerIndex > -1) {
            const snippet = html.substring(Math.max(0, superpowerIndex - 200), superpowerIndex + 100);
            console.log('Found superpower-controls:');
            console.log(snippet.replace(/\s+/g, ' ').substring(0, 250) + '...');
        }
        
    } catch (error) {
        console.error('Error:', error);
    }
}

findAuthFunctions();