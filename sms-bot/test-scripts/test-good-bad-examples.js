#!/usr/bin/env node

/**
 * TEST: Good vs Bad Email Classification
 * Tests the updated classifier with concrete examples
 */

import { generateCompletePrompt } from '../dist/engine/wtaf-processor.js';

const testConfig = {
    classifierModel: 'gpt-4o',
    classifierMaxTokens: 1000,
    classifierTemperature: 0.7
};

// GOOD examples (should return EMAIL_NEEDED: true)
const goodTests = [
    "wtaf build me a business card",
    "wtaf create an about page for my consulting firm", 
    "wtaf make a landing page for my photography business",
    "wtaf build a coming soon page",
    "wtaf create a personal portfolio",
    "wtaf make a small business website"
];

// BAD examples (should return EMAIL_NEEDED: false)
const badTests = [
    "wtaf build me a newsletter signup",
    "wtaf create a contact form",
    "wtaf make a booking system",
    "wtaf build a registration page"
];

function parseEmailNeeded(response) {
    const metadataMatch = response.match(/EMAIL_NEEDED:\s*(true|false)/i);
    return metadataMatch ? metadataMatch[1].toLowerCase() === 'true' : null;
}

async function testClassification(input, expected, label) {
    console.log(`\n🧪 ${label}: ${input}`);
    console.log(`🎯 Expected: ${expected}`);
    
    try {
        const result = await generateCompletePrompt(input, testConfig);
        const emailNeeded = parseEmailNeeded(result);
        
        if (emailNeeded === expected) {
            console.log(`✅ CORRECT: ${emailNeeded}`);
            return true;
        } else {
            console.log(`❌ WRONG: got ${emailNeeded}, expected ${expected}`);
            return false;
        }
    } catch (error) {
        console.log(`💥 ERROR: ${error.message}`);
        return false;
    }
}

console.log("🧪 TESTING GOOD vs BAD EMAIL CLASSIFICATION");
console.log("=" + "=".repeat(50));

let passed = 0;
let total = 0;

// Test GOOD examples
console.log("\n✅ GOOD EXAMPLES (should need simple email display):");
for (const test of goodTests) {
    total++;
    if (await testClassification(test, true, "GOOD")) passed++;
    await new Promise(r => setTimeout(r, 500));
}

// Test BAD examples  
console.log("\n❌ BAD EXAMPLES (should NOT need simple email):");
for (const test of badTests) {
    total++;
    if (await testClassification(test, false, "BAD")) passed++;
    await new Promise(r => setTimeout(r, 500));
}

console.log(`\n🏁 RESULTS: ${passed}/${total} correct (${Math.round(passed/total*100)}%)`);
if (passed === total) {
    console.log("🎉 PERFECT! Classifier is working correctly!");
} else {
    console.log("⚠️ Some tests failed - classifier needs adjustment");
} 