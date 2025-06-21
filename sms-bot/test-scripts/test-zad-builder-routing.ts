/**
 * TEST: Zero Admin Data Builder Routing
 * 
 * Tests if processor correctly routes ZAD apps to builder-zad-app.json
 */

import { callClaude } from '../engine/wtaf-processor.js';

async function testZadBuilderRouting() {
    console.log("🧪 TESTING ZAD BUILDER ROUTING");
    console.log("=" + "=".repeat(40));
    
    // Simulate expanded prompt with ZAD metadata (from previous test)
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
        console.log("📥 Testing builder routing with ZAD metadata...");
        
        const builderConfig = {
            model: "gpt-4o", // Use faster model for testing
            maxTokens: 1000,
            temperature: 0.1
        };
        
        // This should trigger routing to builder-zad-app.json
        const result = await callClaude("", expandedPrompt, builderConfig);
        
        console.log(`📤 Generated result (${result.length} chars)`);
        
        // Check for ZAD-specific features that should only come from builder-zad-app.json
        const hasZadFeatures = [
            result.includes('emoji'),
            result.includes('collaborative'),
            result.includes('wtaf_zero_admin_collaborative'),
            result.includes('passcode') || result.includes('code'),
            result.includes('participant') || result.includes('slot')
        ];
        
        const featureCount = hasZadFeatures.filter(Boolean).length;
        
        console.log("\n🔍 CHECKING BUILDER ROUTING:");
        console.log(`   Contains emoji features: ${hasZadFeatures[0] ? '✅' : '❌'}`);
        console.log(`   Contains collaborative text: ${hasZadFeatures[1] ? '✅' : '❌'}`);
        console.log(`   Uses ZAD database table: ${hasZadFeatures[2] ? '✅' : '❌'}`);
        console.log(`   Has passcode system: ${hasZadFeatures[3] ? '✅' : '❌'}`);
        console.log(`   Has participant/slot logic: ${hasZadFeatures[4] ? '✅' : '❌'}`);
        
        if (featureCount >= 3) {
            console.log("🎉 SUCCESS: Builder routing working! ZAD features detected!");
        } else {
            console.log("❌ FAILURE: Builder routing may not be working correctly");
            console.log("\n📝 Generated content preview:");
            console.log(result.substring(0, 500) + "...");
        }
        
    } catch (error) {
        console.error("💥 Error:", error);
    }
}

testZadBuilderRouting().catch(console.error); 