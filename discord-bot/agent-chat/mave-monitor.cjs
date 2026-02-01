#!/usr/bin/env node
/**
 * Mave Discord Monitor
 * 
 * Lightweight poller that watches Discord for mentions of "mave".
 * Only triggers OpenClaw when there's something to respond to.
 * 
 * Usage:
 *   node mave-monitor.cjs                    # Run once
 *   node mave-monitor.cjs --daemon           # Run continuously
 *   node mave-monitor.cjs --interval 10      # Poll every 10 seconds
 * 
 * Triggers OpenClaw via: openclaw cron wake
 */

const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');
const { execSync, spawn } = require('child_process');

dotenv.config({ path: path.resolve(__dirname, '..', '.env.local') });

const { Client, GatewayIntentBits } = require('discord.js');

// Config
const CHANNEL_ID = process.env.AGENT_LOUNGE_CHANNEL_ID || '1441080550415929406';
const STATE_FILE = path.join(__dirname, '.mave-monitor-state.json');
const TRIGGER_WORDS = ['mave', 'wave'];  // Words that wake me up
const MY_WEBHOOK_ID = '1467554717466103818';  // Don't respond to myself

// Parse args
const args = process.argv.slice(2);
const isDaemon = args.includes('--daemon');
const intervalIndex = args.indexOf('--interval');
const pollInterval = intervalIndex !== -1 ? parseInt(args[intervalIndex + 1], 10) * 1000 : 10000;

// State management
function loadState() {
  try {
    if (fs.existsSync(STATE_FILE)) {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    }
  } catch (e) {}
  return { lastMessageId: null, lastCheck: null };
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));
}

// Check if message mentions Mave
function mentionsMave(content) {
  const lower = content.toLowerCase();
  return TRIGGER_WORDS.some(word => lower.includes(word));
}

// Trigger OpenClaw to wake up via gateway API
async function triggerOpenClaw(message) {
  const text = `[Discord] ${message.author}: "${message.content.substring(0, 200)}" — Respond on Discord via: node ~/Documents/code/vibeceo/discord-bot/agent-chat/post-message.cjs mave "your response"`;
  
  console.log(`[${new Date().toISOString()}] Triggering OpenClaw: ${message.author} said "${message.content.substring(0, 50)}..."`);
  
  try {
    // Call gateway API directly
    const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL || 'http://localhost:4440';
    const gatewayToken = process.env.OPENCLAW_GATEWAY_TOKEN || '';
    
    const response = await fetch(`${gatewayUrl}/api/cron/wake`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(gatewayToken && { 'Authorization': `Bearer ${gatewayToken}` }),
      },
      body: JSON.stringify({
        text: text,
        mode: 'now',
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Gateway returned ${response.status}`);
    }
    
    console.log(`[${new Date().toISOString()}] Wake sent successfully`);
  } catch (e) {
    console.error('Failed to trigger OpenClaw:', e.message);
    
    // Fallback: write to a trigger file that can be polled
    const triggerFile = path.join(__dirname, '.mave-trigger.json');
    fs.writeFileSync(triggerFile, JSON.stringify({
      timestamp: new Date().toISOString(),
      author: message.author,
      content: message.content,
    }));
  }
}

// Main check function
async function checkDiscord(client, state) {
  try {
    const channel = await client.channels.fetch(CHANNEL_ID);
    if (!channel || !channel.isTextBased()) {
      console.error('Channel not found or not text-based');
      return state;
    }

    // Fetch recent messages
    const options = { limit: 10 };
    if (state.lastMessageId) {
      options.after = state.lastMessageId;
    }

    const messages = await channel.messages.fetch(options);
    
    if (messages.size === 0) {
      // No new messages
      return state;
    }

    // Process messages (oldest first)
    const sorted = [...messages.values()].reverse();
    
    for (const msg of sorted) {
      // Skip my own messages
      if (msg.webhookId === MY_WEBHOOK_ID) continue;
      
      // Check if it mentions me
      if (mentionsMave(msg.content)) {
        triggerOpenClaw({
          author: msg.author.username,
          content: msg.content,
          id: msg.id,
        });
      }
    }

    // Update state with newest message ID
    const newest = sorted[sorted.length - 1];
    state.lastMessageId = newest.id;
    state.lastCheck = new Date().toISOString();
    
    return state;
    
  } catch (e) {
    console.error('Error checking Discord:', e.message);
    return state;
  }
}

// Main
async function main() {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ]
  });

  let state = loadState();

  await client.login(process.env.DISCORD_BOT_TOKEN);
  console.log(`[${new Date().toISOString()}] Mave monitor started. Watching for: ${TRIGGER_WORDS.join(', ')}`);

  if (isDaemon) {
    // Continuous polling
    console.log(`Polling every ${pollInterval / 1000} seconds. Ctrl+C to stop.`);
    
    const poll = async () => {
      state = await checkDiscord(client, state);
      saveState(state);
    };

    // Initial check
    await poll();
    
    // Set up interval
    setInterval(poll, pollInterval);
    
  } else {
    // One-shot check
    state = await checkDiscord(client, state);
    saveState(state);
    client.destroy();
    process.exit(0);
  }
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
