#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.local') });
if (!process.env.SUPABASE_URL) {
    dotenv.config({ path: path.join(__dirname, '../../.env') });
}

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function checkSubmissions() {
    // Get ALL recent submissions
    const { data } = await supabase
        .from('wtaf_zero_admin_collaborative')
        .select('content_data, created_at')
        .eq('app_id', 'toybox-windowed-apps')
        .order('created_at', { ascending: false })
        .limit(5);
    
    console.log(`Found ${data?.length || 0} recent submissions:\n`);
    
    data?.forEach((sub, i) => {
        const content = sub.content_data;
        const time = new Date(sub.created_at).toLocaleTimeString();
        console.log(`${i+1}. Submitted at ${time}`);
        console.log(`   Type: ${content.appType}`);
        console.log(`   Name: ${content.appName}`);
        console.log(`   Function: ${content.appFunction}`);
        console.log(`   Status: ${content.status}`);
        console.log('');
    });
    
    // Check if any have webtoys type
    const webtoysSubmissions = data?.filter(s => 
        s.content_data.appType === 'webtoys' || 
        s.content_data.appFunction?.includes('Import Webtoys')
    );
    
    if (webtoysSubmissions?.length > 0) {
        console.log('✅ Found Webtoys submissions!');
    } else {
        console.log('⚠️ No submissions with type "webtoys" found');
        console.log('\nThe App Studio might not be saving the type correctly.');
    }
}

checkSubmissions();