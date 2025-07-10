#!/usr/bin/env node
/**
 * Test ZAD API Implementation
 * Tests the new API-based ZAD system end-to-end
 */

import { writeFile } from 'fs/promises';
import { join } from 'path';

async function testZADAPIImplementation() {
    console.log('🧪 Testing ZAD API Implementation\n');

    const testUserSlug = 'test-zad-user';
    const testRequest = 'make a chat app for my study group';
    
    try {
        // Step 1: Create a test file for ZAD processing
        const testFileName = `test-zad-api-${Date.now()}.txt`;
        const testFilePath = join(__dirname, '..', 'data', 'wtaf', testFileName);
        
        const testFileContent = `user_slug: ${testUserSlug}
sender_phone: +15551234567
coach: default
user_prompt: ${testRequest}
timestamp: ${new Date().toISOString()}`;

        await writeFile(testFilePath, testFileContent, 'utf8');
        console.log(`📝 Created test file: ${testFileName}`);

        // Step 2: Test ZAD routing
        console.log('\n🔍 Testing ZAD Detection and Routing...');
        
        // Import and test the classifier
        const { generateCompletePrompt } = await import('../engine/wtaf-processor.js');
        
        const classifierConfig = {
            classifierModel: 'gpt-4o',
            classifierMaxTokens: 1000,
            classifierTemperature: 0.3
        };

        const expandedPrompt = await generateCompletePrompt(testRequest, classifierConfig);
        
        console.log(`📤 Expanded prompt length: ${expandedPrompt.length} chars`);
        
        // Check if it's routed to ZAD
        const isZADRequest = expandedPrompt.includes('ZAD_COMPREHENSIVE_REQUEST:');
        console.log(`🎯 ZAD routing: ${isZADRequest ? '✅ DETECTED' : '❌ NOT DETECTED'}`);

        if (isZADRequest) {
            console.log('✅ ZAD request properly detected and routed');
        } else {
            console.log('⚠️ Request not detected as ZAD - check classifier logic');
        }

        // Step 3: Test template loading
        console.log('\n📋 Testing Template Loading...');
        
        const { callClaude } = await import('../engine/wtaf-processor.js');
        
        const builderConfig = {
            model: 'claude-3-5-sonnet-20241022',
            maxTokens: 8192,
            temperature: 0.7
        };

        console.log('🎨 Testing API-based ZAD template generation...');
        console.log('⚠️ Note: This will call Claude API and may take time');

        // This should use the new API-based template
        const result = await callClaude('', expandedPrompt, builderConfig);
        
        console.log(`📥 Generated code length: ${result.length} chars`);

        // Step 4: Validate API-based code
        console.log('\n🔍 Validating Generated Code...');
        
        const checks = {
            hasAPIHelper: result.includes('callZADAPI'),
            hasAPIEndpoints: result.includes('/api/zad-'),
            noSupabaseClient: !result.includes('window.supabase.createClient'),
            hasAuthFunctions: result.includes('generateNewUser') && result.includes('registerNewUser'),
            hasPolling: result.includes('startPolling'),
            hasWTAFStyling: result.includes('floating-emoji')
        };

        console.log('🔍 Code Validation Results:');
        Object.entries(checks).forEach(([check, passed]) => {
            console.log(`   ${passed ? '✅' : '❌'} ${check}: ${passed ? 'PASS' : 'FAIL'}`);
        });

        const allChecksPassed = Object.values(checks).every(Boolean);
        
        if (allChecksPassed) {
            console.log('\n🎉 ALL TESTS PASSED! API-based ZAD implementation working correctly');
            
            // Save test output for inspection
            const outputPath = join(__dirname, '..', 'logs', `zad-api-test-output-${Date.now()}.html`);
            await writeFile(outputPath, result, 'utf8');
            console.log(`💾 Generated code saved to: ${outputPath}`);
            
        } else {
            console.log('\n❌ Some tests failed - check the implementation');
        }

        // Step 5: Summary
        console.log('\n📊 Test Summary:');
        console.log(`   Request: "${testRequest}"`);
        console.log(`   ZAD Detection: ${isZADRequest ? 'SUCCESS' : 'FAILED'}`);
        console.log(`   Code Generation: ${result.length > 0 ? 'SUCCESS' : 'FAILED'}`);
        console.log(`   API Integration: ${checks.hasAPIHelper ? 'SUCCESS' : 'FAILED'}`);
        console.log(`   Security Features: ${checks.noSupabaseClient ? 'SUCCESS' : 'FAILED'}`);

    } catch (error) {
        console.error('❌ Test failed:', error);
        if (error instanceof Error) {
            console.error('Error details:', error.message);
        }
    }
}

// Run the test
testZADAPIImplementation().catch(console.error); 