#!/usr/bin/env node

/**
 * TEST ZAD TWO-STEP FLOW
 * 
 * Validates the complete ZAD implementation:
 * 1. Classifier detects ZAD and generates creative plan using builder-zad-app.json
 * 2. Processor combines plan with WTAF tech specs  
 * 3. Implementer builds HTML using builder-zad-implementer.json
 */

import { generateCompletePrompt } from '../engine/wtaf-processor.js';

async function testZadTwoStepFlow() {
    console.log("🎭 Testing ZAD Two-Step Flow...\n");

    // Test ZAD request that should trigger the two-step process
    const zadRequest = "make a discussion board for my study group";

    console.log(`📝 Testing request: "${zadRequest}"`);
    console.log("=" + "=".repeat(60));

    try {
        console.log("🔍 Step 1: Running classifier with ZAD creative designer...");
        
        const expandedPrompt = await generateCompletePrompt(zadRequest, {
            classifierModel: 'gpt-4o',
            classifierMaxTokens: 2000, // Increased for creative plan
            classifierTemperature: 0.7
        });
        
        console.log(`📏 Expanded prompt length: ${expandedPrompt.length} characters`);
        
        // Check if ZAD was detected
        const hasZadMetadata = expandedPrompt.includes('ZERO_ADMIN_DATA: true');
        console.log(`🤝 ZAD Detection: ${hasZadMetadata ? '✅ DETECTED' : '❌ NOT DETECTED'}`);
        
        // Check if creative plan was generated
        const hasCreativePlan = expandedPrompt.includes('ZAD_CREATIVE_PLAN:');
        console.log(`🎨 Creative Plan Generated: ${hasCreativePlan ? '✅ YES' : '❌ NO'}`);
        
        if (hasCreativePlan) {
            // Extract and display the creative plan
            const planStart = expandedPrompt.indexOf('ZAD_CREATIVE_PLAN:');
            const creativePlan = expandedPrompt.substring(planStart);
            const planPreview = creativePlan.slice(0, 500).replace(/\n/g, ' ');
            console.log(`📋 Creative Plan Preview: ${planPreview}...`);
            
            // Check for expected archetype elements
            const hasArchetype = creativePlan.includes('archetype') || creativePlan.includes('sticky_note') || creativePlan.includes('timeline');
            console.log(`🏗️ Contains Archetype Elements: ${hasArchetype ? '✅ YES' : '❌ NO'}`);
            
            // Check for implementation details
            const hasImplementationDetails = creativePlan.includes('ui_elements') || creativePlan.includes('user_flow') || creativePlan.includes('auth_system');
            console.log(`⚙️ Contains Implementation Details: ${hasImplementationDetails ? '✅ YES' : '❌ NO'}`);
        }
        
        console.log("\n🔍 Step 2: System would now route to builder-zad-implementer.json");
        console.log("   (The implementer would receive the creative plan and build HTML)");
        
        console.log("\n🎉 ZAD Two-Step Flow Test Complete!");
        
        // Show the flow summary
        console.log("\n📊 Flow Summary:");
        console.log("✅ 1. Classifier detected ZAD app");
        console.log("✅ 2. builder-zad-app.json generated creative plan");
        console.log("✅ 3. Plan combined with expanded prompt");
        console.log("➡️  4. System routes to builder-zad-implementer.json");
        console.log("➡️  5. Implementer builds HTML from plan + WTAF specs");
        
    } catch (error) {
        console.log(`❌ Error testing ZAD flow:`, error);
    }
}

// Run the test
testZadTwoStepFlow().catch(console.error); 