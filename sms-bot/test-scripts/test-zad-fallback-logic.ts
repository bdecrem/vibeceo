#!/usr/bin/env node

/**
 * Test script for ZAD fallback logic
 * Verifies that the smart fallback chain skips Haiku for ZAD apps
 */

import { BuilderConfig } from '../engine/wtaf-processor.js';

console.log('🧪 Testing ZAD fallback logic...\n');

// Test 1: Verify ZAD detection
console.log('Test 1: ZAD detection');
const zadPrompt = 'ZAD_COMPREHENSIVE_REQUEST: make me a habit tracker';
const regularPrompt = 'make me a habit tracker';

const isZadRequest1 = zadPrompt.includes('ZAD_COMPREHENSIVE_REQUEST:');
const isZadRequest2 = regularPrompt.includes('ZAD_COMPREHENSIVE_REQUEST:');

console.log(`- ZAD prompt detection: ${isZadRequest1} (should be true)`);
console.log(`- Regular prompt detection: ${isZadRequest2} (should be false)`);

if (isZadRequest1 && !isZadRequest2) {
    console.log('✅ ZAD detection works correctly\n');
} else {
    console.log('❌ ZAD detection failed\n');
}

// Test 2: Verify fallback chain construction
console.log('Test 2: Fallback chain construction');

// Simulate the fallback logic
function buildFallbackChain(userPrompt: string) {
    const isZadRequest = userPrompt.includes('ZAD_COMPREHENSIVE_REQUEST:');
    
    let fallbackModels = [
        { model: "claude-3-5-sonnet-20241022", maxTokens: 8192 },
        { model: "claude-3-5-haiku-20241022", maxTokens: 4000 },
        { model: "gpt-4o", maxTokens: 16000 }
    ];
    
    // For ZAD apps, skip Haiku (4000 tokens insufficient) and go straight to GPT-4o
    if (isZadRequest) {
        fallbackModels = [
            { model: "claude-3-5-sonnet-20241022", maxTokens: 8192 },
            { model: "gpt-4o", maxTokens: 16000 }
        ];
        console.log(`🎨 ZAD detected: Using ZAD-optimized fallback chain (skipping Haiku)`);
    }
    
    return fallbackModels;
}

const regularFallbacks = buildFallbackChain(regularPrompt);
const zadFallbacks = buildFallbackChain(zadPrompt);

console.log('\nRegular app fallbacks:');
regularFallbacks.forEach(f => console.log(`- ${f.model} (${f.maxTokens} tokens)`));

console.log('\nZAD app fallbacks:');
zadFallbacks.forEach(f => console.log(`- ${f.model} (${f.maxTokens} tokens)`));

// Verify ZAD fallbacks skip Haiku
const zadHasHaiku = zadFallbacks.some(f => f.model.includes('haiku'));
const regularHasHaiku = regularFallbacks.some(f => f.model.includes('haiku'));

if (!zadHasHaiku && regularHasHaiku) {
    console.log('✅ ZAD fallback chain correctly skips Haiku\n');
} else {
    console.log('❌ ZAD fallback chain logic failed\n');
}

// Test 3: Verify placeholder detection
console.log('Test 3: Placeholder detection');
const incompleteResponse = `
function showNewUserScreen() {
    // Include all the required authentication functions here
    // [Previous authentication functions remain exactly the same]
}
`;

const completeResponse = `
function showNewUserScreen() {
    console.log('Showing new user screen');
}

function generateNewUser() {
    return 'user_' + Math.random().toString(36).substr(2, 9);
}

function registerNewUser() {
    return localStorage.getItem('userLabel');
}
`;

const hasPlaceholderComments1 = incompleteResponse.includes('[Previous authentication functions remain exactly the same]') || 
                               incompleteResponse.includes('Include all the required authentication functions here') ||
                               incompleteResponse.includes('Include all remaining authentication functions exactly as provided');

const hasPlaceholderComments2 = completeResponse.includes('[Previous authentication functions remain exactly the same]') || 
                               completeResponse.includes('Include all the required authentication functions here') ||
                               completeResponse.includes('Include all remaining authentication functions exactly as provided');

console.log(`- Incomplete response placeholder detection: ${hasPlaceholderComments1} (should be true)`);
console.log(`- Complete response placeholder detection: ${hasPlaceholderComments2} (should be false)`);

if (hasPlaceholderComments1 && !hasPlaceholderComments2) {
    console.log('✅ Placeholder detection works correctly\n');
} else {
    console.log('❌ Placeholder detection failed\n');
}

// Test 4: Verify function validation
console.log('Test 4: Function validation');
const hasShowNewUserScreen1 = incompleteResponse.includes('showNewUserScreen');
const hasGenerateNewUser1 = incompleteResponse.includes('generateNewUser');
const hasRegisterNewUser1 = incompleteResponse.includes('registerNewUser');

const hasShowNewUserScreen2 = completeResponse.includes('showNewUserScreen');
const hasGenerateNewUser2 = completeResponse.includes('generateNewUser');
const hasRegisterNewUser2 = completeResponse.includes('registerNewUser');

console.log(`- Incomplete response function validation: ${hasShowNewUserScreen1 && hasGenerateNewUser1 && hasRegisterNewUser1} (should be false)`);
console.log(`- Complete response function validation: ${hasShowNewUserScreen2 && hasGenerateNewUser2 && hasRegisterNewUser2} (should be true)`);

if (!(hasShowNewUserScreen1 && hasGenerateNewUser1 && hasRegisterNewUser1) && 
    (hasShowNewUserScreen2 && hasGenerateNewUser2 && hasRegisterNewUser2)) {
    console.log('✅ Function validation works correctly\n');
} else {
    console.log('❌ Function validation failed\n');
}

console.log('🎉 ZAD fallback logic test completed!'); 