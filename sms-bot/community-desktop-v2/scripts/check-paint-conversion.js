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

async function checkConversion() {
    // Check if the converted app exists
    const { data } = await supabase
        .from('wtaf_content')
        .select('app_slug, created_at, updated_at')
        .eq('user_slug', 'public')
        .eq('app_slug', 'toybox-wave-wood-deconstructing')
        .single();
    
    if (data) {
        console.log('✅ Paint app converted successfully!');
        console.log('📱 App slug:', data.app_slug);
        console.log('📅 Created:', new Date(data.created_at).toLocaleString());
        console.log('📍 URL: https://webtoys.ai/public/toybox-wave-wood-deconstructing');
        console.log('\n🎯 The paint app is now available as a ToyBox OS windowed app!');
    } else {
        console.log('❌ Paint app not found as toybox-wave-wood-deconstructing');
        
        // Check if original exists
        const { data: original } = await supabase
            .from('wtaf_content')
            .select('app_slug, user_slug')
            .eq('app_slug', 'wave-wood-deconstructing')
            .limit(1);
        
        if (original && original[0]) {
            console.log(`\n📋 Original found at: ${original[0].user_slug}/${original[0].app_slug}`);
            console.log('⏳ Conversion may still be processing...');
        } else {
            console.log('\n⚠️ Original app "wave-wood-deconstructing" not found either');
        }
        
        // Check latest submission
        const { data: submission } = await supabase
            .from('wtaf_zero_admin_collaborative')
            .select('content_data, created_at')
            .eq('app_id', 'toybox-windowed-apps')
            .order('created_at', { ascending: false })
            .limit(1);
        
        if (submission && submission[0]) {
            const sub = submission[0].content_data;
            console.log('\n📋 Latest submission:');
            console.log(`  Type: ${sub.appType}`);
            console.log(`  Name: ${sub.appName}`);
            console.log(`  Function: ${sub.appFunction}`);
            console.log(`  Status: ${sub.status}`);
        }
    }
}

checkConversion();