#!/usr/bin/env node

/**
 * TEST SCRIPT: Email Classifier Detection
 * 
 * Tests the enhanced classifier.json to see if it:
 * 1. Still expands user requests properly
 * 2. Correctly detects email-only pages
 * 3. Returns structured metadata
 */

import { generateCompletePrompt } from '../dist/engine/wtaf-processor.js';

// Test configuration - use the creation config from controller.ts
const testConfig = {
    classifierModel: 'gpt-4o',
    classifierMaxTokens: 1000,
    classifierTemperature: 0.7
};

console.log("🧪 TESTING ENHANCED EMAIL CLASSIFIER");
console.log("=" + "=".repeat(60));
console.log(`🤖 Using: ${testConfig.classifierModel}`);
console.log(`🎛️ Config: ${testConfig.classifierMaxTokens} tokens, temp ${testConfig.classifierTemperature}`);
console.log();

/**
 * Test cases: Should detect EMAIL_NEEDED: true
 */
const emailOnlyTests = [
    "wtaf build me a newsletter signup",
    "wtaf create an email capture page", 
    "wtaf make a subscribe to updates page",
    "wtaf build a join our mailing list page",
    "wtaf create a get notified when we launch page",
    "wtaf make an early access signup",
    "wtaf build a simple waitlist page"
];

/**
 * Test cases: Should detect EMAIL_NEEDED: false  
 */
const notEmailOnlyTests = [
    "wtaf build me a contact page",
    "wtaf create a business card page",
    "wtaf make a booking form",
    "wtaf build a registration form",
    "wtaf create a complex app with user profiles"
];

/**
 * Parse metadata from classifier response
 */
function parseMetadata(response) {
    const metadataMatch = response.match(/---WTAF_METADATA---([\s\S]*?)---END_METADATA---/);
    if (!metadataMatch) {
        return { found: false, data: null };
    }
    
    const metadataText = metadataMatch[1].trim();
    const emailNeededMatch = metadataText.match(/EMAIL_NEEDED:\s*(true|false)/i);
    const emailContextMatch = metadataText.match(/EMAIL_CONTEXT:\s*(.+)/i);
    
    return {
        found: true,
        emailNeeded: emailNeededMatch ? emailNeededMatch[1].toLowerCase() === 'true' : null,
        emailContext: emailContextMatch ? emailContextMatch[1].trim() : null,
        rawMetadata: metadataText
    };
}

/**
 * Run a single test
 */
async function runTest(testInput, expectedEmailNeeded, testType) {
    console.log(`\n🧪 TEST: ${testType.toUpperCase()}`);
    console.log(`📥 INPUT: ${testInput}`);
    console.log(`🎯 EXPECTED EMAIL_NEEDED: ${expectedEmailNeeded}`);
    console.log("-".repeat(40));
    
    try {
        const result = await generateCompletePrompt(testInput, testConfig);
        
        console.log(`📤 FULL RESPONSE LENGTH: ${result.length} chars`);
        console.log(`📤 FULL RESPONSE:\n${result}`);
        console.log("-".repeat(40));
        
        // Parse the metadata
        const metadata = parseMetadata(result);
        
        if (!metadata.found) {
            console.log("❌ FAIL: No metadata found in response");
            return false;
        }
        
        console.log(`📊 METADATA FOUND:`);
        console.log(`   EMAIL_NEEDED: ${metadata.emailNeeded}`);
        console.log(`   EMAIL_CONTEXT: ${metadata.emailContext}`);
        console.log(`   RAW METADATA: ${metadata.rawMetadata}`);
        
        // Check if detection matches expectation
        if (metadata.emailNeeded === expectedEmailNeeded) {
            console.log(`✅ SUCCESS: Email detection correct!`);
            return true;
        } else {
            console.log(`❌ FAIL: Expected ${expectedEmailNeeded}, got ${metadata.emailNeeded}`);
            return false;
        }
        
    } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
        return false;
    }
}

/**
 * Main test runner
 */
async function main() {
    let totalTests = 0;
    let passedTests = 0;
    
    // Test email-only cases
    console.log("\n🎯 TESTING EMAIL-ONLY PAGES (should return EMAIL_NEEDED: true)");
    console.log("=" + "=".repeat(60));
    
    for (const testInput of emailOnlyTests) {
        totalTests++;
        const passed = await runTest(testInput, true, "EMAIL-ONLY");
        if (passed) passedTests++;
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Test non-email-only cases  
    console.log("\n🚫 TESTING NON-EMAIL-ONLY PAGES (should return EMAIL_NEEDED: false)");
    console.log("=" + "=".repeat(60));
    
    for (const testInput of notEmailOnlyTests) {
        totalTests++;
        const passed = await runTest(testInput, false, "NOT-EMAIL-ONLY");
        if (passed) passedTests++;
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    // Final results
    console.log("\n🏁 TEST RESULTS");
    console.log("=" + "=".repeat(60));
    console.log(`📊 PASSED: ${passedTests}/${totalTests}`);
    console.log(`📈 SUCCESS RATE: ${Math.round((passedTests/totalTests) * 100)}%`);
    
    if (passedTests === totalTests) {
        console.log("🎉 ALL TESTS PASSED! Email classifier is working correctly!");
    } else {
        console.log("⚠️ Some tests failed. Check the output above for details.");
    }
}

// Run the tests
main().catch(error => {
    console.error("💥 Test runner crashed:", error);
    process.exit(1);
}); 