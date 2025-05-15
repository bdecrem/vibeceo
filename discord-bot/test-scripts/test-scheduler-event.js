// Test script for running an event through the scheduler
import { Client, Events, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { runServiceWithMessages } from './dist/lib/discord/scheduler.js';
import { initializeCustomEventMessages } from './dist/lib/discord/argumentGenerator.js';

// Set up file paths and load .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(process.cwd(), ".env.local");
dotenv.config({ path: envPath });

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

console.log("Starting scheduler test...");

// When the client is ready, run the test
client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  try {
    // Initialize custom event messages before testing
    console.log("Initializing custom event messages...");
    initializeCustomEventMessages();
    
    // The ID for #general channel
    const channelId = '1354474492629618831';
    
    // Test statusreport event
    console.log("Testing statusreport event...");
    await runServiceWithMessages(channelId, 'statusreport', client);
    
    // Delay before testing unspokenrule event
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Test unspokenrule event
    console.log("Testing unspokenrule event...");
    await runServiceWithMessages(channelId, 'unspokenrule', client);
    
    console.log("Tests completed. Shutting down...");
    client.destroy();
    process.exit(0);
  } catch (error) {
    console.error("Error during test:", error);
    client.destroy();
    process.exit(1);
  }
});

// Login to Discord with the bot token
client.login(process.env.DISCORD_BOT_TOKEN); 