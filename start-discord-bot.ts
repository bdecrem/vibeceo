import { Client, GatewayIntentBits } from 'discord.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleMessage, cleanup, initializeScheduledTasks } from './lib/discord/handlers.js';
import { initializeWebhooks } from './lib/discord/webhooks.js';

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions],
});

client.on('ready', async () => {
  console.log(`Logged in as ${client.user?.tag}!`);
  
  // Initialize webhooks
  const channelId = process.env.DISCORD_CHANNEL_ID;
  if (!channelId) {
    throw new Error('DISCORD_CHANNEL_ID not set in environment');
  }
  
  await initializeWebhooks(channelId);
  
  // Initialize scheduled tasks
  initializeScheduledTasks(channelId);
  
  console.log('Bot is ready!');
}); 