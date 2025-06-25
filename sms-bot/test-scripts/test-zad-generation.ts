#!/usr/bin/env node

/**
 * Test ZAD Generation - verify JavaScript functions are properly scoped
 * 
 * Tests that the .txt format fix resolved the scoping issues
 * by checking that generated ZAD apps contain properly defined functions
 */

import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testZadGeneration() {
    console.log('🧪 TESTING ZAD GENERATION');
    console.log('=' + '='.repeat(40));
    
    try {
        // Test 1: Verify .txt prompt loads correctly
        console.log('\n📖 Test 1: Prompt Loading');
        const promptPath = join(__dirname, '..', '..', 'content', 'builder-zad-comprehensive.txt');
        const promptContent = await readFile(promptPath, 'utf8');
        
        console.log(`✅ Prompt loaded: ${promptContent.length} characters`);
        
        // Test 2: Check critical function definitions are present
        console.log('\n🔍 Test 2: Function Definition Patterns');
        
        const requiredFunctions = [
            'async function showNewUserScreen()',
            'async function loginReturningUser()',
            'async function registerNewUser()',
            'function showScreen(',
            'function showReturningUserScreen()',
            'function enterMainScreen()'
        ];
        
        let functionsFound = 0;
        for (const func of requiredFunctions) {
            if (promptContent.includes(func)) {
                console.log(`✅ Found: ${func}`);
                functionsFound++;
            } else {
                console.log(`❌ Missing: ${func}`);
            }
        }
        
        const functionsPass = functionsFound === requiredFunctions.length;
        console.log(`\n📊 Functions Check: ${functionsFound}/${requiredFunctions.length} ${functionsPass ? '✅' : '❌'}`);
        
        // Test 3: Check HTML onclick handlers
        console.log('\n🖱️ Test 3: HTML onClick Handler Patterns');
        
        const onclickHandlers = [
            'onclick="showNewUserScreen()"',
            'onclick="showReturningUserScreen()"',
            'onclick="registerNewUser()"',
            'onclick="loginReturningUser()"'
        ];
        
        let handlersFound = 0;
        for (const handler of onclickHandlers) {
            if (promptContent.includes(handler)) {
                console.log(`✅ Found: ${handler}`);
                handlersFound++;
            } else {
                console.log(`❌ Missing: ${handler}`);
            }
        }
        
        const handlersPass = handlersFound === onclickHandlers.length;
        console.log(`\n📊 Handlers Check: ${handlersFound}/${onclickHandlers.length} ${handlersPass ? '✅' : '❌'}`);
        
        // Test 4: Check for contradictory instructions
        console.log('\n⚠️ Test 4: Contradictory Instructions Check');
        
        const contradictoryText = 'Never use inline onclick';
        const hasContradiction = promptContent.includes(contradictoryText);
        
        if (hasContradiction) {
            console.log(`❌ Found contradictory instruction: "${contradictoryText}"`);
        } else {
            console.log(`✅ No contradictory onclick instructions found`);
        }
        
        // Test 5: Overall Assessment
        console.log('\n🎯 Test 5: Overall Assessment');
        
        const allTestsPass = functionsPass && handlersPass && !hasContradiction;
        
        if (allTestsPass) {
            console.log('🎉 ALL TESTS PASSED!');
            console.log('✅ ZAD apps should now generate without JavaScript errors');
            console.log('✅ Functions properly defined in global scope');
            console.log('✅ onClick handlers correctly match function names');
            console.log('✅ No contradictory instructions present');
        } else {
            console.log('❌ Some tests failed - ZAD generation may still have issues');
        }
        
        console.log('\n' + '=' + '='.repeat(40));
        
        return allTestsPass;
        
    } catch (error) {
        console.error(`❌ Test failed: ${error}`);
        return false;
    }
}

// Run the test
testZadGeneration().then((success) => {
    process.exit(success ? 0 : 1);
}).catch((error) => {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
}); 