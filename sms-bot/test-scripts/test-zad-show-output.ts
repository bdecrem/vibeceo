/**
 * TEST: Show ZAD Builder Full Output
 * 
 * Shows the complete generated app to verify database integration
 */

import { callClaude } from '../engine/wtaf-processor.js';

async function showZadOutput() {
    console.log("🧪 SHOWING ZAD BUILDER FULL OUTPUT");
    console.log("=" + "=".repeat(40));
    
    const expandedPrompt = `The user is requesting the creation of a digital platform designed for idea sharing among a small group of friends.

---WTAF_METADATA---
EMAIL_NEEDED: false
EMAIL_CONTEXT: none
ZERO_ADMIN_DATA: true
ZERO_ADMIN_CONTEXT: This is a multi-user social app for a small group of friends to share and discuss ideas collaboratively.
APP_TYPE: zero_admin_data
---END_METADATA---

REQUEST_TYPE: app`;
    
    try {
        const builderConfig = {
            model: "gpt-4o",
            maxTokens: 4000, // More tokens for complete app
            temperature: 0.1
        };
        
        const result = await callClaude("", expandedPrompt, builderConfig);
        
        console.log("📤 FULL GENERATED APP:");
        console.log("=" + "=".repeat(80));
        console.log(result);
        console.log("=" + "=".repeat(80));
        
        // Check for specific ZAD features
        console.log("\n🔍 FEATURE ANALYSIS:");
        console.log(`   Uses wtaf_zero_admin_collaborative: ${result.includes('wtaf_zero_admin_collaborative') ? '✅' : '❌'}`);
        console.log(`   Has emoji buttons (🎯🎨🎮🎪🎭): ${/🎯.*🎨.*🎮.*🎪.*🎭/.test(result) ? '✅' : '❌'}`);
        console.log(`   Has passcode generation: ${result.includes('Math.floor(1000') ? '✅' : '❌'}`);
        console.log(`   Has Supabase client: ${result.includes('supabase.createClient') ? '✅' : '❌'}`);
        console.log(`   Has participant display: ${result.includes('participants') ? '✅' : '❌'}`);
        console.log(`   Has action_type field: ${result.includes('action_type') ? '✅' : '❌'}`);
        console.log(`   Has participant_data: ${result.includes('participant_data') ? '✅' : '❌'}`);
        
    } catch (error) {
        console.error("💥 Error:", error);
    }
}

showZadOutput().catch(console.error); 