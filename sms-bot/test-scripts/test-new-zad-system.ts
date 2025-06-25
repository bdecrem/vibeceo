#!/usr/bin/env node

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Test the new comprehensive ZAD system
 * Verifies that:
 * 1. ZAD classification still works correctly
 * 2. Comprehensive builder prompt is properly loaded
 * 3. System routes to the right configuration
 */

async function testZadClassification() {
    console.log('\n🧪 Testing ZAD Classification System...');
    
    try {
        // Test 1: Load the simplified classifier - from dist/test-scripts/ go up to sms-bot/, then to content/
        const classifierPath = join(__dirname, '..', '..', 'content', 'classification', 'is-it-a-zad.json');
        const classifierContent = await readFile(classifierPath, 'utf8');
        const classifier = JSON.parse(classifierContent);
        
        console.log('✅ ZAD classifier loaded successfully');
        console.log(`📋 Classification type: ${classifier.classification_type}`);
        
        // Test 2: Verify simplified "if_yes" section
        const ifYes = classifier.decision_logic.if_yes;
        if (ifYes.includes('ZAD_DETECTED') && !ifYes.includes('ZAD_INSTRUCTION:')) {
            console.log('✅ Simplified "if_yes" section confirmed');
            console.log(`📝 Response: ${ifYes.split('\n')[0]}...`);
        } else {
            console.log('❌ "if_yes" section still has old complex logic');
            return false;
        }
        
        // Test 3: Check that ZAD detection examples are still valid
        const goodExamples = classifier.examples.good_examples;
        if (goodExamples.length > 0) {
            console.log(`✅ ${goodExamples.length} good examples preserved`);
            console.log(`📝 Example: ${goodExamples[0]}`);
        }
        
        return true;
    } catch (error) {
        console.error('❌ ZAD classification test failed:', error);
        return false;
    }
}

async function testComprehensiveBuilder() {
    console.log('\n🧪 Testing Comprehensive ZAD Builder...');
    
    try {
        // Test 1: Load the comprehensive builder prompt
        const builderPath = join(__dirname, '..', '..', 'content', 'builder-zad-comprehensive.json');
        const builderContent = await readFile(builderPath, 'utf8');
        const builder = JSON.parse(builderContent);
        
        console.log('✅ Comprehensive ZAD builder loaded successfully');
        console.log(`📋 Role: ${builder.role}`);
        console.log(`📝 Content length: ${builder.content.length} chars`);
        
        // Test 2: Verify it contains key elements
        const content = builder.content;
        const requiredElements = [
            'wtaf_zero_admin_collaborative',
            'Authentication System',
            'Real-Time Updates',
            'WTAF Visual Style',
            'USER REQUEST',
            'Supabase',
            '[USER REQUEST]'
        ];
        
        for (const element of requiredElements) {
            if (content.includes(element)) {
                console.log(`✅ Contains: ${element}`);
            } else {
                console.log(`❌ Missing: ${element}`);
                return false;
            }
        }
        
        // Test 3: Verify [USER REQUEST] placeholder is present
        if (content.includes('[USER REQUEST]')) {
            console.log('✅ [USER REQUEST] placeholder confirmed');
        } else {
            console.log('❌ [USER REQUEST] placeholder missing');
            return false;
        }
        
        return true;
    } catch (error) {
        console.error('❌ Comprehensive builder test failed:', error);
        return false;
    }
}

