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

// Supabase configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    console.error('Missing Supabase credentials');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function restoreToyBox() {
    try {
        console.log('🔄 Restoring ToyBox OS to previous working version...');
        
        // Read the known good version
        const htmlContent = fs.readFileSync('current-toybox-os.html', 'utf8');
        
        console.log('📝 Updating ToyBox OS in database...');
        
        // Update the database with the working version
        const { error } = await supabase
            .from('wtaf_content')
            .update({ 
                html_content: htmlContent,
                updated_at: new Date().toISOString()
            })
            .eq('user_slug', 'public')
            .eq('app_slug', 'toybox-os');
        
        if (error) {
            console.error('❌ Error updating Supabase:', error.message);
            process.exit(1);
        }
        
        console.log('✅ Successfully restored ToyBox OS!');
        console.log('   - Drag and drop should work again');
        console.log('   - Icons will persist their positions');
        console.log('   - Deleted icons will reappear on refresh (known issue)');
        
        console.log('\n🎉 ToyBox OS restored successfully!');
        console.log('🔗 Test at: https://webtoys.ai/public/toybox-os');
        
    } catch (error) {
        console.error('❌ Unexpected error:', error.message);
        process.exit(1);
    }
}

// Run the script
restoreToyBox();