// Test script to verify channel routing for different event types
import { Client, Events, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { runServiceWithMessages, initializeScheduler } from '../lib/discord/scheduler.js';
import { initializeWebhooks } from '../lib/discord/webhooks.js';
import { validateConfig } from '../lib/discord/config.js';

// Set up file paths and load .env
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(process.cwd(), ".env.local");
dotenv.config({ path: envPath });

console.log("Starting channel routing test...");

// Define the channel IDs
const GENERAL_CHANNEL_ID = '1354474492629618831';
const THELOUNGE_CHANNEL_ID = process.env.THELOUNGE_CHANNEL_ID;

console.log(`General channel ID: ${GENERAL_CHANNEL_ID}`);
console.log(`Lounge channel ID: ${THELOUNGE_CHANNEL_ID}`);

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Event handler when the bot is ready
client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  
  try {
    // Initialize Discord-specific components
    const { webhookUrls } = validateConfig();
    
    // Filter webhook URLs for each channel
    const generalWebhookUrls = {};
    const loungeWebhookUrls = {};
    
    // Organize webhooks by channel prefix
    Object.entries(webhookUrls).forEach(([key, url]) => {
      if (key.startsWith('general_')) {
        generalWebhookUrls[key.replace('general_', '')] = url;
      } else if (key.startsWith('lounge_')) {
        loungeWebhookUrls[key.replace('lounge_', '')] = url;
      }
    });
    
    // Initialize webhooks for both channels
    console.log('Starting webhook initialization...');
    try {
      // Initialize for general channel
      await initializeWebhooks(GENERAL_CHANNEL_ID, generalWebhookUrls);
      console.log('Webhooks initialized for general channel');
      
      // Initialize for lounge channel
      if (THELOUNGE_CHANNEL_ID) {
        await initializeWebhooks(THELOUNGE_CHANNEL_ID, loungeWebhookUrls);
        console.log('Webhooks initialized for lounge channel');
      } else {
        console.error('THELOUNGE_CHANNEL_ID not set, skipping webhook initialization for lounge');
      }
      
      // Initialize scheduler
      initializeScheduler(client);
      console.log('Scheduler initialized');
      
      console.log('\nTesting channel routing:');
      
      // Test a staff meeting service (should go to #general)
      console.log('\n1. Testing staff meeting service:');
      await runServiceWithMessages('dummy-channel-id', 'simplestaffmeeting');
      
      // Test watercooler (should go to #thelounge)
      console.log('\n2. Testing watercooler:');
      await runServiceWithMessages('dummy-channel-id', 'watercooler');
      
      // Test microclass (should go to #thelounge)
      console.log('\n3. Testing microclass:');
      await runServiceWithMessages('dummy-channel-id', 'microclass');
      
      // Finish up and exit
      console.log('\nChannel routing test complete.');
      setTimeout(() => {
        client.destroy();
        process.exit(0);
      }, 2000);
      
    } catch (error) {
      console.error('Error during test:', error);
      client.destroy();
      process.exit(1);
    }
  } catch (error) {
    console.error('Error during initialization:', error);
    client.destroy();
    process.exit(1);
  }
});

// Start bot
try {
  const { token } = validateConfig();
  client.login(token);
} catch (error) {
  console.error('Failed to start test:', error);
  process.exit(1);
} 