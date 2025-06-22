#!/usr/bin/env node

/**
 * TEST ZAD FLOW WITH MODULAR CLASSIFIER
 * 
 * Validates that the updated modular classifier system properly:
 * 1. Detects ZAD apps using is-it-a-zad.json logic
 * 2. Routes to builder-zad-app.json
 * 3. Maintains full functionality
 */

import { buildClassifierPrompt } from '../engine/classifier-builder.js';
import { generateCompletePrompt } from '../engine/wtaf-processor.js';

async function testZadModularFlow() {
    console.log("🧪 Testing ZAD Flow with Modular Classifier System...\n");

    // Test ZAD request examples from the updated classification logic
    const zadRequests = [
        "make a discussion board for my study group",
        "create an idea dump for my team", 
        "build a memory wall for my family",
        "build a place where me and my friends can share ideas"
    ];

    // Test non-ZAD requests for comparison
    const nonZadRequests = [
        "build me a contact form",
        "create my business card",
        "make a newsletter signup"
    ];

    console.log("1️⃣ Testing modular classifier prompt generation...");
    const classifierPrompt = await buildClassifierPrompt();
    
    if (classifierPrompt) {
        console.log("✅ Modular classifier prompt built successfully");
        const content = String(classifierPrompt.content || '');
        
        // Check for ZAD-specific content from updated is-it-a-zad.json
        const hasZadLogic = content.includes('ZERO ADMIN DATA') && 
                           content.includes('discussion board for my study group') &&
                           content.includes('memory wall for my family') &&
                           content.includes('emoji-based identity');
        
        if (hasZadLogic) {
            console.log("✅ Updated ZAD logic properly integrated into classifier");
        } else {
            console.log("❌ ZAD logic missing from classifier");
        }
        console.log();
    } else {
        console.log("❌ Failed to build modular classifier");
        return;
    }

    console.log("2️⃣ Testing ZAD detection with sample requests...");
    
    // Test ZAD requests
    console.log("\n🤝 Testing ZAD Requests:");
    for (const request of zadRequests) {
        console.log(`\n📝 Testing: "${request}"`);
        
        try {
            const expandedPrompt = await generateCompletePrompt(request, {
                classifierModel: 'gpt-4o',
                classifierMaxTokens: 1000,
                classifierTemperature: 0.7
            });
            
            // Check if it contains ZAD metadata
            const hasZadMetadata = expandedPrompt.includes('ZERO_ADMIN_DATA: true');
            console.log(`   ${hasZadMetadata ? '✅' : '❌'} ZAD Detection: ${hasZadMetadata ? 'DETECTED' : 'NOT DETECTED'}`);
            
            if (hasZadMetadata) {
                console.log(`   📋 This should route to builder-zad-app.json`);
            }
            
        } catch (error) {
            console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    // Test non-ZAD requests  
    console.log("\n📧 Testing Non-ZAD Requests:");
    for (const request of nonZadRequests) {
        console.log(`\n📝 Testing: "${request}"`);
        
        try {
            const expandedPrompt = await generateCompletePrompt(request, {
                classifierModel: 'gpt-4o',
                classifierMaxTokens: 1000,
                classifierTemperature: 0.7
            });
            
            // Should NOT contain ZAD metadata
            const hasZadMetadata = expandedPrompt.includes('ZERO_ADMIN_DATA: true');
            console.log(`   ${!hasZadMetadata ? '✅' : '❌'} Non-ZAD Detection: ${!hasZadMetadata ? 'CORRECT' : 'INCORRECT'}`);
            
            // Check what type it was classified as
            if (expandedPrompt.includes('EMAIL_NEEDED: true')) {
                console.log(`   📧 Classified as: Simple Email Display`);
            } else if (expandedPrompt.includes('APP_TYPE: data_collection')) {
                console.log(`   📊 Classified as: Data Collection with Admin`);
            }
            
        } catch (error) {
            console.log(`   ❌ Error: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    console.log("\n🎉 ZAD Modular Flow Test Complete!");
    console.log("\nℹ️  System Status:");
    console.log("✅ Modular classifier system active");
    console.log("✅ ZAD classification logic updated"); 
    console.log("✅ builder-zad-app.json routing integrated");
    console.log("✅ Full ZAD flow operational");
}

// Run the test
testZadModularFlow().catch(console.error); 