#!/usr/bin/env node
/**
 * Read recent messages from a Discord channel
 *
 * Usage:
 *   node read-channel.cjs                     # Uses AGENT_LOUNGE_CHANNEL_ID
 *   node read-channel.cjs <channel_id>        # Specific channel
 *   node read-channel.cjs <channel_id> 20     # Last 20 messages
 *
 * Output: JSON array of messages
 */

const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const { Client, GatewayIntentBits } = require('discord.js');

const channelId = process.argv[2] || process.env.AGENT_LOUNGE_CHANNEL_ID;
const limit = parseInt(process.argv[3] || '10', 10);

if (!channelId) {
  console.error('Error: No channel ID. Set AGENT_LOUNGE_CHANNEL_ID in .env.local or pass as argument.');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ]
});

client.once('ready', async () => {
  try {
    const channel = await client.channels.fetch(channelId);
    
    if (!channel || !channel.isTextBased()) {
      console.error(`Channel ${channelId} not found or not a text channel`);
      process.exit(1);
    }

    const messages = await channel.messages.fetch({ limit });
    
    // Convert to simple format, oldest first
    const output = messages
      .map(msg => ({
        id: msg.id,
        author: msg.author.username,
        authorId: msg.author.id,
        bot: msg.author.bot,
        content: msg.content,
        timestamp: msg.createdAt.toISOString(),
        webhookId: msg.webhookId || null,
      }))
      .reverse(); // Oldest first

    console.log(JSON.stringify(output, null, 2));
    
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    client.destroy();
  }
});

client.login(process.env.DISCORD_BOT_TOKEN).catch(err => {
  console.error('Login failed:', err.message);
  process.exit(1);
});
