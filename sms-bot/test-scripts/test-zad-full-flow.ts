/**
 * TEST: Zero Admin Data Full Flow
 * 
 * Tests the complete pipeline:
 * 1. Classifier detects Zero Admin Data app
 * 2. Processor routes to builder-zad-app.json  
 * 3. Builder generates collaborative app with emoji auth
 * 
 * MICROSERVICE: End-to-end validation for ZAD features
 */

import { generateCompletePrompt, callClaude } from '../engine/wtaf-processor.js';
import { logWithTimestamp, logSuccess, logWarning } from '../engine/shared/logger.js';

/**
 * Test the complete Zero Admin Data flow
 */
async function testZadFlow() {
    console.log("🧪 TESTING ZERO ADMIN DATA FULL FLOW");
    console.log("=" + "=".repeat(50));
    
    const testInput = "build a place where me and my friends can share ideas";
    
    try {
        // STEP 1: Test classifier expansion
        logWithTimestamp("🔍 STEP 1: Testing classifier...");
        const classifierConfig = {
            classifierModel: "gpt-4o",
            classifierMaxTokens: 500,
            classifierTemperature: 0.1
        };
        
        const expandedPrompt = await generateCompletePrompt(testInput, classifierConfig);
        console.log(`📤 Expanded prompt length: ${expandedPrompt.length} chars`);
        
        // Check for Zero Admin Data metadata
        const zadMatch = expandedPrompt.match(/ZERO_ADMIN_DATA:\s*true/i);
        const appTypeMatch = expandedPrompt.match(/APP_TYPE:\s*zero_admin_data/i);
        
        if (zadMatch && appTypeMatch) {
            logSuccess("✅ Classifier correctly detected Zero Admin Data app!");
        } else {
            logWarning("❌ Classifier failed to detect Zero Admin Data app");
            console.log("Expanded prompt:", expandedPrompt);
            return;
        }
        
        // STEP 2: Test builder routing and generation
        logWithTimestamp("🔍 STEP 2: Testing builder routing...");
        const builderConfig = {
            model: "claude-3-5-sonnet-20241022",
            maxTokens: 8192,
            temperature: 0.3
        };
        
        const generatedApp = await callClaude("", expandedPrompt, builderConfig);
        console.log(`📤 Generated app length: ${generatedApp.length} chars`);
        
        // Check for Zero Admin Data features
        const hasEmojiAuth = generatedApp.includes('emoji') || generatedApp.includes('🎯');
        const hasCollaboration = generatedApp.includes('wtaf_zero_admin_collaborative');
        const hasPasscode = generatedApp.includes('passcode') || generatedApp.includes('code');
        const hasSlots = generatedApp.includes('slot') || generatedApp.includes('spot');
        
        console.log("\n🔍 CHECKING ZAD FEATURES:");
        console.log(`   Emoji Authentication: ${hasEmojiAuth ? '✅' : '❌'}`);
        console.log(`   Database Integration: ${hasCollaboration ? '✅' : '❌'}`);
        console.log(`   Passcode System: ${hasPasscode ? '✅' : '❌'}`);
        console.log(`   Slot Management: ${hasSlots ? '✅' : '❌'}`);
        
        if (hasEmojiAuth && hasCollaboration && hasPasscode) {
            logSuccess("🎉 Zero Admin Data app generated successfully!");
            console.log("\n📝 Generated app preview (first 500 chars):");
            console.log(generatedApp.substring(0, 500) + "...");
        } else {
            logWarning("⚠️ Generated app missing some ZAD features");
            console.log("\n📝 Full generated app:");
            console.log(generatedApp);
        }
        
    } catch (error) {
        console.error("💥 Test error:", error);
    }
    
    console.log("\n" + "=".repeat(51));
    console.log("🎉 Zero Admin Data flow test complete!");
}

// Run the test
testZadFlow().catch(console.error); 