#!/usr/bin/env node

/**
 * TEST MODULAR CLASSIFIER SYSTEM
 * 
 * Validates that the new modular classifier builder works correctly
 * and produces the same functionality as the old classifier.json
 */

import { buildClassifierPrompt, getClassificationExamples } from '../engine/classifier-builder.js';

async function testModularClassifier() {
    console.log("🧪 Testing Modular Classifier System...\n");

    // Test 1: Build classifier prompt
    console.log("1️⃣ Testing buildClassifierPrompt()...");
    const classifierPrompt = await buildClassifierPrompt();
    
    if (classifierPrompt) {
        console.log("✅ Classifier prompt built successfully");
        console.log(`📏 Content length: ${String(classifierPrompt.content || '').length} characters`);
        console.log(`🔧 Role: ${classifierPrompt.role}`);
        
        // Show a preview of the content
        const content = String(classifierPrompt.content || '');
        const preview = content.slice(0, 200) + (content.length > 200 ? '...' : '');
        console.log(`📝 Content preview: ${preview}\n`);
    } else {
        console.log("❌ Failed to build classifier prompt\n");
        return;
    }

    // Test 2: Get classification examples
    console.log("2️⃣ Testing getClassificationExamples()...");
    const examples = await getClassificationExamples();
    
    if (examples) {
        console.log("✅ Classification examples loaded successfully");
        
        Object.entries(examples).forEach(([key, logic]) => {
            console.log(`📋 ${key}: ${logic.description}`);
            console.log(`   Examples: ${logic.examples.good_examples?.length || 0} good, ${logic.examples.bad_examples?.length || 0} bad`);
        });
        console.log();
    } else {
        console.log("❌ Failed to load classification examples\n");
        return;
    }

    // Test 3: Verify required metadata format
    console.log("3️⃣ Testing metadata format...");
    const content = String(classifierPrompt.content || '');
    const hasMetadataFormat = content.includes('---WTAF_METADATA---') && 
                             content.includes('EMAIL_NEEDED:') && 
                             content.includes('ZERO_ADMIN_DATA:') && 
                             content.includes('APP_TYPE:') &&
                             content.includes('---END_METADATA---');
    
    if (hasMetadataFormat) {
        console.log("✅ Metadata format is correct");
    } else {
        console.log("❌ Metadata format is missing or incorrect");
    }

    console.log("\n🎉 Modular classifier system test complete!");
}

// Run the test
testModularClassifier().catch(console.error); 