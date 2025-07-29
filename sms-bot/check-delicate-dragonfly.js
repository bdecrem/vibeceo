#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { configDotenv } from 'dotenv';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment
configDotenv({ path: join(__dirname, '.env.local') });

async function checkDelicateDragonfly() {
    const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);
    
    console.log('🔍 Checking delicate-dragonfly-singing trending status...');
    
    const { data: app, error } = await supabase
        .from('wtaf_content')
        .select(`
            app_slug,
            status,
            is_trending,
            total_descendants,
            remix_count,
            created_at,
            user_slug
        `)
        .eq('app_slug', 'delicate-dragonfly-singing')
        .single();
    
    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }
    
    console.log('\n📋 App Status:');
    console.log(`  Slug: ${app.app_slug}`);
    console.log(`  User: ${app.user_slug}`);
    console.log(`  Status: ${app.status}`);
    console.log(`  Is Trending: ${app.is_trending}`);
    console.log(`  Total Descendants: ${app.total_descendants}`);
    console.log(`  Remix Count: ${app.remix_count}`);
    console.log(`  Created: ${app.created_at}`);
    
    console.log('\n🔍 Trending Requirements Check:');
    console.log(`  ✅ is_trending = true: ${app.is_trending ? '✅ YES' : '❌ NO'}`);
    console.log(`  📋 status = 'published': ${app.status === 'published' ? '✅ YES' : '❌ NO'}`);
    console.log(`  🔥 total_descendants > 0: ${app.total_descendants > 0 ? '✅ YES' : '❌ NO'}`);
    
    if (app.is_trending && app.status === 'published' && app.total_descendants > 0) {
        console.log('\n🎉 This app SHOULD appear on trending!');
    } else {
        console.log('\n❌ This app will NOT appear on trending because:');
        if (!app.is_trending) console.log('  - is_trending is not true');
        if (app.status !== 'published') console.log('  - status is not "published"');
        if (app.total_descendants === 0) console.log('  - total_descendants is 0 (needs to be remixed first)');
    }
}

checkDelicateDragonfly().catch(console.error); 