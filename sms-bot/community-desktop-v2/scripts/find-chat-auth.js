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

async function findChatAuth() {
    try {
        // Look for ToyBox Chat
        const { data, error } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-chat')
            .single();
        
        if (error || !data) {
            console.error('Could not find toybox-chat');
            return;
        }
        
        const html = data.html_content;
        
        console.log('🔍 Authentication pattern in ToyBox Chat:\n');
        
        // Extract key authentication code
        const authStart = html.indexOf('// User authentication');
        const authEnd = html.indexOf('// Send message function', authStart);
        
        if (authStart > -1 && authEnd > authStart) {
            const authCode = html.substring(authStart, authEnd);
            console.log(authCode);
        }
        
        // Also look for how currentUser.handle is used
        console.log('\n📝 How Chat app uses currentUser:');
        const handleUsages = html.match(/currentUser[\s\S]{0,50}handle/g);
        if (handleUsages) {
            handleUsages.slice(0, 3).forEach(usage => {
                console.log('  •', usage.replace(/\s+/g, ' '));
            });
        }
    } catch (error) {
        console.error('Error:', error);
    }
}

findChatAuth();
