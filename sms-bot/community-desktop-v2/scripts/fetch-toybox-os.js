#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// Load environment variables
const result = dotenv.config({ path: '../.env.local' });
if (result.error) {
    console.error('Error loading .env.local:', result.error.message);
    process.exit(1);
}

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    console.error('SUPABASE_URL:', SUPABASE_URL ? 'Set' : 'Not set');
    console.error('SUPABASE_SERVICE_KEY:', SUPABASE_SERVICE_KEY ? 'Set' : 'Not set');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function fetchToyBoxOS() {
    try {
        console.log('🔍 Fetching ToyBox OS HTML from Supabase...');
        
        const { data, error } = await supabase
            .from('wtaf_content')
            .select('html_content, id, updated_at')
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os')
            .single();
        
        if (error) {
            console.error('❌ Error fetching from Supabase:', error.message);
            process.exit(1);
        }
        
        if (!data) {
            console.error('❌ No data found for public/toybox-os');
            process.exit(1);
        }
        
        console.log('✅ Successfully fetched ToyBox OS data');
        console.log('📊 Record ID:', data.id);
        console.log('📅 Last updated:', data.updated_at);
        console.log('📝 HTML length:', data.html_content.length, 'characters');
        
        return data;
        
    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
        process.exit(1);
    }
}

// Run the script
fetchToyBoxOS().then(data => {
    console.log('\n🎯 ToyBox OS HTML content fetched successfully!');
    
    // Save the HTML content to a local file for analysis
    import('fs').then(fs => {
        fs.writeFileSync('current-toybox-os.html', data.html_content);
        console.log('💾 Saved to current-toybox-os.html for analysis');
    });
});