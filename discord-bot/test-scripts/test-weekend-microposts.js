#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🧪 Testing Weekend MicroPosts System...\n');

// Test 1: Check if weekend-micro-posts.json exists and is valid
console.log('1. Testing JSON file loading...');
try {
  const jsonPath = join(__dirname, '..', 'data', 'weekend-micro-posts.json');
  console.log(`   Looking for: ${jsonPath}`);
  
  if (!fs.existsSync(jsonPath)) {
    console.log('   ❌ weekend-micro-posts.json not found');
    process.exit(1);
  }
  
  const data = fs.readFileSync(jsonPath, 'utf8');
  const prompts = JSON.parse(data);
  
  console.log(`   ✅ JSON loaded successfully`);
  console.log(`   📊 Found ${prompts.length} prompt(s)`);
  
  if (prompts.length > 0) {
    const prompt = prompts[0];
    console.log(`   📝 First prompt ID: ${prompt.id}`);
    console.log(`   🎯 Schedule command: ${prompt.scheduleCommand}`);
    console.log(`   🤖 Model: ${prompt.modelName}`);
    console.log(`   🎨 Settings count: ${prompt.settings?.length || 0}`);
    console.log(`   😊 Emotional tones: ${prompt.emotionalTones?.length || 0}`);
    console.log(`   💄 Product details: ${prompt.microDetails?.length || 0}`);
  }
} catch (error) {
  console.log(`   ❌ Error loading JSON: ${error.message}`);
  process.exit(1);
}

// Test 2: Check if TypeScript compiled correctly
console.log('\n2. Testing compiled TypeScript...');
try {
  const tsPath = join(__dirname, '..', 'dist', 'lib', 'discord', 'weekendMicroPosts.js');
  console.log(`   Looking for: ${tsPath}`);
  
  if (!fs.existsSync(tsPath)) {
    console.log('   ❌ weekendMicroPosts.js not found in dist/');
    console.log('   💡 Try running: npm run build');
    process.exit(1);
  }
  
  console.log('   ✅ Compiled TypeScript file exists');
} catch (error) {
  console.log(`   ❌ Error checking compiled file: ${error.message}`);
}

// Test 3: Try importing the module
console.log('\n3. Testing module import...');
try {
  const { alexTipsyDispatch, initializeWeekendMicroEventMessages } = await import('../dist/lib/discord/weekendMicroPosts.js');
  
  console.log('   ✅ Module imported successfully');
  console.log(`   🎯 alexTipsyDispatch function: ${typeof alexTipsyDispatch}`);
  console.log(`   🎯 initializeWeekendMicroEventMessages function: ${typeof initializeWeekendMicroEventMessages}`);
} catch (error) {
  console.log(`   ❌ Error importing module: ${error.message}`);
  console.log('   💡 This might be due to missing environment variables or dependencies');
}

console.log('\n🎉 Weekend MicroPosts system test complete!');
console.log('\n📋 Next steps:');
console.log('   1. Make sure TOGETHER_API_KEY is set in .env.local');
console.log('   2. Test with: npm run start');
console.log('   3. Check schedule.txt has "alextipsy" at 00:00'); 