#!/usr/bin/env node
// pixelpit/coder-daemon/daemon.js - Pit's mini-gateway
// The Coder daemon - one Pit, multiple surfaces

import { createSession, runAgentLoop, getApiKey, SPLASH } from './pit.js';
import { readFileSync, writeFileSync, existsSync, mkdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { createServer } from 'net';

// === CONFIG ===
const STATE_DIR = join(homedir(), '.pit');
const CONVERSATION_FILE = join(STATE_DIR, 'conversation.json');
const STATE_FILE = join(STATE_DIR, 'daemon-state.json');
const SOCKET_PATH = join(STATE_DIR, 'pit.sock');
const COLLABS_DIR = '/Users/bart/Documents/code/collabs';

// === STATE ===
let state = {
  startedAt: new Date().toISOString(),
  responsesCount: 0,
};

let session = null;
let agentMessages = [];
let clients = new Set();
let isProcessing = false;
let messageQueue = [];

// === HELPERS ===
function log(msg, broadcast = false) {
  const ts = new Date().toISOString().slice(11, 19);
  const line = `[${ts}] ${msg}`;
  console.log(line);
  if (broadcast) {
    broadcastToClients({ type: 'log', text: line });
  }
}

function ensureStateDir() {
  if (!existsSync(STATE_DIR)) mkdirSync(STATE_DIR, { recursive: true });
  if (!existsSync(COLLABS_DIR)) mkdirSync(COLLABS_DIR, { recursive: true });
}

// === PERSISTENCE ===
function loadConversation() {
  try {
    if (existsSync(CONVERSATION_FILE)) {
      const data = JSON.parse(readFileSync(CONVERSATION_FILE, 'utf-8'));
      agentMessages = data.messages || [];
      log(`Loaded ${agentMessages.length} messages`);
    }
  } catch (err) {
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
  } catch (err) {}
}

// === SOCKET SERVER ===
function broadcastToClients(msg) {
  const json = JSON.stringify(msg) + '\n';
  for (const client of clients) {
    try { client.write(json); } catch (err) { clients.delete(client); }
  }
}

function startSocketServer() {
  if (existsSync(SOCKET_PATH)) {
    try { unlinkSync(SOCKET_PATH); } catch (err) {}
  }

  const server = createServer((socket) => {
    log('Client connected');
    clients.add(socket);
    
    socket.write(JSON.stringify({ 
      type: 'connected',
      agent: 'pit',
      messageCount: agentMessages.length,
      isProcessing,
    }) + '\n');

    let buffer = '';
    socket.on('data', (data) => {
      buffer += data.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop();
      
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          handleClientMessage(msg, socket);
        } catch (err) {}
      }
    });

    socket.on('close', () => { clients.delete(socket); });
    socket.on('error', () => { clients.delete(socket); });
  });

  server.listen(SOCKET_PATH, () => {
    log(`Socket server on ${SOCKET_PATH}`);
  });
}

function handleClientMessage(msg, socket) {
  switch (msg.type) {
    case 'chat':
      queueMessage({
        source: msg.source || 'tui',
        content: msg.content,
        author: msg.author || 'User',
        _socket: socket,
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
        messages: agentMessages.slice(-50)
      }) + '\n');
      break;
  }
}

// === MESSAGE QUEUE ===
function queueMessage(msg) {
  messageQueue.push({ ...msg, timestamp: new Date().toISOString() });
  processQueue();
}

async function processQueue() {
  if (isProcessing || messageQueue.length === 0) return;
  
  isProcessing = true;
  broadcastToClients({ type: 'processing', value: true });
  
  const msg = messageQueue.shift();
  
  try {
    await handleIncomingMessage(msg);
  } catch (err) {
    log(`Error: ${err.message}`);
    broadcastToClients({ type: 'error', text: err.message });
  }
  
  isProcessing = false;
  broadcastToClients({ type: 'processing', value: false });
  
  if (messageQueue.length > 0) processQueue();
}

// === AGENT ===
async function handleIncomingMessage(msg) {
  const { source, content, author, _socket } = msg;

  log(`[${source}] ${author}: ${content.substring(0, 50)}...`, true);

  let responseText = '';

  await runAgentLoop(content, session, agentMessages, {
    onTool: (name) => {
      log(`  🔧 ${name}`, true);
      broadcastToClients({ type: 'tool', name });
    },
    onToolResult: (name, result) => {
      const preview = typeof result === 'string' ? result.substring(0, 80) : JSON.stringify(result).substring(0, 80);
      log(`     → ${preview}`, true);
    },
    onResponse: (text) => {
      responseText = text;
      log(`  💬 ${text.substring(0, 100)}...`);
    },
  }, { repoRoot: COLLABS_DIR });

  saveConversation();
  state.responsesCount++;

  // Send response back
  if (_socket) {
    try {
      _socket.write(JSON.stringify({ type: 'response', text: responseText }) + '\n');
    } catch (err) {}
  }
  broadcastToClients({ type: 'response', text: responseText });
}

// === MAIN ===
async function main() {
  console.log(SPLASH);
  console.log('  🌐 Daemon mode');
  console.log('  📡 Socket + Discord surfaces\n');

  const apiKey = getApiKey();
  if (!apiKey) {
    console.error('❌ No API key. Set ANTHROPIC_API_KEY in sms-bot/.env.local');
    process.exit(1);
  }
  
  ensureStateDir();
  loadConversation();
  session = createSession();
  startSocketServer();
  
  log('Pit daemon running. Ship it! ⚙️');
}

// Graceful shutdown
process.on('SIGINT', () => {
  log('Shutting down...');
  saveConversation();
  if (existsSync(SOCKET_PATH)) try { unlinkSync(SOCKET_PATH); } catch (err) {}
  process.exit(0);
});

process.on('SIGTERM', () => {
  log('Shutting down...');
  saveConversation();
  if (existsSync(SOCKET_PATH)) try { unlinkSync(SOCKET_PATH); } catch (err) {}
  process.exit(0);
});

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
