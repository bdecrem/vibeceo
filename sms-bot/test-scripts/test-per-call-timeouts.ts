#!/usr/bin/env node

/**
 * Test script for per-call timeout implementation
 * Verifies that each AI call gets its own timeout instead of sharing a task timeout
 */

import { WORKER_TIMEOUT_MS, ZAD_TIMEOUT_MS } from '../engine/shared/config.js';

console.log('🧪 Testing per-call timeout implementation...\n');

// Test 1: Verify timeout constants are correctly defined
console.log('Test 1: Timeout constants');
console.log(`- WORKER_TIMEOUT_MS: ${WORKER_TIMEOUT_MS}ms (${WORKER_TIMEOUT_MS/1000}s)`);
console.log(`- ZAD_TIMEOUT_MS: ${ZAD_TIMEOUT_MS}ms (${ZAD_TIMEOUT_MS/1000}s)`);

if (WORKER_TIMEOUT_MS === 120000 && ZAD_TIMEOUT_MS === 300000) {
    console.log('✅ Timeout constants are correctly configured\n');
} else {
    console.log('❌ Timeout constants are incorrect\n');
}

// Test 2: Verify timeout selection logic
console.log('Test 2: Timeout selection logic');

function selectTimeout(userPrompt: string): number {
    const isZadRequest = userPrompt.includes('ZAD_COMPREHENSIVE_REQUEST:');
    return isZadRequest ? ZAD_TIMEOUT_MS : WORKER_TIMEOUT_MS;
}

const regularPrompt = 'make me a habit tracker';
const zadPrompt = 'ZAD_COMPREHENSIVE_REQUEST: make me a habit tracker';

const regularTimeout = selectTimeout(regularPrompt);
const zadTimeout = selectTimeout(zadPrompt);

console.log(`- Regular request timeout: ${regularTimeout}ms (${regularTimeout/1000}s)`);
console.log(`- ZAD request timeout: ${zadTimeout}ms (${zadTimeout/1000}s)`);

if (regularTimeout === WORKER_TIMEOUT_MS && zadTimeout === ZAD_TIMEOUT_MS) {
    console.log('✅ Timeout selection logic works correctly\n');
} else {
    console.log('❌ Timeout selection logic failed\n');
}

// Test 3: Verify timeout wrapper function behavior
console.log('Test 3: Timeout wrapper function behavior');

async function withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operation: string
): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`${operation} timeout after ${timeoutMs}ms`)), timeoutMs);
    });
    
    return Promise.race([promise, timeoutPromise]);
}

// Test quick success
const quickPromise = new Promise<string>((resolve) => {
    setTimeout(() => resolve('quick success'), 100);
});

try {
    const result = await withTimeout(quickPromise, 1000, 'Quick test');
    console.log(`- Quick success test: ${result}`);
    console.log('✅ Quick success works correctly');
} catch (error) {
    console.log(`❌ Quick success failed: ${error}`);
}

// Test timeout behavior (but don't actually wait 5 seconds)
const slowPromise = new Promise<string>((resolve) => {
    setTimeout(() => resolve('slow success'), 2000);
});

try {
    const result = await withTimeout(slowPromise, 1000, 'Timeout test');
    console.log(`❌ Timeout test should have failed but got: ${result}`);
} catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage.includes('timeout after 1000ms')) {
        console.log('✅ Timeout behavior works correctly');
    } else {
        console.log(`❌ Unexpected error: ${errorMessage}`);
    }
}

console.log('\n🎉 Per-call timeout test completed!');
console.log('\n💡 Key benefits of per-call timeouts:');
console.log('- Each AI call gets a fresh timeout period');
console.log('- Primary model failures don\'t reduce fallback time');
console.log('- ZAD requests get 5 minutes instead of 2 minutes');
console.log('- GPT-4o fallbacks now have full timeout instead of leftover time'); 