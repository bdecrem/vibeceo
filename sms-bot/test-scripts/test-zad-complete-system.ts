#!/usr/bin/env node

/**
 * TEST COMPLETE ZAD SYSTEM
 * 
 * Tests 10 different requests through the complete ZAD system:
 * 1. Shows ZAD/not-ZAD classification decisions
 * 2. Shows creative plans generated for ZAD apps
 * 3. Validates the two-step process is working correctly
 */

import { generateCompletePrompt } from '../engine/wtaf-processor.js';

async function testCompleteZadSystem() {
    console.log("🧪 Testing Complete ZAD System with 10 Requests...\n");

    // Test requests from the original test-new-zad-classifier.ts
    const testRequests = [
        // Expected ZAD apps
        { request: "build a place where me and my friends can share ideas", expected: "ZAD" },
        { request: "make a discussion board for my study group", expected: "ZAD" },
        { request: "create an idea dump for my startup team", expected: "ZAD" },
        { request: "build a thought sharing app for my book club", expected: "ZAD" },
        { request: "make a brainstorm space for my family", expected: "ZAD" },
        
        // Expected non-ZAD apps
        { request: "build me a contact form", expected: "DATA_COLLECTION" },
        { request: "create my business card", expected: "SIMPLE_EMAIL" },
        { request: "make a newsletter signup", expected: "DATA_COLLECTION" },
        { request: "build my portfolio", expected: "SIMPLE_EMAIL" },
        { request: "create a survey for customers", expected: "DATA_COLLECTION" }
    ];

    let correctClassifications = 0;
    let zadPlansGenerated = 0;

    for (let i = 0; i < testRequests.length; i++) {
        const { request, expected } = testRequests[i];
        
        console.log(`\n${'='.repeat(80)}`);
        console.log(`🧪 TEST ${i + 1}/10: "${request}"`);
        console.log(`📋 Expected: ${expected}`);
        console.log(`${'='.repeat(80)}`);

        try {
            const expandedPrompt = await generateCompletePrompt(request, {
                classifierModel: 'gpt-4o',
                classifierMaxTokens: 2000,
                classifierTemperature: 0.7
            });

            // Check classification decision
            const isZad = expandedPrompt.includes('ZERO_ADMIN_DATA: true');
            const isEmail = expandedPrompt.includes('EMAIL_NEEDED: true');
            const isDataCollection = expandedPrompt.includes('APP_TYPE: data_collection');
            
            let actualClassification = 'UNKNOWN';
            if (isZad) actualClassification = 'ZAD';
            else if (isEmail) actualClassification = 'SIMPLE_EMAIL';
            else if (isDataCollection) actualClassification = 'DATA_COLLECTION';

            const isCorrect = actualClassification === expected;
            if (isCorrect) correctClassifications++;

            console.log(`🎯 Actual: ${actualClassification} ${isCorrect ? '✅' : '❌'}`);
            
            // Check for creative plan if ZAD
            const hasCreativePlan = expandedPrompt.includes('ZAD_CREATIVE_PLAN:');
            
            if (isZad && hasCreativePlan) {
                zadPlansGenerated++;
                console.log(`🎨 Creative Plan: ✅ GENERATED`);
                
                // Extract and analyze the creative plan
                const planStart = expandedPrompt.indexOf('ZAD_CREATIVE_PLAN:');
                const creativePlan = expandedPrompt.substring(planStart);
                
                // Look for key elements
                const hasArchetype = creativePlan.includes('"archetype"');
                const hasImplementationPlan = creativePlan.includes('"implementation_plan"');
                const hasViability = creativePlan.includes('"is_viable_zad"');
                const hasConstraints = creativePlan.includes('"constraints"');
                
                console.log(`   🏗️  Contains archetype: ${hasArchetype ? '✅' : '❌'}`);
                console.log(`   ⚙️  Contains implementation plan: ${hasImplementationPlan ? '✅' : '❌'}`);
                console.log(`   ✨  Contains viability check: ${hasViability ? '✅' : '❌'}`);
                console.log(`   📊  Contains constraints: ${hasConstraints ? '✅' : '❌'}`);
                
                // Try to extract archetype if present
                const archetypeMatch = creativePlan.match(/"archetype":\s*"([^"]+)"/);
                if (archetypeMatch) {
                    console.log(`   🎭  Archetype: "${archetypeMatch[1]}"`);
                }
                
                // Show a snippet of the plan
                const planSnippet = creativePlan.slice(0, 200).replace(/\n/g, ' ');
                console.log(`   📝  Plan snippet: ${planSnippet}...`);
                
            } else if (isZad && !hasCreativePlan) {
                console.log(`🎨 Creative Plan: ❌ MISSING (ZAD detected but no plan generated)`);
            } else {
                console.log(`🎨 Creative Plan: ➖ N/A (not a ZAD app)`);
            }

        } catch (error) {
            console.log(`❌ Error processing request: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // Summary
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📊 FINAL RESULTS`);
    console.log(`${'='.repeat(80)}`);
    console.log(`🎯 Classification Accuracy: ${correctClassifications}/${testRequests.length} (${Math.round(correctClassifications/testRequests.length*100)}%)`);
    console.log(`🎨 ZAD Creative Plans Generated: ${zadPlansGenerated}/${testRequests.filter(t => t.expected === 'ZAD').length}`);
    
    const expectedZadCount = testRequests.filter(t => t.expected === 'ZAD').length;
    const expectedNonZadCount = testRequests.length - expectedZadCount;
    
    console.log(`\n📈 Breakdown:`);
    console.log(`   Expected ZAD apps: ${expectedZadCount}`);
    console.log(`   Expected non-ZAD apps: ${expectedNonZadCount}`);
    console.log(`   Creative plans for ZAD apps: ${zadPlansGenerated}/${expectedZadCount}`);
    
    if (correctClassifications === testRequests.length && zadPlansGenerated === expectedZadCount) {
        console.log(`\n🎉 PERFECT SCORE! All classifications correct and all ZAD plans generated!`);
    } else {
        console.log(`\n⚠️  Some issues detected - review individual test results above`);
    }
}

// Run the test
testCompleteZadSystem().catch(console.error); 