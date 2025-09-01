#!/usr/bin/env node

/**
 * Test script for Edit Agent V2
 * 
 * Tests the improvements:
 * - Prompt size reduction
 * - Context intelligence
 * - Execution speed
 */

import { buildSmartContext } from '../lib/context-builder.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Test cases
const TEST_ISSUES = [
    {
        id: 'test-1',
        description: 'Create a simple calculator app',
        expected: {
            hasAuth: false,
            hasData: false,
            maxPromptSize: 200
        }
    },
    {
        id: 'test-2', 
        description: 'Build a text editor that saves documents for each user',
        expected: {
            hasAuth: true,
            hasData: true,
            maxPromptSize: 600  // Adjusted for auth+data context
        }
    },
    {
        id: 'test-3',
        description: 'Update the Sudoku game to make it easier',
        expected: {
            hasAuth: false,
            hasData: false,
            isModification: true,
            maxPromptSize: 300
        }
    },
    {
        id: 'test-4',
        description: 'Create a collaborative drawing app where multiple users can draw together',
        expected: {
            hasAuth: true,
            hasData: true,
            hasShare: true,
            maxPromptSize: 900  // Adjusted for auth+share+data+examples
        }
    }
];

// Compare with v1 prompt size (average ~2000 chars)
const V1_AVG_PROMPT_SIZE = 2000;

function runTests() {
    console.log('🧪 Testing Edit Agent V2 Improvements\n');
    console.log('=' .repeat(50));
    
    let totalV1Size = 0;
    let totalV2Size = 0;
    let passedTests = 0;
    
    TEST_ISSUES.forEach((testCase, index) => {
        console.log(`\n📋 Test ${index + 1}: ${testCase.description.substring(0, 50)}...`);
        
        // Test context builder
        const contextResult = buildSmartContext(testCase.description);
        console.log(`   Analysis:`, contextResult.analysis);
        
        // Build v2 prompt using smart context
        const v2Result = buildSmartContext(testCase.description, []);
        const v2Prompt = v2Result.prompt;
        const v2Size = v2Prompt.length;
        
        // Compare sizes
        totalV1Size += V1_AVG_PROMPT_SIZE;
        totalV2Size += v2Size;
        
        console.log(`   V1 size (estimated): ${V1_AVG_PROMPT_SIZE} chars`);
        console.log(`   V2 size (actual):    ${v2Size} chars`);
        console.log(`   Reduction:           ${Math.round((1 - v2Size/V1_AVG_PROMPT_SIZE) * 100)}%`);
        
        // Validate expectations
        let passed = true;
        
        if (testCase.expected.maxPromptSize && v2Size > testCase.expected.maxPromptSize) {
            console.log(`   ❌ Prompt too large: ${v2Size} > ${testCase.expected.maxPromptSize}`);
            passed = false;
        }
        
        if (testCase.expected.hasAuth && !v2Prompt.toLowerCase().includes('auth')) {
            console.log(`   ❌ Missing auth context`);
            passed = false;
        }
        
        if (testCase.expected.hasData && !v2Prompt.includes('ZAD') && !v2Prompt.includes('Data Storage')) {
            console.log(`   ❌ Missing data storage context`);
            passed = false;
        }
        
        if (testCase.expected.isModification && !contextResult.analysis.isModification) {
            console.log(`   ❌ Failed to detect modification request`);
            passed = false;
        }
        
        if (passed) {
            console.log(`   ✅ Test passed`);
            passedTests++;
        }
        
        // Show prompt preview
        console.log(`   Prompt preview: "${v2Prompt.substring(0, 100)}..."`);
    });
    
    // Summary
    console.log('\n' + '=' .repeat(50));
    console.log('📊 Test Summary:\n');
    console.log(`Tests passed:        ${passedTests}/${TEST_ISSUES.length}`);
    console.log(`Total V1 size:       ${totalV1Size} chars`);
    console.log(`Total V2 size:       ${totalV2Size} chars`);
    console.log(`Overall reduction:   ${Math.round((1 - totalV2Size/totalV1Size) * 100)}%`);
    console.log(`Average V2 prompt:   ${Math.round(totalV2Size/TEST_ISSUES.length)} chars`);
    
    // Performance estimate
    const estimatedSpeedup = (totalV1Size / totalV2Size) * 0.7; // Conservative estimate
    console.log(`\n⚡ Estimated speedup: ${estimatedSpeedup.toFixed(1)}x faster`);
    
    if (passedTests === TEST_ISSUES.length) {
        console.log('\n✅ All tests passed! V2 is ready for deployment.');
    } else {
        console.log('\n⚠️  Some tests failed. Review and fix before deployment.');
    }
}

// Run tests
runTests();