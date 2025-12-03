import { buildWebtoysApp } from './webtoys-client.js';
import { formatWebtoysCommand, detectContentType } from './response-parser.js';

console.log('🧪 Testing Webtoys MCP Integration\n');

// Test content type detection
console.log('📝 Testing content type detection:');
const testCases = [
  'build a todo app',
  'make a meme about coding',
  'create a snake game',
  'build a voting app',
  'create a music player'
];

testCases.forEach(test => {
  const type = detectContentType(test);
  const formatted = formatWebtoysCommand(test);
  console.log(`  "${test}"`);
  console.log(`    → Type: ${type}`);
  console.log(`    → Command: ${formatted}\n`);
});

// Test actual API call (if SMS bot is running)
console.log('🚀 Testing API integration:');
console.log('  Attempting to create a simple test app...\n');

try {
  const result = await buildWebtoysApp('simple hello world page', 'test-user-123');

  if (result.success) {
    console.log('✅ Success!');
    console.log(`  App URL: ${result.appUrl}`);
    console.log(`  Type: ${result.appType}`);
    if (result.adminUrl) {
      console.log(`  Admin URL: ${result.adminUrl}`);
    }
  } else {
    console.log('❌ Failed:');
    console.log(`  Error: ${result.error}`);
  }
} catch (error) {
  console.log('❌ Error during test:');
  console.log(`  ${error.message}`);
  console.log('\n💡 Make sure the SMS bot is running on port 3030');
}

console.log('\n✨ Test complete!');