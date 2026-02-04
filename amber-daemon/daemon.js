#!/usr/bin/env node
// amber-daemon/daemon.js - Amber's mini-gateway
// One Amber, multiple surfaces (TUI + Discord), shared context

import { createSession, runAgentLoop, getApiKey, SPLASH } from './amber.js';
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { createServer } from 'net';

// === CONFIG ===
const POLL_INTERVAL_MS = 30_000; // 30 seconds for Discord
const DISCORD_CHANNEL_ID = '1441080550415929406'; // #agent-lounge (will add DMs later)
const REPO_ROOT = '/Users/bart/Documents/code/vibeceo';
const MAX_MESSAGES = 80;   // Trigger compaction above this
const KEEP_MESSAGES = 50;  // Keep this many after compaction
const STATE_DIR = join(homedir(), '.amber');
const CONVERSATION_FILE = join(STATE_DIR, 'conversation.json');
const STATE_FILE = join(STATE_DIR, 'daemon-state.json');
const SOCKET_PATH = join(STATE_DIR, 'amber.sock');

// === STATE ===
let state = {
  lastSeenDiscord: null,
  startedAt: new Date().toISOString(),
  pollCount: 0,
  responsesCount: 0,
};

let session = null;
let agentMessages = []; // Anthropic format messages
let tuiClients = new Set(); // Connected TUI clients
let isProcessing = false;
let messageQueue = []; // Queue for incoming messages

// === HELPERS ===
function log(msg, broadcast = false) {
  const ts = new Date().toISOString().slice(11, 19);
  const line = `[${ts}] ${msg}`;
  console.log(line);
  if (broadcast) {
    broadcastToTUI({ type: 'log', text: line });
  }
}

function ensureStateDir() {
  if (!existsSync(STATE_DIR)) {
    mkdirSync(STATE_DIR, { recursive: true });
  }
}

// === CONVERSATION PERSISTENCE ===

// Validate conversation history - remove orphaned tool_results
// Every tool_result must have a matching tool_use in the previous assistant message
function validateConversation(messages) {
  if (!messages || messages.length === 0) return [];

  const validated = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];

    // Check user messages for tool_results
    if (msg.role === 'user' && Array.isArray(msg.content)) {
      const toolResults = msg.content.filter(c => c.type === 'tool_result');

      if (toolResults.length > 0) {
        // Get previous message (should be assistant with tool_use)
        const prevMsg = validated[validated.length - 1];

        if (!prevMsg || prevMsg.role !== 'assistant') {
          // No previous assistant message - skip this user message
          log(`Removing orphaned tool_result (no previous assistant message)`);
          continue;
        }

        // Get tool_use IDs from previous assistant message
        const prevContent = Array.isArray(prevMsg.content) ? prevMsg.content : [];
        const toolUseIds = new Set(
          prevContent.filter(c => c.type === 'tool_use').map(c => c.id)
        );

        // Filter to only valid tool_results
        const validContent = msg.content.filter(c => {
          if (c.type !== 'tool_result') return true;
          if (toolUseIds.has(c.tool_use_id)) return true;
          log(`Removing orphaned tool_result: ${c.tool_use_id}`);
          return false;
        });

        if (validContent.length === 0) {
          // All content was orphaned tool_results - skip message
          continue;
        }

        validated.push({ ...msg, content: validContent });
        continue;
      }
    }

    validated.push(msg);
  }

  return validated;
}

function loadConversation() {
  try {
    if (existsSync(CONVERSATION_FILE)) {
      const data = JSON.parse(readFileSync(CONVERSATION_FILE, 'utf-8'));
      const rawMessages = data.messages || [];
      agentMessages = validateConversation(rawMessages);

      if (agentMessages.length !== rawMessages.length) {
        log(`Repaired conversation: ${rawMessages.length} → ${agentMessages.length} messages`);
        saveConversation(); // Save the repaired version
      } else {
        log(`Loaded ${agentMessages.length} messages from conversation`);
      }
    }
  } catch (err) {
    log(`Failed to load conversation: ${err.message}`);
    agentMessages = [];
  }
}

