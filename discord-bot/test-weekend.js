// Test script for weekend mode functionality
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { isWeekend } from './dist/lib/discord/locationTime.js';
import { triggerWeekendVibesChat } from './dist/lib/discord/weekendvibes.js';

// Mock Discord client
const mockClient = {
  channels: {
    fetch: async (id) => ({
      send: async (msg) => console.log(`Channel ${id} would receive: ${msg}`),
      id
    })
  }
};

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
const envPath = path.resolve(__dirname, '../.env.local');
console.log('Loading environment from:', envPath);
dotenv.config({ path: envPath });

// Test environment setup
console.log('===== WEEKEND MODE TEST =====');
console.log(`Current time: ${new Date().toString()}`);
console.log(`Is weekend: ${isWeekend()}`);
console.log(`FAST_SCHEDULE: ${process.env.FAST_SCHEDULE || 'not set (default: 60 min)'}`);

// Test force weekend mode for development
process.env.FORCE_WEEKEND = 'true';
console.log('Forcing weekend mode: true');

// Check if the channel ID is provided
const channelId = process.env.DISCORD_CHANNEL_ID || 'test-channel-id';
console.log(`Using channel ID: ${channelId}`);

// Manually set up webhook test mode
const setupWebhookTestMode = () => {
  console.log('Setting up webhook test mode...');
  const sendAsCharacter = (channelId, characterId, message) => {
    console.log(`\n[CHARACTER: ${characterId}] would send to channel ${channelId}:`);
    console.log('---');
    console.log(message);
    console.log('---\n');
    return Promise.resolve();
  };
  
  // Explicitly add this function to the global scope for testing
  global.testWebhook = sendAsCharacter;
  
  // Mock the webhooks module
  import('./dist/lib/discord/webhooks.js').then(webhooksModule => {
    webhooksModule.sendAsCharacter = sendAsCharacter;
    console.log('Webhook test mode enabled');
  }).catch(err => {
    console.error('Error setting up webhook test mode:', err);
  });
};

// Run the test
async function runTest() {
  try {
    // Set up webhook test mode
    setupWebhookTestMode();
    
    // Run the weekend vibes test
    console.log('\n===== TESTING WEEKEND VIBES =====\n');
    setTimeout(async () => {
      try {
        await triggerWeekendVibesChat(channelId, mockClient);
        console.log('\n===== TEST COMPLETED =====\n');
      } catch (err) {
        console.error('Error in weekend vibes test:', err);
      }
    }, 1000); // Slight delay to ensure webhook setup is complete
  } catch (err) {
    console.error('Test error:', err);
  }
}

// Start the test
runTest(); 