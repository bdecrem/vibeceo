// Test script for system announcements

import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';
import { postSystemAnnouncement } from '../lib/discord/systemAnnouncement.js';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env.local') });

// Debug: Show the channel ID
console.log("GENERAL_CHANNEL_ID from env:", process.env.GENERAL_CHANNEL_ID);
console.log("Default fallback ID:", '1354474492629618831');

// Set up Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Main function
async function testSystemAnnouncement() {
  console.log("=== Testing System Announcement ===");
  
  try {
    // Login to Discord
    console.log("Logging in to Discord...");
    await client.login(process.env.DISCORD_BOT_TOKEN);
    console.log(`Logged in as ${client.user.tag}`);
    
    // Skip channel listing as it's causing issues
    console.log("\nNOTE: Skipping channel listing to avoid API errors");
    
    // Simulate posting system announcements at different scenes
    const testScenes = [5, 11, 17, 23]; // After scenes 6, 12, 18, 24
    
    for (const sceneIndex of testScenes) {
      console.log(`\nPosting system announcement after scene ${sceneIndex}...`);
      const result = await postSystemAnnouncement(client, sceneIndex);
      console.log(`System announcement for scene ${sceneIndex} completed. Success: ${result}`);
      
      // Wait a moment before the next announcement
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log("\nAll test announcements completed");
  } catch (error) {
    console.error("Error during test:", error);
  } finally {
    // Clean up
    console.log("Logging out...");
    client.destroy();
    console.log("Test completed");
  }
}

// Run the test
testSystemAnnouncement(); 