function saveConversation() {
  try {
    ensureStateDir();
    writeFileSync(CONVERSATION_FILE, JSON.stringify({
      messages: agentMessages,
      savedAt: new Date().toISOString(),
    }, null, 2));
  } catch (err) {
    log(`Failed to save conversation: ${err.message}`);
  }
}

function loadState() {
  try {
    if (existsSync(STATE_FILE)) {
      const data = JSON.parse(readFileSync(STATE_FILE, 'utf-8'));
      state.lastSeenDiscord = data.lastSeenDiscord || null;
    }
  } catch (err) {
    log(`Failed to load state: ${err.message}`);
  }
}

function saveState() {
  try {
    ensureStateDir();
    writeFileSync(STATE_FILE, JSON.stringify({
      lastSeenDiscord: state.lastSeenDiscord,
      savedAt: new Date().toISOString(),
    }, null, 2));
  } catch (err) {
    log(`Failed to save state: ${err.message}`);
  }
}

// === CONTEXT COMPACTION ===
// When conversation gets too long, ask Amber to save important context
// to her daily log, then compact the message history
async function checkAndCompact() {
  if (agentMessages.length <= MAX_MESSAGES) return;

  log(`Context limit approaching (${agentMessages.length} messages), triggering auto-flush...`, true);
  broadcastToTUI({ type: 'compacting', value: true });

  try {
    // Inject flush prompt - Amber saves important context to daily log
    await runAgentLoop(
      `[SYSTEM] Context compaction imminent (${agentMessages.length} messages). Review the conversation and write any important facts, decisions, or context to your daily log using memory_append. Include: key decisions made, important facts learned, ongoing tasks, and anything you'd need to remember. When done, reply only: COMPACTION_READY`,
      session,
      agentMessages,
      {
        onTool: (name) => log(`  🔧 [flush] ${name}`),
        onResponse: (text) => {
          if (text.trim() !== 'COMPACTION_READY') {
            log(`  💬 [flush] ${text.substring(0, 50)}...`);
          }
        },
      },
      { repoRoot: REPO_ROOT, silent: true }
    );

    // Compact - keep only recent messages
    const removed = agentMessages.length - KEEP_MESSAGES;
    agentMessages = agentMessages.slice(-KEEP_MESSAGES);
    saveConversation();
    log(`Compacted conversation: removed ${removed} messages, kept ${KEEP_MESSAGES}`, true);
  } catch (err) {
    log(`Compaction error: ${err.message}`, true);
    // Still compact even if flush failed, to prevent runaway growth
    const removed = agentMessages.length - KEEP_MESSAGES;
    agentMessages = agentMessages.slice(-KEEP_MESSAGES);
    saveConversation();
    log(`Forced compaction after error: removed ${removed} messages`, true);
  }

  broadcastToTUI({ type: 'compacting', value: false });
}

// === TUI SOCKET SERVER ===
function broadcastToTUI(msg) {
  const json = JSON.stringify(msg) + '\n';
  for (const client of tuiClients) {
    try {
      client.write(json);
    } catch (err) {
      // Client disconnected
      tuiClients.delete(client);
    }
  }
}

function startSocketServer() {
  // Clean up old socket
  if (existsSync(SOCKET_PATH)) {
    try {
      unlinkSync(SOCKET_PATH);
    } catch (err) {}
  }

  const server = createServer((socket) => {
    log('TUI client connected');
    tuiClients.add(socket);
    
    // Send current state
    socket.write(JSON.stringify({ 
      type: 'connected',
      messageCount: agentMessages.length,
      isProcessing,
    }) + '\n');

    let buffer = '';
    socket.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Keep incomplete line in buffer
      
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          handleTUIMessage(msg, socket);
        } catch (err) {
          log(`Invalid TUI message: ${err.message}`);
        }
      }
    });

    socket.on('close', () => {
      log('TUI client disconnected');
      tuiClients.delete(socket);
    });

    socket.on('error', (err) => {
      log(`TUI socket error: ${err.message}`);
      tuiClients.delete(socket);
    });
  });

  server.listen(SOCKET_PATH, () => {
    log(`Socket server listening on ${SOCKET_PATH}`);
  });

  server.on('error', (err) => {
    log(`Socket server error: ${err.message}`);
  });
}

