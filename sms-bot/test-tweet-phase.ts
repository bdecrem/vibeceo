/**
 * Run the ACTUAL tweet phase locally - same code as scheduler
 * Usage: npx tsx test-tweet-phase.ts
 */
import { config } from 'dotenv';
config({ path: '.env.local' });

import { triggerTweet } from './agents/amber-social/index.js';

console.log('Running tweet phase locally...\n');
triggerTweet('local-test').then(() => {
  console.log('\nDone.');
  process.exit(0);
}).catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
