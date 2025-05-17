// Test script to verify generateRandomCoachIrritation function
// Run with: node test-scripts/test-irritation.js

// Import the function from the built file
import { generateRandomCoachIrritation } from '../dist/lib/discord/bot.js';

console.log('Testing random coach irritation generation...');
generateRandomCoachIrritation();
console.log('Test complete - check the story-arcs.json file for updates'); 