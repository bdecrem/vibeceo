#!/usr/bin/env node

/**
 * Show the EXACT classifier output for "Build a chat page for me and my friend"
 */

import { generateCompletePrompt } from '../engine/wtaf-processor.js';

async function showExactClassifierOutput() {
    console.log("🔍 Showing EXACT classifier output for: 'Build a chat page for me and my friend'\n");
    
    try {
        const exactRequest = "Build a chat page for me and my friend";
        
        // This is exactly what the system does
        const classifierOutput = await generateCompletePrompt(exactRequest, {
            classifierModel: 'gpt-4o',
            classifierMaxTokens: 1000,
            classifierTemperature: 0.7
        });
        
        console.log("=" + "=".repeat(80));
        console.log("EXACT CLASSIFIER GPT RESPONSE:");
        console.log("=" + "=".repeat(80));
        console.log(classifierOutput);
        console.log("=" + "=".repeat(80));
        
    } catch (error) {
        console.log("❌ Error:", error instanceof Error ? error.message : String(error));
    }
}

// Run it
showExactClassifierOutput().catch(console.error); 