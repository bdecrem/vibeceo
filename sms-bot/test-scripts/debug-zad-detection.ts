#!/usr/bin/env node

import { config } from 'dotenv';

// Load environment variables
const envPath = '/Users/bartdecrem/Documents/Dropbox/coding2025/vibeceo8/sms-bot/.env.local';
config({ path: envPath });

console.log('🔍 ZAD DETECTION DEBUG');
console.log('=======================');

// Test the exact logic from callClaude function
const samplePrompt = `You want to create a simple and fun communication platform specifically designed for you and your friend to exchange messages asynchronously...

---WTAF_METADATA---
EMAIL_NEEDED: false
EMAIL_CONTEXT: none
ZERO_ADMIN_DATA: true
ZERO_ADMIN_CONTEXT: This app allows for simple, playful asynchronous communication between two users using emoji-based identity without real-time interaction.
APP_TYPE: zero_admin_data
---END_METADATA---

REQUEST_TYPE: app`;

console.log('📋 Sample prompt excerpt:');
console.log(samplePrompt.slice(0, 200) + '...');

console.log('\n🔍 ZAD Detection Tests:');

// Test 1: Exact regex from wtaf-processor.ts
const zadMatch1 = samplePrompt.match(/ZERO_ADMIN_DATA:\s*true/i);
console.log(`Test 1 - /ZERO_ADMIN_DATA:\\s*true/i: ${zadMatch1 ? 'MATCH' : 'NO MATCH'}`);
if (zadMatch1) console.log(`  Matched: "${zadMatch1[0]}"`);

// Test 2: Case variations
const zadMatch2 = samplePrompt.match(/zero_admin_data:\s*true/i);
console.log(`Test 2 - Case insensitive: ${zadMatch2 ? 'MATCH' : 'NO MATCH'}`);

// Test 3: Check if the text actually contains it
const containsZAD = samplePrompt.includes('ZERO_ADMIN_DATA: true');
console.log(`Test 3 - Direct string search: ${containsZAD ? 'FOUND' : 'NOT FOUND'}`);

// Test 4: Test ZAD routing logic
console.log('\n🎯 ROUTING LOGIC TEST:');
const zadMatch = samplePrompt.match(/ZERO_ADMIN_DATA:\s*true/i);
if (zadMatch) {
    console.log(`✅ ZAD app detected - would use builder-zad-implementer.json`);
} else {
    console.log(`📱 Standard app detected - would use builder-app.json`);
}

// Test 5: Check the actual format in the prompt
console.log('\n📝 Searching for ZAD patterns in prompt:');
const lines = samplePrompt.split('\n');
for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.toLowerCase().includes('zero_admin_data')) {
        console.log(`Line ${i}: "${line}"`);
    }
} 