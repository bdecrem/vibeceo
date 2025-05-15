// Test script for scheduler's runServiceWithMessages function
import { Client, Events, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { runServiceWithMessages, initializeScheduler } from './dist/lib/discord/scheduler.js';
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

console.log("Starting scheduler message test...");

// When the client is ready, run the test
client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  try {
    // Initialize the scheduler
    console.log("Initializing scheduler...");
    initializeScheduler(client);
    
    // The ID for #general channel
    const channelId = '1354474492629618831';
    
    // Test statusreport event
    console.log("Testing statusreport event through scheduler...");
    await runServiceWithMessages(channelId, 'statusreport', client);
    
    // Delay before testing unspokenrule event
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    // Test unspokenrule event
    console.log("Testing unspokenrule event through scheduler...");
    await runServiceWithMessages(channelId, 'unspokenrule', client);
    
    console.log("Test completed!");
    client.destroy();
    process.exit(0);
  } catch (error) {
    console.error("Error during test:", error);
    client.destroy();
    process.exit(1);
  }
});

// Login to Discord with the bot token
console.log("Logging into Discord...");
client.login(process.env.DISCORD_BOT_TOKEN); 