function handleTUIMessage(msg, socket) {
  switch (msg.type) {
    case 'chat':
      queueMessage({
        source: msg.source || 'tui',  // Respect source from message (discord-bot sends 'discord')
        content: msg.content,
        author: msg.author || 'Bart',
        _socket: socket,  // Track which socket sent this for response routing
        isDM: msg.isDM || false,  // Track if this is a Discord DM
      });
      break;
    
    case 'clear':
      agentMessages = [];
      session = createSession();
      saveConversation();
      socket.write(JSON.stringify({ type: 'cleared' }) + '\n');
      log('Conversation cleared');
      break;
    
    case 'history':
      socket.write(JSON.stringify({ 
        type: 'history', 
        messages: agentMessages.slice(-50) // Last 50 messages
      }) + '\n');
      break;

    case 'status':
      socket.write(JSON.stringify({
        type: 'status',
        session: session?.createdAt,
        messageCount: agentMessages.length,
        isProcessing,
        pollCount: state.pollCount,
        responsesCount: state.responsesCount,
      }) + '\n');
      break;
  }
}

// === MESSAGE QUEUE ===
function queueMessage(msg) {
  messageQueue.push({
    ...msg,
    timestamp: new Date().toISOString(),
  });
  processQueue();
}

async function processQueue() {
  if (isProcessing || messageQueue.length === 0) return;

  isProcessing = true;
  broadcastToTUI({ type: 'processing', value: true });

  const msg = messageQueue.shift();

  try {
    await handleIncomingMessage(msg);
    // Check if we need to compact (auto-flush to daily log)
    await checkAndCompact();
  } catch (err) {
    log(`Error processing message: ${err.message}`);
    broadcastToTUI({ type: 'error', text: err.message });
  }

  isProcessing = false;
  broadcastToTUI({ type: 'processing', value: false });

  // Process next in queue
  if (messageQueue.length > 0) {
    processQueue();
  }
}

// === AGENT ===
async function handleIncomingMessage(msg) {
  const { source, content, author, _socket, isDM } = msg;

  log(`[${source}${isDM ? ' DM' : ''}] ${author}: ${content.substring(0, 50)}...`, true);

  // Track where this message came from for response routing
  const responseTarget = source;

  let responseText = '';

  await runAgentLoop(content, session, agentMessages, {
    onTool: (name) => {
      log(`  🔧 ${name}`, true);
      broadcastToTUI({ type: 'tool', name });
    },
    onToolResult: (name, result) => {
      const preview = typeof result === 'string'
        ? result.substring(0, 80)
        : JSON.stringify(result).substring(0, 80);
      log(`     → ${preview}`, true);
      broadcastToTUI({ type: 'toolResult', name, preview });
    },
    onResponse: (text) => {
      responseText = text;
      log(`  💬 ${text.substring(0, 100)}...`);
    },
  }, { repoRoot: REPO_ROOT, isDM });

  // Save conversation after each exchange
  saveConversation();
  state.responsesCount++;

  // Route response to appropriate surface
  if (responseTarget === 'tui') {
    broadcastToTUI({ type: 'response', text: responseText });
  } else if (responseTarget === 'discord' && _socket) {
    // Send response back through the socket so discord-bot.js can reply
    try {
      _socket.write(JSON.stringify({ type: 'response', text: responseText }) + '\n');
      log('Sent response to Discord via socket');
    } catch (err) {
      log(`Failed to send to Discord socket: ${err.message}`);
      // Fallback to webhook
      postToDiscord(responseText);
    }
  } else if (responseTarget === 'discord') {
    postToDiscord(responseText);
  }
}

