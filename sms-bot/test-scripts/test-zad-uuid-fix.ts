#!/usr/bin/env node

/**
 * Test ZAD UUID Fix
 * Verifies that ZAD apps now use actual wtaf_content UUIDs instead of test values
 */

import { fixZadAppId } from '../engine/shared/utils.js';

async function testZadUuidFix() {
    console.log('🧪 TESTING ZAD UUID FIX');
    console.log('=' .repeat(50));
    
    const testUuid = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'; // Example UUID
    
    // Test Case 1: Standard template placeholder
    console.log('\n1️⃣ Testing template placeholder replacement:');
    const template1 = `
        const APP_ID = 'test1';
        await supabase.from('wtaf_zero_admin_collaborative').insert({
            app_id: APP_ID,
            content: 'test'
        });
    `;
    
    const fixed1 = fixZadAppId(template1, testUuid);
    if (fixed1.includes(testUuid) && !fixed1.includes('test1')) {
        console.log('✅ Template placeholder correctly replaced with UUID');
    } else {
        console.log('❌ Template placeholder replacement failed');
        console.log('Result:', fixed1);
    }
    
    // Test Case 2: Claude-generated hardcoded value
    console.log('\n2️⃣ Testing Claude hardcoded value replacement:');
    const template2 = `
        const APP_ID = 'shared-brainstorm-app';
        await supabase.from('wtaf_zero_admin_collaborative').insert({
            app_id: APP_ID,
            participant_id: userId
        });
    `;
    
    const fixed2 = fixZadAppId(template2, testUuid);
    if (fixed2.includes(testUuid) && !fixed2.includes('shared-brainstorm-app')) {
        console.log('✅ Claude hardcoded value correctly replaced with UUID');
    } else {
        console.log('❌ Claude hardcoded value replacement failed');
        console.log('Result:', fixed2);
    }
    
    // Test Case 3: Random generation pattern
    console.log('\n3️⃣ Testing random generation pattern replacement:');
    const template3 = `
        const APP_ID = 'zad_' + Math.random().toString(36).substr(2, 9);
        await supabase.from('wtaf_zero_admin_collaborative').insert({
            app_id: APP_ID,
            action_type: 'join'
        });
    `;
    
    const fixed3 = fixZadAppId(template3, testUuid);
    if (fixed3.includes(testUuid) && !fixed3.includes('Math.random()')) {
        console.log('✅ Random generation pattern correctly replaced with UUID');
    } else {
        console.log('❌ Random generation pattern replacement failed');
        console.log('Result:', fixed3);
    }
    
    // Test Case 4: Direct app_id usage in object
    console.log('\n4️⃣ Testing direct app_id usage replacement:');
    const template4 = `
        await supabase.from('wtaf_zero_admin_collaborative').insert({
            app_id: 'hardcoded-app-id',
            participant_id: userId,
            action_type: 'message'
        });
    `;
    
    const fixed4 = fixZadAppId(template4, testUuid);
    if (fixed4.includes(`app_id: '${testUuid}'`) && !fixed4.includes('hardcoded-app-id')) {
        console.log('✅ Direct app_id usage correctly replaced with UUID');
    } else {
        console.log('❌ Direct app_id usage replacement failed');
        console.log('Result:', fixed4);
    }
    
    // Test Case 5: Multiple patterns in one file
    console.log('\n5️⃣ Testing multiple patterns in one file:');
    const template5 = `
        const APP_ID = 'test2';
        
        async function joinApp() {
            await supabase.from('wtaf_zero_admin_collaborative').insert({
                app_id: APP_ID,
                action_type: 'join'
            });
        }
        
        async function loadData() {
            const { data } = await supabase
                .from('wtaf_zero_admin_collaborative')
                .select('*')
                .eq('app_id', 'some-other-hardcoded-id');
        }
    `;
    
    const fixed5 = fixZadAppId(template5, testUuid);
    const uuidCount = (fixed5.match(new RegExp(testUuid.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
    
    if (uuidCount >= 2 && !fixed5.includes('test2') && !fixed5.includes('some-other-hardcoded-id')) {
        console.log('✅ Multiple patterns correctly replaced with UUID');
        console.log(`   Found ${uuidCount} UUID replacements`);
    } else {
        console.log('❌ Multiple patterns replacement failed');
        console.log(`   Found ${uuidCount} UUID replacements`);
        console.log('Result:', fixed5);
    }
    
    console.log('\n' + '=' .repeat(50));
    console.log('🎉 ZAD UUID fix test complete!');
    console.log(`✨ From now on, ZAD apps will use: ${testUuid.slice(0, 8)}...`);
    console.log('🔗 This ensures proper linking between ZAD data and app content');
}

// Run the test
testZadUuidFix().catch(console.error); 