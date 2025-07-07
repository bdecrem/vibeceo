#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';

// Load the messages data
const messagesPath = path.join(process.cwd(), 'data', 'af_daily_messages.json');
const messages = JSON.parse(fs.readFileSync(messagesPath, 'utf8'));

console.log('🎯 AF Daily Messages - Admin Command Reference\n');

// Show count by type
const typeCounts = messages.reduce((acc: any, msg: any) => {
  acc[msg.type] = (acc[msg.type] || 0) + 1;
  return acc;
}, {});

console.log('📊 Message Types:');
Object.entries(typeCounts).forEach(([type, count]) => {
  console.log(`  • ${type}: ${count} items`);
});

console.log('\n🔧 Admin Commands:');
console.log('  • SKIP [id] - Queue specific item for next distribution');
console.log('  • MORE [id] - Preview specific item (no distribution impact)');
console.log('  • SKIP - Random skip (existing functionality)');

console.log('\n📋 Available Items:');
console.log('Items 1-60: Inspirations');
console.log('Items 61-73: Interventions');
console.log('Items 74-75: Interactive commands');
console.log('Items 76-81: More interventions');

console.log('\n🧪 Test Commands:');
console.log('Text your bot:');
console.log('  • "MORE 1" - Preview first inspiration');
console.log('  • "MORE 61" - Preview first intervention');
console.log('  • "SKIP 25" - Queue inspiration #25 for distribution');
console.log('  • "MORE 999" - Test error handling (item not found)');

// Show a few sample items for reference
console.log('\n📝 Sample Items:');
[1, 25, 50, 61, 74].forEach(id => {
  const item = messages.find((m: any) => m.item === id);
  if (item) {
    const preview = item.text.length > 50 ? item.text.substring(0, 50) + '...' : item.text;
    console.log(`  • Item ${id} (${item.type}): "${preview}"`);
  }
});

console.log('\n✅ Your local bot is ready for admin command testing!');
console.log('💡 Remember: Only admin users can use SKIP [id] and MORE [id] commands.'); 