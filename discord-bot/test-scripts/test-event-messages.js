// Simple script to test event messages
import { Client, Events, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { EVENT_MESSAGES, customEventMessageCache } from './dist/lib/discord/eventMessages.js';
import { initializeCustomEventMessages } from './dist/lib/discord/argumentGenerator.js';
import { initializeMicroEventMessages } from './dist/lib/discord/microPosts.js';

// Set up file paths and load .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(process.cwd(), ".env.local");
dotenv.config({ path: envPath });

console.log("=== EVENT_MESSAGES ===");
console.log(EVENT_MESSAGES);

console.log("\n=== Custom Event Message Cache (before initialization) ===");
console.log(customEventMessageCache);

console.log("\n=== Running initializeCustomEventMessages() ===");
initializeCustomEventMessages();

console.log("\n=== Running initializeMicroEventMessages() ===");
initializeMicroEventMessages();

console.log("\n=== Custom Event Message Cache (after initialization) ===");
console.log(customEventMessageCache);

// Check micro-post related entries
console.log("\n=== Micro-Post Entries in Cache ===");
const microPostCommands = ['coachquotes', 'crowdfaves', 'microclass', 'upcomingevent'];
for (const cmd of microPostCommands) {
  console.log(`${cmd}:`, customEventMessageCache[cmd] || 'Not found');
}

console.log("\nTest completed!");
process.exit(0); 