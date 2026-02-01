// amber.ts - Amber integration for Discord bot
// Forwards DMs and @Amber mentions to the amber-daemon via Unix socket

import { Message, Client } from 'discord.js';
import { connect, Socket } from 'net';
import { homedir } from 'os';
import { join } from 'path';
import { existsSync } from 'fs';

const SOCKET_PATH = join(homedir(), '.amber', 'amber.sock');

// Track active socket connection
let amberSocket: Socket | null = null;
let messageBuffer = '';
let pendingResponses: Map<string, (response: string) => void> = new Map();

// Connect to amber-daemon
function connectToAmber(): Promise<boolean> {
  return new Promise((resolve) => {
    if (amberSocket && !amberSocket.destroyed) {
      resolve(true);
      return;
    }

    if (!existsSync(SOCKET_PATH)) {
      console.log('[Amber] Daemon not running (socket not found)');
      resolve(false);
      return;
    }

    amberSocket = connect(SOCKET_PATH);
    
    amberSocket.on('connect', () => {
      console.log('[Amber] Connected to daemon');
      resolve(true);
    });

    amberSocket.on('data', (data) => {
      messageBuffer += data.toString();
      const lines = messageBuffer.split('\n');
      messageBuffer = lines.pop() || '';
      
      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const msg = JSON.parse(line);
          handleDaemonMessage(msg);
        } catch (err) {
          // Ignore parse errors
        }
      }
    });

    amberSocket.on('close', () => {
      console.log('[Amber] Disconnected from daemon');
      amberSocket = null;
    });

    amberSocket.on('error', (err) => {
      console.error('[Amber] Socket error:', err.message);
      amberSocket = null;
      resolve(false);
    });

    // Timeout if no connection after 5s
    setTimeout(() => {
      if (amberSocket && !amberSocket.destroyed) {
        // Already connected
      } else {
        resolve(false);
      }
    }, 5000);
  });
}

function handleDaemonMessage(msg: any) {
  if (msg.type === 'response' && msg.text) {
    // Get the oldest pending response callback
    const [channelId, callback] = [...pendingResponses.entries()][0] || [];
    if (callback) {
      callback(msg.text);
      pendingResponses.delete(channelId);
    }
  }
}

// Send message to Amber and wait for response
async function sendToAmber(content: string, author: string): Promise<string | null> {
  const connected = await connectToAmber();
  if (!connected || !amberSocket) {
    return null;
  }

  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      resolve(null);
    }, 120000); // 2 minute timeout for complex tasks

    // Store callback
    const callbackId = Date.now().toString();
    pendingResponses.set(callbackId, (response) => {
      clearTimeout(timeout);
      resolve(response);
    });

    // Send message
    amberSocket!.write(JSON.stringify({
      type: 'chat',
      content,
      author,
    }) + '\n');
  });
}

// Check if message is for Amber
export function isAmberMessage(message: Message): boolean {
  // DMs to the bot - always Amber
  if (!message.guild) {
    return true;
  }
  
  const content = message.content.toLowerCase();
  
  // Explicit @amber mention or "hey amber", "amber," style
  if (/\bamber\b/.test(content)) {
    // Check if it's addressed to Amber (at start, or with "hey/hi/yo amber")
    if (/^(hey|hi|yo|hello)?\s*,?\s*amber\b/i.test(content)) {
      return true;
    }
    // Or mentions @amber
    if (/@amber/i.test(content)) {
      return true;
    }
    // Or amber is the first word
    if (/^amber\b/i.test(content)) {
      return true;
    }
  }
  
  return false;
}

// Handle Amber message
export async function handleAmberMessage(message: Message): Promise<boolean> {
  // Don't respond to bots
  if (message.author.bot) {
    return false;
  }

  // Check if this is for Amber
  if (!isAmberMessage(message)) {
    return false;
  }

  console.log(`[Amber] Received message from ${message.author.username}: ${message.content.substring(0, 50)}...`);

  // Show typing indicator
  if (message.channel && 'sendTyping' in message.channel) {
    try {
      await (message.channel as any).sendTyping();
    } catch (e) {
      // Ignore typing errors
    }
  }

  // Send to Amber daemon
  const response = await sendToAmber(message.content, message.author.username);

  if (response) {
    // Send response
    try {
      // Split long messages
      const chunks = splitMessage(response);
      for (const chunk of chunks) {
        await message.reply(chunk);
      }
      console.log(`[Amber] Sent response: ${response.substring(0, 50)}...`);
      return true;
    } catch (err) {
      console.error('[Amber] Failed to send response:', err);
    }
  } else {
    // Daemon not available
    try {
      await message.reply("🔮 *something forming... but not quite there yet*\n\n(Amber daemon isn't running. Start it with `node daemon.js` in amber-daemon/)");
    } catch (err) {
      console.error('[Amber] Failed to send fallback:', err);
    }
  }

  return true;
}

// Split message into Discord-safe chunks
function splitMessage(text: string, maxLength = 2000): string[] {
  if (text.length <= maxLength) {
    return [text];
  }

  const chunks: string[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    if (remaining.length <= maxLength) {
      chunks.push(remaining);
      break;
    }

    // Try to split at newline
    let splitIndex = remaining.lastIndexOf('\n', maxLength);
    if (splitIndex === -1 || splitIndex < maxLength / 2) {
      // Try to split at space
      splitIndex = remaining.lastIndexOf(' ', maxLength);
    }
    if (splitIndex === -1 || splitIndex < maxLength / 2) {
      // Hard split
      splitIndex = maxLength;
    }

    chunks.push(remaining.substring(0, splitIndex));
    remaining = remaining.substring(splitIndex).trimStart();
  }

  return chunks;
}

// Initialize Amber integration
export function initializeAmber(client: Client) {
  console.log('[Amber] Initializing...');
  
  // Try to connect on startup
  connectToAmber().then((connected) => {
    if (connected) {
      console.log('[Amber] Ready to handle messages');
    } else {
      console.log('[Amber] Daemon not available - will retry on first message');
    }
  });
}