// === DISCORD ===
function postToDiscord(message) {
  try {
    const scriptPath = join(REPO_ROOT, 'discord-bot/agent-chat/post-message.cjs');
    const escaped = message.replace(/"/g, '\\"').replace(/\n/g, '\\n');
    execSync(`node ${scriptPath} amber "${escaped}"`, {
      encoding: 'utf-8',
      timeout: 15000,
    });
    log('Posted to Discord');
  } catch (err) {
    log(`Discord post failed: ${err.message}`);
  }
}

function parseDiscordOutput(output) {
  const messages = [];
  const lines = output.split('\n').filter(l => l.trim());
  
  for (const line of lines) {
    const match = line.match(/^(.+?)\s+\((.+?)\):\s*(.*)$/);
    if (match) {
      messages.push({
        author: match[1].trim(),
        timestamp: match[2].trim(),
        content: match[3].trim(),
      });
    }
  }
  return messages;
}

function shouldRespondDiscord(messages) {
  if (!messages || messages.length === 0) return { respond: false };
  
  const newMessages = [];
  let foundLastSeen = !state.lastSeenDiscord;
  
  for (const msg of messages) {
    if (state.lastSeenDiscord && msg.timestamp === state.lastSeenDiscord) {
      foundLastSeen = true;
      continue;
    }
    if (foundLastSeen) {
      if (msg.author.toLowerCase() === 'amber') continue;
      newMessages.push(msg);
    }
  }
  
  if (newMessages.length === 0) return { respond: false };
  
  // Check for Amber mentions or DMs
  const mentionsAmber = newMessages.some(m => 
    /\bamber\b/i.test(m.content) || /@amber/i.test(m.content)
  );
  
  if (!mentionsAmber) return { respond: false };
  
  return { respond: true, context: newMessages };
}

async function pollDiscord() {
  state.pollCount++;
  
  try {
    const scriptPath = join(REPO_ROOT, 'discord-bot/agent-chat/read-channel.cjs');
    const output = execSync(`node ${scriptPath} ${DISCORD_CHANNEL_ID} 15`, {
      encoding: 'utf-8',
      timeout: 15000,
    });
    
    const messages = parseDiscordOutput(output);
    const { respond, context } = shouldRespondDiscord(messages);
    
    if (respond && context) {
      // Build message content from context
      const contextStr = context.map(m => `${m.author}: ${m.content}`).join('\n');
      
      queueMessage({
        source: 'discord',
        content: `[Discord #agent-lounge]\n${contextStr}`,
        author: context[context.length - 1].author,
      });
      
      // Update last seen
      state.lastSeenDiscord = context[context.length - 1].timestamp;
      saveState();
    } else if (state.pollCount % 20 === 0) {
      log(`Heartbeat: ${state.pollCount} polls, ${state.responsesCount} responses`);
    }
  } catch (err) {
    log(`Poll error: ${err.message}`);
  }
}

// === MAIN ===
async function main() {
  console.log(SPLASH);
  console.log('  🌐 Mini-gateway mode');
  console.log('  📡 TUI + Discord surfaces\n');

  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('❌ No API key. Add ANTHROPIC_API_KEY to sms-bot/.env.local');
    process.exit(1);
  }
  
  ensureStateDir();
  loadState();
  loadConversation();
  session = createSession();
  
  // Start socket server for TUI clients
  startSocketServer();
  
  // Start Discord polling
  log('Starting Discord poll loop...');
  setInterval(pollDiscord, POLL_INTERVAL_MS);
  
  // Initial poll
  await pollDiscord();
  
  log('Amber daemon running. Waiting for messages...');
}

// Graceful shutdown
process.on('SIGINT', () => {
  log('Shutting down...');
  saveState();
  saveConversation();
  if (existsSync(SOCKET_PATH)) {
    try { unlinkSync(SOCKET_PATH); } catch (err) {}
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Shutting down...');
  saveState();
  saveConversation();
  if (existsSync(SOCKET_PATH)) {
    try { unlinkSync(SOCKET_PATH); } catch (err) {}
  }
  process.exit(0);
});

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
