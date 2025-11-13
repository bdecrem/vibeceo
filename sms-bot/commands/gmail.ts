/**
 * GMAIL Command - Gmail integration for personalization
 *
 * Usage:
 *   GMAIL CONNECT - Authorize Gmail access
 *   GMAIL SEARCH {query} - Search emails
 *   GMAIL STATUS - Check connection status
 *   GMAIL DISCONNECT - Revoke access
 *
 * Examples:
 *   "GMAIL CONNECT"
 *   "GMAIL SEARCH meeting with john"
 *   "GMAIL SEARCH from:sarah@example.com subject:proposal"
 *   "GMAIL STATUS"
 */

import type { CommandContext } from './types.js';
import { getSubscriber } from '../lib/subscribers.js';
import {
  generateAuthUrl,
  searchGmail,
  hasGmailConnected,
  getGmailStatus,
  disconnectGmail,
} from '../lib/gmail-client.js';
import { supabase } from '../lib/supabase.js';

const GMAIL_PREFIX = 'GMAIL';

/**
 * Shorten a URL using the URL shortener service
 */
async function shortenUrl(longUrl: string): Promise<string> {
  try {
    const shortenerEndpoint = process.env.URL_SHORTENER_ENDPOINT || process.env.WEBTOYS_SHORTENER_ENDPOINT;

    if (!shortenerEndpoint) {
      return longUrl; // Fallback to long URL
    }

    const response = await fetch(shortenerEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url: longUrl }),
    });

    if (!response.ok) {
      return longUrl;
    }

    const data = await response.json();
    return data.short_url || data.shortUrl || longUrl;
  } catch (error) {
    console.error('URL shortening failed:', error);
    return longUrl;
  }
}

/**
 * Handle GMAIL CONNECT command
 */
async function handleGmailConnect(
  subscriber: any,
  context: CommandContext
): Promise<void> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate, normalizedFrom } = context;

  try {
    // Check if already connected
    const isConnected = await hasGmailConnected(subscriber.id);

    if (isConnected) {
      await sendSmsResponse(
        from,
        '✓ Gmail already connected!\n\nCommands:\n• GMAIL SEARCH [query]\n• GMAIL STATUS\n• GMAIL DISCONNECT',
        twilioClient
      );
      await updateLastMessageDate(normalizedFrom);
      return;
    }

    // Generate OAuth URL with subscriber ID as state
    const state = `subscriber_id:${subscriber.id}`;
    const authUrl = generateAuthUrl(state);

    // Log full URL for development/debugging
    console.log('\n📧 GMAIL CONNECT - Full OAuth URL:');
    console.log(authUrl);
    console.log('\n');

    // Shorten the URL
    const shortUrl = await shortenUrl(authUrl);

    await sendSmsResponse(
      from,
      `🔐 Gmail Authorization\n\nClick to authorize:\n${shortUrl}\n\nThis link expires in 10 minutes.`,
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);

  } catch (error: any) {
    console.error('[Gmail] Connect failed:', error);
    await sendSmsResponse(
      from,
      `❌ Failed to generate authorization link: ${error.message}`,
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
  }
}

/**
 * Handle GMAIL SEARCH command
 */
async function handleGmailSearch(
  subscriber: any,
  query: string,
  context: CommandContext
): Promise<void> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate, normalizedFrom } = context;

  try {
    // Check if connected
    const isConnected = await hasGmailConnected(subscriber.id);

    if (!isConnected) {
      await sendSmsResponse(
        from,
        '❌ Gmail not connected\n\nAuthorize first:\nGMAIL CONNECT',
        twilioClient
      );
      await updateLastMessageDate(normalizedFrom);
      return;
    }

    if (!query.trim()) {
      await sendSmsResponse(
        from,
        '❌ Please provide a search query\n\nExample:\nGMAIL SEARCH meeting with john',
        twilioClient
      );
      await updateLastMessageDate(normalizedFrom);
      return;
    }

    // Search Gmail
    const results = await searchGmail(subscriber.id, query, 5);

    if (results.length === 0) {
      await sendSmsResponse(
        from,
        `📧 No emails found for: "${query}"\n\nTry a different search query.`,
        twilioClient
      );
      await updateLastMessageDate(normalizedFrom);
      return;
    }

    // Format results
    let response = `📧 Gmail Results (${results.length}):\n\n`;

    results.forEach((msg, index) => {
      const date = new Date(msg.date).toLocaleDateString();
      const fromEmail = msg.from.split('<')[0].trim() || msg.from;

      response += `${index + 1}. ${msg.subject}\n`;
      response += `   From: ${fromEmail}\n`;
      response += `   Date: ${date}\n`;

      // Add snippet if not too long
      if (msg.snippet && msg.snippet.length < 80) {
        response += `   ${msg.snippet}\n`;
      }

      response += '\n';
    });

    response += `💡 Tip: Use Gmail search syntax\n• from:name@example.com\n• subject:keyword\n• after:2024/01/01`;

    await sendSmsResponse(from, response, twilioClient);
    await updateLastMessageDate(normalizedFrom);

  } catch (error: any) {
    console.error('[Gmail] Search failed:', error);

    if (error.message.includes('authorization expired')) {
      await sendSmsResponse(
        from,
        '❌ Gmail authorization expired\n\nReconnect:\nGMAIL CONNECT',
        twilioClient
      );
    } else {
      await sendSmsResponse(
        from,
        `❌ Search failed: ${error.message}`,
        twilioClient
      );
    }

    await updateLastMessageDate(normalizedFrom);
  }
}

