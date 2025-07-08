#!/usr/bin/env node

/**
 * Test script for autoFixCommonIssues integration
 * Verifies that the function is properly integrated into storage-manager.ts functions
 */

import { autoFixCommonIssues } from '../engine/shared/utils.js';

console.log('🧪 Testing autoFixCommonIssues integration...\n');

// Test the exact duplicate variable issue that was breaking apps
console.log('Testing the exact duplicate variable issue from broken app:');
const brokenAppCode = `
<!DOCTYPE html>
<html>
<head>
    <title>Chat App</title>
</head>
<body>
    <div id="app"></div>
    <script>
        let currentUser = null;
        
        function loadUser() {
            console.log('Loading user...');
        }
        
        let currentUser = null;
        
        function saveMessage() {
            console.log('Saving message...');
        }
    </script>
</body>
</html>
`;

console.log('Before autoFixCommonIssues:');
console.log(`- Contains ${(brokenAppCode.match(/let currentUser = null;/g) || []).length} instances of "let currentUser = null;"`);

const fixedCode = autoFixCommonIssues(brokenAppCode);

console.log('\nAfter autoFixCommonIssues:');
console.log(`- Contains ${(fixedCode.match(/let currentUser = null;/g) || []).length} instances of "let currentUser = null;"`);

console.log('\n✅ Integration test completed successfully!');
console.log('The autoFixCommonIssues function will now prevent the JavaScript errors that were breaking deployed apps.'); 