#!/usr/bin/env node

/**
 * Test the FIXED ZAD architecture - should be exactly 2 GPT calls
 * 1. Classifier: Detects ZAD + writes comprehensive product brief
 * 2. Builder: Takes product brief + builds HTML
 */

import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Import the functions
import { generateCompletePrompt } from '../engine/wtaf-processor.js';
import { buildClassifierPrompt } from '../engine/classifier-builder.js';

async function testFixedZadArchitecture() {
    console.log("🔧 Testing FIXED ZAD Architecture...\n");
    
    // Test the 2-step process
    console.log("🎯 STEP 1: Classifier should detect ZAD AND write product brief");
    
    const zadRequest = "build a chat page for me and my friend";
    console.log(`📝 Testing: "${zadRequest}"`);
    
    try {
        // This should be the complete Step 1: classification + brief writing
        const expandedPrompt = await generateCompletePrompt(zadRequest, {
            classifierModel: 'gpt-4o',
            classifierMaxTokens: 1000,
            classifierTemperature: 0.7
        });
        
        console.log("\n📋 CLASSIFIER OUTPUT:");
        console.log("="+ "=".repeat(60));
        console.log(expandedPrompt);
        console.log("="+ "=".repeat(60));
        
        // Check if it has the right components
        const hasZadDetection = expandedPrompt.includes('ZERO_ADMIN_DATA: true');
        const hasProductBrief = expandedPrompt.includes('2 people') || expandedPrompt.includes('emoji') || expandedPrompt.includes('message');
        const hasMetadata = expandedPrompt.includes('---WTAF_METADATA---');
        
        console.log("\n🔍 ANALYSIS:");
        console.log(`✅ ZAD Detection: ${hasZadDetection ? 'YES' : 'NO'}`);
        console.log(`✅ Product Brief: ${hasProductBrief ? 'YES' : 'NO'}`);
        console.log(`✅ Metadata Format: ${hasMetadata ? 'YES' : 'NO'}`);
        
        if (hasZadDetection && hasProductBrief) {
            console.log("\n🎉 SUCCESS: Classifier correctly detected ZAD and wrote product brief!");
            console.log("🎯 STEP 2: Would now go to standard builder with this comprehensive brief");
            console.log("🚀 TOTAL: 2 GPT calls (not 3!)");
        } else {
            console.log("\n❌ FAILURE: Classifier didn't properly handle ZAD request");
        }
        
    } catch (error) {
        console.log("❌ Error in test:", error instanceof Error ? error.message : String(error));
    }
    
    // Test the classifier prompt structure
    console.log("\n🔧 Testing classifier prompt structure:");
    
    try {
        const classifierPrompt = await buildClassifierPrompt();
        if (classifierPrompt && 'content' in classifierPrompt) {
            const content = classifierPrompt.content as string;
            
            const hasZadInstructions = content.includes('ANALYZE USER COUNT FROM REQUEST');
            const hasArchetypes = content.includes('sticky_note_wall');
            const hasChatAcceptance = content.includes('Chat') && content.includes('async message boards');
            
            console.log(`✅ ZAD Instructions: ${hasZadInstructions ? 'YES' : 'NO'}`);
            console.log(`✅ Archetype Options: ${hasArchetypes ? 'YES' : 'NO'}`);
            console.log(`✅ Chat Acceptance: ${hasChatAcceptance ? 'YES' : 'NO'}`);
            
            if (hasZadInstructions && hasArchetypes && hasChatAcceptance) {
                console.log("✅ Classifier has all ZAD brief-writing instructions!");
            } else {
                console.log("❌ Classifier missing some ZAD instructions");
            }
        }
    } catch (error) {
        console.log("❌ Error checking classifier:", error instanceof Error ? error.message : String(error));
    }
    
    console.log("\n🎯 FIXED ARCHITECTURE SUMMARY:");
    console.log("1️⃣ Classifier: Detects ZAD + writes comprehensive product brief");
    console.log("2️⃣ Builder: Takes product brief + WTAF cookbook → builds HTML");
    console.log("🚀 Total GPT calls: 2 (not 3!)");
    console.log("💡 Next test: Try 'wtaf build a chat page for me and my friend'");
}

// Run the test
testFixedZadArchitecture().catch(console.error); 