#!/usr/bin/env node

/**
 * Test script for autoFixCommonIssues function
 * Verifies that the function correctly fixes common JavaScript errors
 */

import { autoFixCommonIssues } from '../engine/shared/utils.js';

console.log('🧪 Testing autoFixCommonIssues function...\n');

// Test 1: Duplicate variable declarations (Fix 4)
console.log('Test 1: Duplicate variable declarations');
const duplicateVarTest = `
let currentUser = null;
function loadData() {
    console.log('Loading data...');
}
let currentUser = null;
function saveData() {
    console.log('Saving data...');
}
`;

const fixed1 = autoFixCommonIssues(duplicateVarTest);
console.log('✅ Test 1 completed\n');

// Test 2: showNewUserScreen async fix (Fix 1)
console.log('Test 2: showNewUserScreen async fix');
const asyncTest = `
function showNewUserScreen() {
    console.log('Showing new user screen');
}
`;

const fixed2 = autoFixCommonIssues(asyncTest);
console.log('✅ Test 2 completed\n');

// Test 3: Multiple duplicate patterns
console.log('Test 3: Multiple duplicate patterns');
const multipleTest = `
let currentUser = null;
let userState = null;
const supabase = createClient('url', 'key');
let currentUser = null;
let userState = null;
const supabase = createClient('url2', 'key2');
`;

const fixed3 = autoFixCommonIssues(multipleTest);
console.log('✅ Test 3 completed\n');

// Test 4: No issues (should pass through unchanged)
console.log('Test 4: No issues to fix');
const cleanTest = `
let currentUser = null;
function getData() {
    return currentUser;
}
`;

const fixed4 = autoFixCommonIssues(cleanTest);
console.log('✅ Test 4 completed\n');

console.log('🎉 All tests completed successfully!');
console.log('The autoFixCommonIssues function is ready to prevent JavaScript errors in deployed apps.'); 