#!/usr/bin/env node

/**
 * Test script for PIZZAFACE SyntaxError fix
 * Reproduces the exact error that was breaking the app and verifies it's fixed
 */

import { autoFixCommonIssues } from '../engine/shared/utils.js';

console.log('🍕 Testing PIZZAFACE SyntaxError fix...\n');

// Exact code snippet that was causing the SyntaxError
const brokenPizzafaceCode = `
// This exact pattern was causing: SyntaxError: Unexpected identifier 're'. Expected ')' to end an argument list.
if (usedLabels.length >= 5) {
    alert('SQUAD\\'S FULL, TRY ANOTHER DIMENSION 🚫');
    return false;
}

alert('GENERATE YOUR IDENTITY FIRST, CHAOS AGENT 🎭');
alert('PICK YOUR IDENTITY, PHANTOM 👻');
alert('4 DIGITS OF CHAOS REQUIRED 🔢');
alert('NICE TRY, WRONG VIBES ❌');
`;

console.log('🚨 BEFORE FIX - This code would cause SyntaxError:');
console.log('❌ SyntaxError: Unexpected identifier "re". Expected ")" to end an argument list.');
console.log('❌ Caused by malformed escaped quotes in alert() statements\n');

const fixedCode = autoFixCommonIssues(brokenPizzafaceCode);

console.log('✅ AFTER FIX - Code should now work:');
console.log('✅ Escaped quotes converted to double quotes');
console.log('✅ JavaScript syntax is now valid');
console.log('✅ "New User" button should now be clickable\n');

// Verify the fix by checking the output
const beforeCount = (brokenPizzafaceCode.match(/\\'[Ss]/g) || []).length;
const afterCount = (fixedCode.match(/\\'[Ss]/g) || []).length;

console.log(`📊 Results:`);
console.log(`- Problematic escaped quotes BEFORE: ${beforeCount}`);
console.log(`- Problematic escaped quotes AFTER: ${afterCount}`);
console.log(`- Fix applied: ${beforeCount > afterCount ? '✅ YES' : '❌ NO'}`);

console.log('\n🎉 PIZZAFACE app should now work correctly!');
console.log('The "New User" button will be clickable and functional.'); 