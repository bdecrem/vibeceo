/**
 * TEST: Complete ZAD Pipeline with App Generation
 * 
 * Simulates the complete end-to-end Zero Admin Data pipeline
 */

import { generateCompletePrompt, callClaude } from '../engine/wtaf-processor.js';
import { writeFile } from 'fs/promises';

async function testFullZadPipeline() {
    console.log("🚀 TESTING COMPLETE ZAD PIPELINE");
    console.log("=" + "=".repeat(50));
    
    const userRequest = "build a place where me and my friends can share ideas";
    console.log(`📥 USER REQUEST: "${userRequest}"`);
    
    try {
        // STEP 1: Classifier (expandedPrompt)
        console.log("\n🔍 STEP 1: Running classifier...");
        const classifierConfig = {
            classifierModel: "gpt-4o",
            classifierMaxTokens: 500,
            classifierTemperature: 0.1
        };
        
        const expandedPrompt = await generateCompletePrompt(userRequest, classifierConfig);
        console.log("✅ Classifier complete - detected ZAD app");
        
        // STEP 2: Builder (generate app)
        console.log("\n🔧 STEP 2: Running ZAD builder...");
        const builderConfig = {
            model: "claude-3-5-sonnet-20241022",
            maxTokens: 8192,
            temperature: 0.3
        };
        
        const generatedApp = await callClaude("", expandedPrompt, builderConfig);
        console.log(`✅ App generated - ${generatedApp.length} characters`);
        
        // STEP 3: Save generated app
        console.log("\n💾 STEP 3: Saving generated app...");
        const timestamp = new Date().toISOString().replace(/:/g, '-');
        const filename = `zad-app-${timestamp}.html`;
        const filepath = `logs/${filename}`;
        
        await writeFile(filepath, generatedApp);
        console.log(`✅ App saved to: ${filepath}`);
        
        // STEP 4: Analyze result
        console.log("\n🔍 STEP 4: Analyzing generated app...");
        const features = {
            emojis: /🎯.*🎨.*🎮.*🎪.*🎭/.test(generatedApp),
            database: generatedApp.includes('wtaf_zero_admin_collaborative'),
            passcode: generatedApp.includes('Math.floor(1000'),
            supabase: generatedApp.includes('supabase.createClient'),
            collaboration: generatedApp.includes('shareIdea') || generatedApp.includes('action_type')
        };
        
        Object.entries(features).forEach(([feature, present]) => {
            console.log(`   ${feature}: ${present ? '✅' : '❌'}`);
        });
        
        const successCount = Object.values(features).filter(Boolean).length;
        console.log(`\n🎯 RESULT: ${successCount}/5 ZAD features implemented`);
        
        if (successCount >= 4) {
            console.log("🎉 SUCCESS! Zero Admin Data app generated successfully!");
            console.log(`📂 Open ${filepath} in browser to see your collaborative app!`);
        } else {
            console.log("⚠️ Some ZAD features missing - check the generated app");
        }
        
    } catch (error) {
        console.error("💥 Pipeline error:", error);
    }
    
    console.log("\n" + "=".repeat(51));
}

testFullZadPipeline().catch(console.error); 