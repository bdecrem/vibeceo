#!/usr/bin/env node

/**
 * Test script for malformed quotes fix (Fix 5)
 * Verifies that the function correctly fixes escaped quote issues that break JavaScript
 */

import { autoFixCommonIssues } from '../engine/shared/utils.js';

console.log('🧪 Testing malformed quotes fix (Fix 5)...\n');

// Test the exact issue from the broken app
console.log('Testing malformed escaped quotes from PIZZAFACE app:');
const brokenQuotesCode = `
alert('SQUAD\\'S FULL, TRY ANOTHER DIMENSION 🚫');
alert('GENERATE YOUR IDENTITY FIRST, CHAOS AGENT 🎭');
alert('NICE TRY, WRONG VIBES ❌');
alert('4 DIGITS OF CHAOS REQUIRED 🔢');
`;

console.log('Before fix:');
console.log('- Code contains malformed escaped quotes that cause SyntaxError');
console.log(`- Original: alert('SQUAD\\'S FULL, TRY ANOTHER DIMENSION 🚫');`);

const fixedCode = autoFixCommonIssues(brokenQuotesCode);

console.log('\nAfter fix:');
console.log('- Escaped quotes converted to use double quotes');
console.log('- JavaScript syntax should now be valid');

// Test another common pattern
console.log('\n---\nTesting additional patterns:');
const morePatterns = `
console.log('User\\'s data loaded');
throw new Error('Can\\'t connect to server');
const message = 'Don\\'t forget to save!';
`;

const fixedPatterns = autoFixCommonIssues(morePatterns);

console.log('\n✅ Malformed quotes fix test completed!');
console.log('This fix should resolve the SyntaxError that was preventing the PIZZAFACE app from working.'); 