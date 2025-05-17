// Test script to debug pitch channel webhooks
import { initializeWebhooks, sendAsCharacter, cleanupWebhooks } from '../lib/discord/webhooks.js';
import { getWebhookUrls } from '../lib/discord/config.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Set up file paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
console.log("Loading environment from:", envPath);
dotenv.config({ path: envPath });

// Get the pitch channel ID from environment variables
const PITCH_CHANNEL_ID = process.env.PITCH_CHANNEL_ID || '';
console.log(`Pitch Channel ID: ${PITCH_CHANNEL_ID}`);

if (!PITCH_CHANNEL_ID) {
  console.error("PITCH_CHANNEL_ID is not set in environment variables");
  process.exit(1);
}

async function testPitchWebhooks() {
  try {
    // Get all webhook URLs
    const allWebhookUrls = getWebhookUrls();
    console.log("All available webhook URLs:", Object.keys(allWebhookUrls));
    
    // Filter to only pitch webhooks
    const pitchWebhookUrls = {};
    Object.entries(allWebhookUrls).forEach(([key, url]) => {
      if (key.startsWith('pitch_')) {
        pitchWebhookUrls[key] = url;
      }
    });
    
    console.log("Pitch webhook URLs:", Object.keys(pitchWebhookUrls));
    
    if (Object.keys(pitchWebhookUrls).length === 0) {
      console.error("No pitch webhook URLs found. Make sure PITCH_WEBHOOK_URL_* variables are set in .env.local");
      process.exit(1);
    }
    
    // Initialize webhooks for pitch channel
    console.log("Initializing webhooks for pitch channel...");
    await initializeWebhooks(PITCH_CHANNEL_ID, pitchWebhookUrls);
    
    // Send test messages from all coaches to the pitch channel
    for (const key of Object.keys(pitchWebhookUrls)) {
      const coach = key.replace('pitch_', '');
      const message = `This is a test message from ${coach} to the pitch channel at ${new Date().toISOString()}`;
      
      console.log(`Sending test message as ${coach}...`);
      await sendAsCharacter(PITCH_CHANNEL_ID, coach, message);
      console.log(`Successfully sent message as ${coach}`);
      
      // Add a delay between messages
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log("All test messages sent successfully!");
  } catch (error) {
    console.error("Error in test script:", error);
  } finally {
    // Clean up webhooks
    cleanupWebhooks(PITCH_CHANNEL_ID);
  }
}

// Run the test
testPitchWebhooks().catch(error => {
  console.error("Unhandled error:", error);
}); 