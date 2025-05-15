// Test webhook initialization
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { initializeWebhooks, sendAsCharacter, cleanupWebhooks } from './dist/lib/discord/webhooks.js';
import { validateConfig, getWebhookUrls } from './dist/lib/discord/config.js';

// Get the directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Try multiple paths for .env.local since we're not sure about exact directory structure
const envPaths = [
  path.resolve(__dirname, '../.env.local'),
  path.resolve(__dirname, '.env.local'),
  '.env.local'
];

let envLoaded = false;
for (const envPath of envPaths) {
  console.log("Trying to load environment from:", envPath);
  const result = dotenv.config({ path: envPath });
  if (!result.error) {
    console.log("Successfully loaded environment from:", envPath);
    envLoaded = true;
    break;
  }
}

if (!envLoaded) {
  console.error("Failed to load .env.local from any of the attempted paths");
  console.error("Please check if .env.local exists and contains the required variables");
}

// Print all available environment variables for debugging (redacted)
console.log("Available environment variables:");
Object.keys(process.env).forEach(key => {
  if (key.includes('WEBHOOK') || key.includes('DISCORD')) {
    console.log(`${key}: ${key.includes('TOKEN') ? '[REDACTED]' : '[PRESENT]'}`);
  }
});

async function testWebhookInitialization() {
  try {
    // Try to get webhook URLs directly from getWebhookUrls first
    const webhookUrls = getWebhookUrls();
    console.log("Available webhook keys:", Object.keys(webhookUrls));
    
    if (Object.keys(webhookUrls).length === 0) {
      console.error("ERROR: No webhook URLs found in environment variables");
      console.error("Please check that the environment variables like GENERAL_WEBHOOK_URL_DONTE are set");
      return;
    }
    
    // Test channel ID for general chat
    const generalChannelId = '1354474492629618831';
    
    // Clean up any existing webhooks first
    cleanupWebhooks(generalChannelId);
    
    // Initialize webhooks
    console.log("Initializing webhooks for general channel...");
    await initializeWebhooks(generalChannelId, webhookUrls);
    
    // Test sending a message as each character
    const characters = ['donte', 'alex', 'rohan', 'venus', 'eljas', 'kailey'];
    for (const character of characters) {
      try {
        console.log(`Testing message send as ${character}...`);
        await sendAsCharacter(
          generalChannelId, 
          character, 
          `This is a test message from ${character} [${new Date().toISOString()}]`
        );
        console.log(`Successfully sent message as ${character}`);
      } catch (error) {
        console.error(`Failed to send message as ${character}:`, error);
      }
    }
    
    // Clean up webhooks
    cleanupWebhooks(generalChannelId);
    console.log("Test completed");
  } catch (error) {
    console.error("Test failed:", error);
  }
}

// Run the test
testWebhookInitialization().catch(console.error); 