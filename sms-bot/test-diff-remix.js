#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { processMessage } from './dist/engine/controller.js';

config({ path: '.env.local' });

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

async function testDiffRemix() {
    console.log('🧪 Testing diff-based ZAD remix...\n');
    
    // Test remix command
    const message = 'REMIX turquoise-spotted-competing make it hot pink';
    const senderPhone = '+12028569601';
    const userSlug = 'bart';
    
    console.log(`📱 Simulating message: "${message}"`);
    console.log(`👤 From: ${userSlug} (${senderPhone})\n`);
    
    try {
        const result = await processMessage(message, senderPhone, userSlug);
        console.log(`\n✅ Process result:`, result);
        
        // Wait a bit for deployment
        console.log('\n⏳ Waiting 5 seconds for deployment...');
        await new Promise(resolve => setTimeout(resolve, 5000));
        
        // Check the result in database
        console.log('\n🔍 Checking database for new remix...');
        const { data, error } = await supabase
            .from('wtaf_content')
            .select('app_slug, type, html_content')
            .eq('user_slug', userSlug)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();
            
        if (error) {
            console.error('❌ Database error:', error);
            return;
        }
        
        console.log(`\n📱 New app created: ${data.app_slug}`);
        console.log(`   Type: ${data.type}`);
        console.log(`   HTML size: ${data.html_content?.length || 0} chars`);
        
        // Check if hot pink was applied
        if (data.html_content?.includes('#FF1493')) {
            console.log('   ✅ Hot pink color detected!');
        } else {
            console.log('   ⚠️  Hot pink color NOT found');
        }
        
        // Check for truncation
        if (data.html_content?.includes('</html>')) {
            console.log('   ✅ HTML is complete');
        } else {
            console.log('   ❌ HTML appears truncated');
            const lastChars = data.html_content?.slice(-100);
            console.log(`   Last 100 chars: ${lastChars}`);
        }
        
    } catch (err) {
        console.error('💥 Test failed:', err);
    }
}

testDiffRemix();