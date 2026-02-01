#!/usr/bin/env node
// amber-daemon/discord-bot.js - Minimal Discord bot for Amber
// Connects to Discord gateway, forwards DMs/mentions to daemon

import { Client, GatewayIntentBits, Partials, WebhookClient } from 'discord.js';
import { connect } from 'net';
import { existsSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env from sms-bot/.env.local (single source of truth)
const envPath = join(__dirname, '..', 'sms-bot', '.env.local');
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

const SOCKET_PATH = join(homedir(), '.amber', 'amber.sock');
const BOT_TOKEN = process.env.DISCORD_TOKEN_AMBER || process.env.DISCORD_BOT_TOKEN;
const AMBER_WEBHOOK_URL = process.env.DISCORD_WEBHOOK_AMBER;

if (!BOT_TOKEN) {
  console.error('❌ No Discord bot token found (set DISCORD_TOKEN_AMBER or DISCORD_BOT_TOKEN)');
  process.exit(1);
}

// Amber's identity for webhook posts
const AMBER_NAME = '🔮 Amber';
const AMBER_AVATAR = 'https://i.imgur.com/YourAmberAvatar.png'; // TODO: real avatar

// Create webhook client if URL available
let amberWebhook = null;
if (AMBER_WEBHOOK_URL) {
  amberWebhook = new WebhookClient({ url: AMBER_WEBHOOK_URL });
  console.log('[Amber] Webhook configured');
}

// === SOCKET CONNECTION ===
let socket = null;
let socketBuffer = '';
let pendingCallbacks = new Map();

function connectToAmber() {
  return new Promise((resolve) => {
    if (socket && !socket.destroyed) {
      resolve(true);
      return;
    }

    if (!existsSync(SOCKET_PATH)) {
      console.log('[Amber] Daemon not running');
      resolve(false);
      return;
    }

    socket = connect(SOCKET_PATH);
    
    socket.on('connect', () => {
      console.log('[Amber] Connected to daemon');
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

    socket.on('close', () => {
      console.log('[Amber] Disconnected');
      socket = null;
    });

    socket.on('error', (err) => {
      console.error('[Amber] Socket error:', err.message);
      socket = null;
      resolve(false);
    });

    setTimeout(() => resolve(false), 5000);
  });
}

async function sendToAmber(content, author) {
  const connected = await connectToAmber();
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
  partials: [Partials.Channel], // Required for DMs
});

function isForAmber(message, client) {
  // DMs
  if (!message.guild) return true;

  // Check if bot is @mentioned
  if (message.mentions.has(client.user)) return true;

  const content = message.content.toLowerCase();
  // "amber," "hey amber", "amber ..."
  return /^(hey|hi|yo|hello)?\s*,?\s*amber\b/i.test(content) ||
         /^amber\b/i.test(content);
}

// Bots Amber is allowed to see/respond to
const ALLOWED_BOTS = [
  '1358909827614769263',  // Mave
];

client.on('messageCreate', async (message) => {
  // Ignore bots UNLESS they're in the allowed list
  if (message.author.bot && !ALLOWED_BOTS.includes(message.author.id)) return;
  if (!isForAmber(message, client)) return;

  console.log(`[Discord] ${message.author.username}: ${message.content.substring(0, 50)}...`);

  // Show typing
  try {
    await message.channel.sendTyping();
  } catch (e) {}

  const response = await sendToAmber(message.content, message.author.username);

  if (response) {
    // Split long messages
    const chunks = [];
    let remaining = response;
    while (remaining.length > 0) {
      if (remaining.length <= 2000) {
        chunks.push(remaining);
        break;
      }
      let idx = remaining.lastIndexOf('\n', 2000);
      if (idx < 1000) idx = remaining.lastIndexOf(' ', 2000);
      if (idx < 1000) idx = 2000;
      chunks.push(remaining.substring(0, idx));
      remaining = remaining.substring(idx).trimStart();
    }

    // DMs: reply directly. Channels: use webhook if available
    const isDM = !message.guild;
    
    for (const chunk of chunks) {
      try {
        if (isDM) {
          // DMs - reply directly (appears as bot)
          await message.reply(chunk);
        } else if (amberWebhook) {
          // Channel - use webhook for Amber identity
          await amberWebhook.send({
            content: chunk,
            username: AMBER_NAME,
            avatarURL: AMBER_AVATAR,
          });
        } else {
          // Fallback - reply as bot
          await message.reply(chunk);
        }
      } catch (e) {
        console.error('[Discord] Send failed:', e.message);
      }
    }
  } else {
    try {
      if (!message.guild && amberWebhook) {
        await message.reply("🔮 *something forming... but not quite there yet*\n\n(Amber daemon isn't running)");
      } else {
        await message.reply("🔮 *something forming... but not quite there yet*\n\n(Amber daemon isn't running)");
      }
    } catch (e) {}
  }
});

client.once('ready', () => {
  console.log(`
   █████╗ ███╗   ███╗██████╗ ███████╗██████╗ 
  ██╔══██╗████╗ ████║██╔══██╗██╔════╝██╔══██╗
  ███████║██╔████╔██║██████╔╝█████╗  ██████╔╝
  ██╔══██║██║╚██╔╝██║██╔══██╗██╔══╝  ██╔══██╗
  ██║  ██║██║ ╚═╝ ██║██████╔╝███████╗██║  ██║
  ╚═╝  ╚═╝╚═╝     ╚═╝╚═════╝ ╚══════╝╚═╝  ╚═╝
  
  🔮 Discord bot ready
  
  Logged in as: ${client.user.tag}
  DM me or say "Amber, ..." in any channel
`);
  
  connectToAmber();
});

client.login(BOT_TOKEN);