/**
 * Handle GMAIL STATUS command
 */
async function handleGmailStatus(
  subscriber: any,
  context: CommandContext
): Promise<void> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate, normalizedFrom } = context;

  try {
    const status = await getGmailStatus(subscriber.id);

    if (!status.connected) {
      await sendSmsResponse(
        from,
        '❌ Gmail not connected\n\nAuthorize:\nGMAIL CONNECT',
        twilioClient
      );
      await updateLastMessageDate(normalizedFrom);
      return;
    }

    let response = '✓ Gmail Connected\n\n';

    if (status.email) {
      response += `Email: ${status.email}\n`;
    }

    if (status.lastUsed) {
      const lastUsed = new Date(status.lastUsed).toLocaleDateString();
      response += `Last used: ${lastUsed}\n`;
    }

    response += '\nCommands:\n• GMAIL SEARCH [query]\n• GMAIL DISCONNECT';

    await sendSmsResponse(from, response, twilioClient);
    await updateLastMessageDate(normalizedFrom);

  } catch (error: any) {
    console.error('[Gmail] Status check failed:', error);
    await sendSmsResponse(
      from,
      `❌ Failed to check status: ${error.message}`,
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
  }
}

/**
 * Handle GMAIL DISCONNECT command
 */
async function handleGmailDisconnect(
  subscriber: any,
  context: CommandContext
): Promise<void> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate, normalizedFrom } = context;

  try {
    const isConnected = await hasGmailConnected(subscriber.id);

    if (!isConnected) {
      await sendSmsResponse(
        from,
        'ℹ️ Gmail not connected\n\nNothing to disconnect.',
        twilioClient
      );
      await updateLastMessageDate(normalizedFrom);
      return;
    }

    await disconnectGmail(subscriber.id);

    await sendSmsResponse(
      from,
      '✓ Gmail disconnected\n\nYour tokens have been revoked.\n\nReconnect:\nGMAIL CONNECT',
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);

  } catch (error: any) {
    console.error('[Gmail] Disconnect failed:', error);
    await sendSmsResponse(
      from,
      `❌ Failed to disconnect: ${error.message}`,
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
  }
}

/**
 * Main GMAIL command handler
 */
async function handleGmail(
  message: string,
  context: CommandContext
): Promise<void> {
  const { from, normalizedFrom, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  // Remove "GMAIL" prefix
  const content = message.slice(GMAIL_PREFIX.length).trim();

  // Get subscriber
  const subscriber = await getSubscriber(normalizedFrom);
  if (!subscriber) {
    await sendSmsResponse(from, '❌ Subscriber not found', twilioClient);
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  // Parse subcommand
  const parts = content.split(/\s+/);
  const subcommand = parts[0]?.toUpperCase() || '';
  const args = parts.slice(1).join(' ');

  // Route to subcommand
  switch (subcommand) {
    case 'CONNECT':
      await handleGmailConnect(subscriber, context);
      break;

    case 'SEARCH':
      await handleGmailSearch(subscriber, args, context);
      break;

    case 'STATUS':
      await handleGmailStatus(subscriber, context);
      break;

    case 'DISCONNECT':
      await handleGmailDisconnect(subscriber, context);
      break;

    default:
      // Show help
      await sendSmsResponse(
        from,
        `📧 Gmail Commands:\n\n• GMAIL CONNECT - Authorize access\n• GMAIL SEARCH [query] - Search emails\n• GMAIL STATUS - Check connection\n• GMAIL DISCONNECT - Revoke access\n\nExample:\nGMAIL SEARCH meeting with john`,
        twilioClient
      );
      await updateLastMessageDate(normalizedFrom);
      break;
  }
}

/**
 * CommandHandler export for registration
 */
export const gmailCommandHandler: import('./types.js').CommandHandler = {
  name: 'gmail',
  matches(context: CommandContext): boolean {
    return context.messageUpper.startsWith(GMAIL_PREFIX);
  },
  async handle(context: CommandContext): Promise<boolean> {
    await handleGmail(context.message, context);
    return true;
  },
};
