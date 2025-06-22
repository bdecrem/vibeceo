#!/usr/bin/env node

/**
 * TEST SEQUENTIAL DECISION TREE CLASSIFIER
 * 
 * Validates that the new sequential decision tree approach works correctly
 * and produces better, more logical classification decisions.
 */

import { generateCompletePrompt } from '../engine/wtaf-processor.js';

async function testSequentialClassifier() {
    console.log("🌳 Testing Sequential Decision Tree Classifier...\n");

    // Test requests designed to test the sequential logic
    const testRequests = [
        // Step 1: Email-only (should be caught first)
        { request: "create my business card", expected: "SIMPLE_EMAIL", step: 1 },
        { request: "build my portfolio", expected: "SIMPLE_EMAIL", step: 1 },
        
        // Step 2: ZAD (should be caught second, not confused with data collection)
        { request: "make a discussion board for my study group", expected: "ZAD", step: 2 },
        { request: "build a place where me and my friends can share ideas", expected: "ZAD", step: 2 },
        
        // Step 3: Data collection (should be caught third)
        { request: "build me a contact form", expected: "DATA_COLLECTION", step: 3 },
        { request: "make a newsletter signup", expected: "DATA_COLLECTION", step: 3 },
        
        // Step 4: Standard app (fallback)
        { request: "build a calculator app", expected: "STANDARD_APP", step: 4 },
        { request: "create a weather widget", expected: "STANDARD_APP", step: 4 }
    ];

    let correctClassifications = 0;
    let totalTests = testRequests.length;

    for (let i = 0; i < testRequests.length; i++) {
        const { request, expected, step } = testRequests[i];
        
        console.log(`\n🧪 TEST ${i + 1}/${totalTests}: "${request}"`);
        console.log(`📋 Expected: ${expected} (Step ${step})`);
        console.log("-".repeat(60));

        try {
            const expandedPrompt = await generateCompletePrompt(request, {
                classifierModel: 'gpt-4o',
                classifierMaxTokens: 1500,
                classifierTemperature: 0.7
            });

            // Determine actual classification
            const isEmail = expandedPrompt.includes('EMAIL_NEEDED: true');
            const isZad = expandedPrompt.includes('ZERO_ADMIN_DATA: true');
            const isDataCollection = expandedPrompt.includes('APP_TYPE: data_collection');
            const isStandardApp = expandedPrompt.includes('APP_TYPE: standard_app');
            
            let actualClassification = 'UNKNOWN';
            let actualStep = 0;
            
            if (isEmail) {
                actualClassification = 'SIMPLE_EMAIL';
                actualStep = 1;
            } else if (isZad) {
                actualClassification = 'ZAD'; 
                actualStep = 2;
            } else if (isDataCollection) {
                actualClassification = 'DATA_COLLECTION';
                actualStep = 3;
            } else if (isStandardApp) {
                actualClassification = 'STANDARD_APP';
                actualStep = 4;
            }

            const isCorrect = actualClassification === expected;
            const correctStep = actualStep === step;
            
            if (isCorrect) correctClassifications++;

            console.log(`🎯 Actual: ${actualClassification} (Step ${actualStep}) ${isCorrect ? '✅' : '❌'}`);
            console.log(`🌳 Sequential Logic: ${correctStep ? '✅ Correct step' : '❌ Wrong step'}`);
            
            // Show ZAD creative plan if applicable
            if (isZad) {
                const hasCreativePlan = expandedPrompt.includes('ZAD_CREATIVE_PLAN:');
                console.log(`🎨 ZAD Creative Plan: ${hasCreativePlan ? '✅ Generated' : '❌ Missing'}`);
            }

        } catch (error) {
            console.log(`❌ Error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // Summary
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📊 SEQUENTIAL CLASSIFIER RESULTS`);
    console.log(`${'='.repeat(60)}`);
    console.log(`🎯 Classification Accuracy: ${correctClassifications}/${totalTests} (${Math.round(correctClassifications/totalTests*100)}%)`);
    
    // Test decision tree logic
    console.log(`\n🌳 Decision Tree Logic:`);
    console.log(`   Step 1 (Email): Tests simple cases first`);
    console.log(`   Step 2 (ZAD): Tests collaborative cases before data collection`);
    console.log(`   Step 3 (Data Collection): Tests admin-needed cases`); 
    console.log(`   Step 4 (Standard): Fallback for everything else`);
    
    if (correctClassifications === totalTests) {
        console.log(`\n🎉 SEQUENTIAL LOGIC WORKING PERFECTLY!`);
    } else {
        console.log(`\n⚠️  Some classification issues - review results above`);
    }
}

// Run the test
testSequentialClassifier().catch(console.error); 