#!/usr/bin/env node
// pixelpit/designer-daemon/discord-bot.js - Dot's Discord surface
// Listens for mentions, forwards to daemon via socket

import { Client, GatewayIntentBits, Partials } from 'discord.js';
import { connect } from 'net';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env
const envPath = join(__dirname, '../..', 'sms-bot', '.env.local');
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

const SOCKET_PATH = join(homedir(), '.dot', 'dot.sock');
const BOT_TOKEN = process.env.DISCORD_TOKEN_DOT;

if (!BOT_TOKEN) {
  console.error('❌ No Discord token. Set DISCORD_TOKEN_DOT in sms-bot/.env.local');
  process.exit(1);
}

// === SOCKET CONNECTION ===
let socket = null;
let socketBuffer = '';
let pendingCallbacks = new Map();

function connectToDaemon() {
  return new Promise((resolve) => {
    if (socket && !socket.destroyed) {
      resolve(true);
      return;
    }

    if (!existsSync(SOCKET_PATH)) {
      console.log('[Dot] Daemon not running');
      resolve(false);
      return;
    }

    socket = connect(SOCKET_PATH);
    
    socket.on('connect', () => {
      console.log('[Dot] Connected to daemon');
      resolve(true);
    });

    socket.on('data', (data) => {
      socketBuffer += data.toString();
      const lines = socketBuffer.split('\n');
      socketBuffer = lines.pop();
      
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          if (msg.type === 'response') {
            const [id, cb] = [...pendingCallbacks.entries()][0] || [];
            if (cb) {
              cb(msg.text);
              pendingCallbacks.delete(id);
            }
          }
        } catch (e) {}
      }
    });

    socket.on('close', () => { socket = null; });
    socket.on('error', (err) => {
      console.error('[Dot] Socket error:', err.message);
      socket = null;
      resolve(false);
    });

    setTimeout(() => resolve(false), 5000);
  });
}

async function sendToDaemon(content, author) {
  const connected = await connectToDaemon();
  if (!connected || !socket) return null;

  return new Promise((resolve) => {
    const timeout = setTimeout(() => resolve(null), 120000);
    const id = Date.now().toString();
    
    pendingCallbacks.set(id, (response) => {
      clearTimeout(timeout);
      resolve(response);
    });

    socket.write(JSON.stringify({ type: 'chat', content, author, source: 'discord' }) + '\n');
  });
}

// === DISCORD CLIENT ===
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.DirectMessages,
  ],
  partials: [Partials.Channel],
});

function isForDot(message, client) {
  if (!message.guild) return true;  // DMs
  if (message.mentions.has(client.user)) return true;
  const content = message.content.toLowerCase();
  return /^(hey|hi|yo)?\s*,?\s*dot\b/i.test(content) || /^dot\b/i.test(content);
}

// Allow messages from Pit
const ALLOWED_BOTS = [
  // Add Pit's bot ID here once created
];

client.on('ready', () => {
  console.log(`[Dot] Discord: ${client.user.tag}`);
});

client.on('messageCreate', async (message) => {
  // Ignore self
  if (message.author.id === client.user.id) return;
  
  // Ignore other bots (except allowlist)
  if (message.author.bot && !ALLOWED_BOTS.includes(message.author.id)) return;

  if (!isForDot(message, client)) return;

  console.log(`[Dot] Message from ${message.author.username}: ${message.content.substring(0, 50)}...`);

  // Show typing
  await message.channel.sendTyping();

  const response = await sendToDaemon(
    `[Discord from ${message.author.username}] ${message.content}`,
    message.author.username
  );

  if (response) {
    // Split long messages
    const chunks = response.match(/[\s\S]{1,1900}/g) || [response];
    for (const chunk of chunks) {
      await message.reply(chunk);
    }
  } else {
    await message.reply("🎨 Daemon not responding. Start it with `node daemon.js`");
  }
});

client.login(BOT_TOKEN);
