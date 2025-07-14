#!/usr/bin/env npx tsx

/**
 * Test: Supabase Client Removal
 * 
 * This test verifies that the convertSupabaseToApiCalls function properly removes
 * all Supabase client initialization, CDN scripts, and direct database calls.
 */

import { convertSupabaseToApiCalls } from '../engine/storage-manager.js';

async function testSupabaseClientRemoval() {
    console.log('🧪 Testing Supabase Client Removal...\n');
    
    // Test HTML with various Supabase patterns
    const testHtml = `
        <html>
            <head>
                <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
                <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@1.35.0"></script>
            </head>
            <body>
                <script>
                    // Initialize Supabase client
                    const SUPABASE_URL = 'https://example.supabase.co';
                    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...';
                    const supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
                    
                    // Direct Supabase calls
                    await supabase.from('wtaf_zero_admin_collaborative').insert({
                        app_id: 'test-app',
                        action_type: 'message',
                        content_data: { text: 'Hello world!' }
                    });
                    
                    const { data } = await supabase.from('wtaf_zero_admin_collaborative')
                        .select('*')
                        .eq('app_id', 'test-app')
                        .order('created_at', { ascending: true });
                </script>
            </body>
        </html>
    `;
    
    console.log('📝 Original HTML includes:');
    console.log('- Supabase CDN script tags');
    console.log('- Supabase client initialization');
    console.log('- Direct Supabase database calls');
    console.log('- Supabase URL/key constants\n');
    
    try {
        const converted = await convertSupabaseToApiCalls(testHtml);
        
        // Check if Supabase CDN scripts were removed
        const hasCdnScript = converted.includes('cdn.jsdelivr.net/npm/@supabase/supabase-js');
        console.log(`📦 CDN script removal: ${hasCdnScript ? '❌ FAILED' : '✅ SUCCESS'}`);
        
        // Check if client initialization was removed
        const hasClientInit = converted.includes('supabase.createClient');
        console.log(`🔗 Client initialization removal: ${hasClientInit ? '❌ FAILED' : '✅ SUCCESS'}`);
        
        // Check if constants were removed
        const hasConstants = converted.includes('SUPABASE_URL') || converted.includes('SUPABASE_ANON_KEY');
        console.log(`🔑 Constants removal: ${hasConstants ? '❌ FAILED' : '✅ SUCCESS'}`);
        
        // Check if direct database calls were converted
        const hasDirectCalls = converted.includes('supabase.from(');
        console.log(`💾 Direct calls conversion: ${hasDirectCalls ? '❌ FAILED' : '✅ SUCCESS'}`);
        
        // Check if API calls were added
        const hasApiCalls = converted.includes('await save(') && converted.includes('await load(');
        console.log(`🔄 API calls added: ${hasApiCalls ? '✅ SUCCESS' : '❌ FAILED'}`);
        
        // Check if comments were removed
        const hasComments = converted.includes('Initialize Supabase client');
        console.log(`💭 Comments removal: ${hasComments ? '❌ FAILED' : '✅ SUCCESS'}`);
        
        console.log('\n🎯 Test Summary:');
        if (!hasCdnScript && !hasClientInit && !hasConstants && !hasDirectCalls && hasApiCalls && !hasComments) {
            console.log('✅ All Supabase client initialization properly removed!');
            console.log('✅ Apps will now use API calls exclusively');
        } else {
            console.log('❌ Some Supabase references remain - needs investigation');
        }
        
        // Log converted HTML snippet for inspection
        console.log('\n📄 Converted HTML (relevant sections):');
        const lines = converted.split('\n');
        const relevantLines = lines.filter(line => 
            line.includes('save(') || 
            line.includes('load(') || 
            line.includes('script') ||
            line.includes('supabase') ||
            line.includes('createClient')
        );
        
        if (relevantLines.length > 0) {
            console.log(relevantLines.join('\n'));
        } else {
            console.log('✅ No Supabase references found in converted HTML');
        }
        
    } catch (error) {
        console.error('❌ Test failed:', error);
    }
}

// Run the test
testSupabaseClientRemoval().catch(console.error); 