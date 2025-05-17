// Simple test script for pitch channel
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebhookClient } from 'discord.js';

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

// Function to test sending messages directly via webhook
async function testPitchWebhooks() {
  try {
    console.log("Starting pitch webhook test...");
    
    // Test webhooks for each coach
    const coaches = ['donte', 'alex', 'rohan', 'venus', 'eljas', 'kailey'];
    
    for (const coach of coaches) {
      const webhookEnvVar = `PITCH_WEBHOOK_URL_${coach.toUpperCase()}`;
      const webhookUrl = process.env[webhookEnvVar];
      
      if (!webhookUrl) {
        console.error(`Missing webhook URL for ${coach} (${webhookEnvVar})`);
        continue;
      }
      
      console.log(`Testing webhook for ${coach}...`);
      
      try {
        const webhook = new WebhookClient({ url: webhookUrl });
        await webhook.send({
          content: `Test message from ${coach} to pitch channel at ${new Date().toISOString()}`,
          username: coach
        });
        console.log(`Successfully sent message as ${coach}`);
        
        // Cleanup
        webhook.destroy();
      } catch (err) {
        console.error(`Error sending message as ${coach}:`, err);
      }
      
      // Add a delay between messages
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log("Pitch webhook test completed!");
  } catch (error) {
    console.error("Error in test script:", error);
  }
}

// Run the test
testPitchWebhooks().catch(error => {
  console.error("Unhandled error:", error);
}); 