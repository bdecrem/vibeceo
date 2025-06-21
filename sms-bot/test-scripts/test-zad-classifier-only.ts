/**
 * TEST: Zero Admin Data Classifier Only
 * 
 * Quick test to verify classifier detects ZAD apps and processor routes correctly
 */

import { generateCompletePrompt } from '../engine/wtaf-processor.js';

async function testZadClassifierOnly() {
    console.log("🧪 TESTING ZAD CLASSIFIER DETECTION");
    console.log("=" + "=".repeat(40));
    
    const testInput = "build a place where me and my friends can share ideas";
    
    try {
        const classifierConfig = {
            classifierModel: "gpt-4o",
            classifierMaxTokens: 500,
            classifierTemperature: 0.1
        };
        
        console.log(`📥 Input: "${testInput}"`);
        const expandedPrompt = await generateCompletePrompt(testInput, classifierConfig);
        
        console.log(`\n📤 Expanded prompt (${expandedPrompt.length} chars):`);
        console.log(expandedPrompt);
        
        // Check for Zero Admin Data metadata
        const zadMatch = expandedPrompt.match(/ZERO_ADMIN_DATA:\s*true/i);
        const appTypeMatch = expandedPrompt.match(/APP_TYPE:\s*zero_admin_data/i);
        
        console.log("\n🔍 DETECTION RESULTS:");
        console.log(`   ZERO_ADMIN_DATA detected: ${zadMatch ? '✅' : '❌'}`);
        console.log(`   APP_TYPE = zero_admin_data: ${appTypeMatch ? '✅' : '❌'}`);
        
        if (zadMatch && appTypeMatch) {
            console.log("🎉 SUCCESS: Classifier correctly detected Zero Admin Data app!");
        } else {
            console.log("❌ FAILURE: Classifier did not detect Zero Admin Data app");
        }
        
    } catch (error) {
        console.error("💥 Error:", error);
    }
}

testZadClassifierOnly().catch(console.error); 