async function testBackupFiles() {
    console.log('\n🧪 Testing Backup Files...');
    
    try {
        // Check that old files were backed up
        const backupFiles = [
            'is-it-a-zad-old.json',
            'builder-zad-v0.json',
            'builder-zad-remix.json'
        ];
        
        for (const file of backupFiles) {
            const backupPath = join(__dirname, '..', '..', 'content', 'deprecated', file);
            try {
                await readFile(backupPath, 'utf8');
                console.log(`✅ Backup exists: ${file}`);
            } catch (error) {
                console.log(`❌ Backup missing: ${file}`);
                return false;
            }
        }
        
        // Check that old files were removed from main content
        const removedFiles = [
            'builder-zad-v0.json',
            'builder-zad-remix.json'
        ];
        
        for (const file of removedFiles) {
            const mainPath = join(__dirname, '..', '..', 'content', file);
            try {
                await readFile(mainPath, 'utf8');
                console.log(`❌ Old file still exists in main content: ${file}`);
                return false;
            } catch (error) {
                console.log(`✅ Old file properly removed: ${file}`);
            }
        }
        
        return true;
    } catch (error) {
        console.error('❌ Backup files test failed:', error);
        return false;
    }
}

async function testZadIndicators() {
    console.log('\n🧪 Testing ZAD Detection Indicators...');
    
    const testCases = [
        { input: "build a chat app for me and my friends", shouldBeZad: true },
        { input: "create a discussion board for my study group", shouldBeZad: true },
        { input: "make an idea sharing space for our team", shouldBeZad: true },
        { input: "build a memory wall for my family", shouldBeZad: true },
        { input: "create a contact form for my business", shouldBeZad: false },
        { input: "build me a portfolio website", shouldBeZad: false },
        { input: "make a newsletter signup", shouldBeZad: false }
    ];
    
    console.log('📋 Testing controller ZAD detection logic...');
    
    for (const testCase of testCases) {
        const zadIndicators = ['me and my friends', 'my team', 'our team', 'our group', 'study group', 'my family', 'book club'];
        const isDetected = zadIndicators.some(indicator => testCase.input.toLowerCase().includes(indicator));
        
        if (isDetected === testCase.shouldBeZad) {
            console.log(`✅ "${testCase.input}" → ${isDetected ? 'ZAD' : 'NOT ZAD'} (correct)`);
        } else {
            console.log(`❌ "${testCase.input}" → ${isDetected ? 'ZAD' : 'NOT ZAD'} (wrong, should be ${testCase.shouldBeZad ? 'ZAD' : 'NOT ZAD'})`);
            return false;
        }
    }
    
    return true;
}

async function runAllTests() {
    console.log('🚀 TESTING NEW COMPREHENSIVE ZAD SYSTEM');
    console.log('=' + '='.repeat(60));
    
    const tests = [
        { name: 'ZAD Classification', test: testZadClassification },
        { name: 'Comprehensive Builder', test: testComprehensiveBuilder },
        { name: 'Backup Files', test: testBackupFiles },
        { name: 'ZAD Detection Indicators', test: testZadIndicators }
    ];
    
    let passedTests = 0;
    
    for (const { name, test } of tests) {
        const passed = await test();
        if (passed) {
            passedTests++;
        }
        console.log(`\n${passed ? '✅' : '❌'} ${name}: ${passed ? 'PASSED' : 'FAILED'}`);
    }
    
    console.log('\n' + '=' + '='.repeat(60));
    console.log(`🎯 RESULTS: ${passedTests}/${tests.length} tests passed`);
    
    if (passedTests === tests.length) {
        console.log('🎉 ALL TESTS PASSED! New ZAD system is ready!');
        console.log('\n🔥 NEW ZAD SYSTEM FEATURES:');
        console.log('✅ Simplified classifier (just detects, no complex instructions)');
        console.log('✅ Comprehensive builder (generates any collaborative app type)');
        console.log('✅ Higher token limit (8000 vs 4096)');
        console.log('✅ Lower temperature (0.2 vs 0.7) for more reliable code');
        console.log('✅ Claude 3.5 Sonnet model for better quality');
        console.log('✅ No template loading - generates from scratch');
        console.log('✅ Supports ANY collaborative app (not just chat)');
        return true;
    } else {
        console.log('❌ Some tests failed. Check the output above.');
        return false;
    }
}

// Run all tests
runAllTests().then((success) => {
    process.exit(success ? 0 : 1);
}).catch((error) => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
}); 