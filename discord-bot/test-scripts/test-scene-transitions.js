// Test script to simulate scene transitions and trigger system announcements

import { Client, GatewayIntentBits, TextChannel } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '..', '.env.local') });

// Directly import only what we need
import { client as botClient } from '../lib/discord/bot.js';
import { postSystemAnnouncement } from '../lib/discord/systemAnnouncement.js';

// Set up a test client
const testClient = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Main function
async function testSceneTransitions() {
  console.log("=== Testing Scene Transitions with System Announcements ===");
  
  try {
    // Login to Discord
    console.log("Logging in to Discord...");
    await testClient.login(process.env.DISCORD_BOT_TOKEN);
    console.log(`Logged in as ${testClient.user.tag}`);
    
    // Get the general channel
    const GENERAL_CHANNEL_ID = '1354474492629618831';
    console.log(`Using channel ID: ${GENERAL_CHANNEL_ID}`);
    const channel = await testClient.channels.fetch(GENERAL_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) {
      throw new Error(`Could not find or access channel ${GENERAL_CHANNEL_ID}`);
    }
    
    // Directly test system announcements for scenes 5, 11, 17, 23
    const testScenes = [5, 11, 17, 23];
    
    for (const sceneIndex of testScenes) {
      console.log(`\nPosting system announcement for scene ${sceneIndex}...`);
      
      try {
        await postSystemAnnouncement(testClient, sceneIndex);
        console.log(`Successfully posted system announcement for scene ${sceneIndex}`);
      } catch (error) {
        console.error(`Error posting system announcement for scene ${sceneIndex}:`, error);
      }
      
      // Wait between announcements
      console.log(`Waiting 3 seconds before the next announcement...`);
      await new Promise(resolve => setTimeout(resolve, 3000));
    }
    
    console.log("\nAll test announcements completed");
  } catch (error) {
    console.error("Error during test:", error);
  } finally {
    // Clean up
    console.log("Logging out...");
    testClient.destroy();
    console.log("Test completed");
  }
}

// Run the test
testSceneTransitions(); 