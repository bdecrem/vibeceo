#!/usr/bin/env node
// amber-daemon/scripts/read-discord.js
// Read Discord messages using Amber's token

import { Client, GatewayIntentBits } from 'discord.js';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env from sms-bot/.env.local
const envPath = join(__dirname, '..', '..', 'sms-bot', '.env.local');
if (existsSync(envPath)) {
  const content = readFileSync(envPath, 'utf-8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [key, ...rest] = trimmed.split('=');
      process.env[key] = rest.join('=');
    }
  }
}

const token = process.env.DISCORD_TOKEN_AMBER;
const channelId = process.argv[2] || '1441080550415929406';
const limit = parseInt(process.argv[3] || '15', 10);

if (!token) {
  console.error('Error: DISCORD_TOKEN_AMBER not found');
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
      console.error(`Channel ${channelId} not found`);
      client.destroy();
      process.exit(1);
    }

    const messages = await channel.messages.fetch({ limit });
    const output = messages.reverse().map(m => {
      const time = m.createdAt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      return `${m.author.username} (${time}): ${m.content.substring(0, 300)}`;
    }).join('\n');

    console.log(output || '(no messages)');
  } catch (err) {
    console.error('Error:', err.message);
  }
  client.destroy();
});

client.login(token).catch(err => {
  console.error('Login failed:', err.message);
  process.exit(1);
});
