#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';

// Load environment variables
const result = dotenv.config({ path: '../.env.local' });
if (result.error) {
    console.error('Error loading .env.local:', result.error.message);
    process.exit(1);
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function fetchAppStudio() {
    try {
        console.log('📦 Fetching App Studio content...');
        
        const { data, error } = await supabase
            .from('wtaf_content')
            .select('html_content')
            .eq('user_slug', 'public')
            .eq('app_slug', 'app-studio')
            .single();
            
        if (error) {
            throw new Error('Failed to fetch App Studio: ' + error.message);
        }
        
        // Save to local file for inspection
        fs.writeFileSync('app-studio-current.html', data.html_content);
        
        console.log('✅ App Studio content fetched');
        console.log(`📊 Size: ${data.html_content.length} characters`);
        console.log('💾 Saved to: app-studio-current.html');
        
        return data.html_content;
        
    } catch (error) {
        console.error('❌ Error fetching App Studio:', error);
        process.exit(1);
    }
}

// Run the script
fetchAppStudio();