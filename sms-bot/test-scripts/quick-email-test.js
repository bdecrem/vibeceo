#!/usr/bin/env node

/**
 * QUICK TEST: Single Email Classifier Test
 * Just test one case to see if the enhancement is working
 */

import { generateCompletePrompt } from '../dist/engine/wtaf-processor.js';

const testConfig = {
    classifierModel: 'gpt-4o',
    classifierMaxTokens: 1000,
    classifierTemperature: 0.7
};

console.log("🧪 QUICK EMAIL CLASSIFIER TEST");
console.log("Testing: 'wtaf build me a newsletter signup'");
console.log("Expected: EMAIL_NEEDED: true");
console.log("=" + "=".repeat(50));

try {
    const result = await generateCompletePrompt("wtaf build me a newsletter signup", testConfig);
    
    console.log("\n📤 FULL RESPONSE:");
    console.log(result);
    console.log("\n" + "=".repeat(50));
    
    // Check for metadata
    const metadataMatch = result.match(/---WTAF_METADATA---([\s\S]*?)---END_METADATA---/);
    if (metadataMatch) {
        console.log("✅ METADATA FOUND!");
        console.log("📊 Raw metadata:", metadataMatch[1].trim());
        
        const emailNeeded = metadataMatch[1].match(/EMAIL_NEEDED:\s*(true|false)/i);
        if (emailNeeded) {
            console.log(`🎯 EMAIL_NEEDED: ${emailNeeded[1]}`);
            if (emailNeeded[1].toLowerCase() === 'true') {
                console.log("🎉 SUCCESS! Email detection working!");
            } else {
                console.log("❌ FAIL: Should have detected email needed");
            }
        }
    } else {
        console.log("❌ NO METADATA FOUND!");
    }
    
} catch (error) {
    console.error("💥 ERROR:", error.message);
} 