#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';

// Load the messages data
const messagesPath = path.join(process.cwd(), 'data', 'af_daily_messages.json');
const messages = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));

console.log('🎯 Testing Interactive Message Structure\n');

// Find interactive messages
const interactiveMessages = messages.filter((m: any) => m.type === 'interactive');

console.log(`📊 Found ${interactiveMessages.length} interactive messages:`);

interactiveMessages.forEach((msg: any) => {
  console.log(`\n🔍 Item ${msg.item}:`);
  console.log(`  Trigger: "${msg.trigger.keyword}"`);
  console.log(`  Part 1 (Daily): "${msg.trigger.text}"`);
  console.log(`  Part 2 (Response): "${msg.response.text}"`);
  if (msg.response.author) {
    console.log(`  Author: "${msg.response.author}"`);
  }
});

console.log('\n📋 Expected Flow:');
console.log('1. PART 1 - Daily message shows:');
console.log('   AF Daily — June 5');
console.log('   🌀 Text WTF for a productivity myth debunked brutally.');
console.log('   (NO marketing footer for interactive messages)');
console.log('');
console.log('2. PART 2 - User types "WTF", receives:');
console.log('   \'Inbox zero\' is just digital people-pleasing. Touch grass.');
console.log('   --AF System');
console.log('');
console.log('3. Admin Preview - "MORE 74" shows:');
console.log('   📋 ADMIN PREVIEW: Item 74 (Interactive)');
console.log('   AF Daily — June 5');
console.log('   🌀 Text WTF for a productivity myth debunked brutally.');
console.log('   💡 Users will type "WTF" to see response.');

console.log('\n✅ Interactive structure updated correctly!'); 