/**
 * SMS Command Handler for Tokenshots Agent
 *
 * Handles all TOKENSHOTS commands for the daily AI research podcast
 *
 * Commands:
 * - TOKENSHOTS or TOKENSHOTS REPORT - Get latest episode links
 * - TOKENSHOTS RUN - Admin only, trigger fresh run
 * - TOKENSHOTS SUBSCRIBE - Subscribe to daily broadcasts
 * - TOKENSHOTS UNSUBSCRIBE - Unsubscribe from daily broadcasts
 * - TOKENSHOTS HELP - Show help
 */

import {
  TOKENSHOTS_AGENT_SLUG,
  buildTokenshotsMessage,
  getLatestStoredTokenshotsReport,
  runAndStoreTokenshotsReport,
} from '../agents/tokenshots/index.js';
import {
  isSubscribedToAgent,
  subscribeToAgent,
  unsubscribeFromAgent,
} from '../lib/agent-subscriptions.js';
import type { CommandContext, CommandHandler } from './types.js';

const ADMIN_PHONE = '+16508989508';

// ============================================================================
// Command Parsing
// ============================================================================

function parseTokenshotsCommand(messageUpper: string): {
  subcommand: string;
  args: string[];
} {
  const trimmed = messageUpper.trim();

  // Just "TOKENSHOTS" with no args
  if (trimmed === 'TOKENSHOTS') {
    return { subcommand: 'REPORT', args: [] };
  }

  // Must start with "TOKENSHOTS "
  if (!trimmed.startsWith('TOKENSHOTS ')) {
    return { subcommand: '', args: [] };
  }

  // Strip the prefix
  const remainder = trimmed.slice('TOKENSHOTS '.length).trim();

  if (!remainder) {
    return { subcommand: 'REPORT', args: [] };
  }

  const parts = remainder.split(/\s+/);
  const subcommand = parts[0] ?? 'REPORT';
  const args = parts.slice(1);

  return { subcommand, args };
}

// ============================================================================
// Command Handlers
// ============================================================================

async function handleReport(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  try {
    const latest = await getLatestStoredTokenshotsReport();

    if (!latest) {
      await sendSmsResponse(
        from,
        'No Tokenshots episode available yet. Text TOKENSHOTS SUBSCRIBE to get daily episodes.',
        twilioClient
      );
      return true;
    }

    const message = await buildTokenshotsMessage(latest, context.normalizedFrom);
    await sendSmsResponse(from, message, twilioClient);
  } catch (error) {
    console.error('Failed to fetch latest Tokenshots report:', error);
    await sendSmsResponse(
      from,
      'Could not load the latest Tokenshots episode. Try again soon.',
      twilioClient
    );
  } finally {
    await updateLastMessageDate(context.normalizedFrom);
  }

  return true;
}

async function handleRun(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  // Restrict to admin only
  if (context.normalizedFrom !== ADMIN_PHONE) {
    await sendSmsResponse(
      from,
      'This command is admin-only.',
      twilioClient
    );
    await updateLastMessageDate(context.normalizedFrom);
    return true;
  }

  await sendSmsResponse(
    from,
    'Generating a fresh Tokenshots episode. This may take several minutes. I\'ll text you when it\'s ready.',
    twilioClient
  );

  try {
    const metadata = await runAndStoreTokenshotsReport();
    const message = await buildTokenshotsMessage(metadata, context.normalizedFrom);
    await sendSmsResponse(from, message, twilioClient);
  } catch (error) {
    console.error('Failed to run Tokenshots pipeline:', error);
    await sendSmsResponse(
      from,
      'Episode generation failed. Check logs for details.',
      twilioClient
    );
  } finally {
    await updateLastMessageDate(context.normalizedFrom);
  }

  return true;
}

async function handleSubscribe(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate, normalizedFrom } = context;

  try {
    const alreadySubscribed = await isSubscribedToAgent(normalizedFrom, TOKENSHOTS_AGENT_SLUG);

    if (alreadySubscribed) {
      await sendSmsResponse(
        from,
        'You\'re already subscribed to Tokenshots daily episodes.',
        twilioClient
      );
    } else {
      await subscribeToAgent(normalizedFrom, TOKENSHOTS_AGENT_SLUG);
      await sendSmsResponse(
        from,
        'Subscribed! You\'ll receive Tokenshots daily at 6:30 AM PT.\n\nAI research highlights with venture & scrappy business angles.\n\nText TOKENSHOTS UNSUBSCRIBE to stop.',
        twilioClient
      );
    }
  } catch (error) {
    console.error('Failed to subscribe to Tokenshots:', error);
    await sendSmsResponse(
      from,
      'Subscription failed. Try again later.',
      twilioClient
    );
  } finally {
    await updateLastMessageDate(context.normalizedFrom);
  }

  return true;
}

async function handleUnsubscribe(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate, normalizedFrom } = context;

  try {
    const wasSubscribed = await isSubscribedToAgent(normalizedFrom, TOKENSHOTS_AGENT_SLUG);

    if (!wasSubscribed) {
      await sendSmsResponse(
        from,
        'You\'re not currently subscribed to Tokenshots.',
        twilioClient
      );
    } else {
      await unsubscribeFromAgent(normalizedFrom, TOKENSHOTS_AGENT_SLUG);
      await sendSmsResponse(
        from,
        'Unsubscribed from Tokenshots.\n\nYou can re-subscribe anytime with TOKENSHOTS SUBSCRIBE.',
        twilioClient
      );
    }
  } catch (error) {
    console.error('Failed to unsubscribe from Tokenshots:', error);
    await sendSmsResponse(
      from,
      'Unsubscribe failed. Try again later.',
      twilioClient
    );
  } finally {
    await updateLastMessageDate(context.normalizedFrom);
  }

  return true;
}

async function handleHelp(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  const helpMessage = `Tokenshots - Daily AI Research Intelligence

TOKENSHOTS or TOKENSHOTS REPORT
  Get today's episode with report & audio links

TOKENSHOTS SUBSCRIBE
  Get daily episodes at 6:30 AM PT

TOKENSHOTS UNSUBSCRIBE
  Stop daily episodes

Each episode covers 4 AI research highlights with:
- Venture perspective (how to monetize)
- Scrappy perspective (build it yourself)

Powered by arXiv, Hacker News & Reddit research.`;

  await sendSmsResponse(from, helpMessage, twilioClient);
  await updateLastMessageDate(context.normalizedFrom);

  return true;
}

// ============================================================================
// Main Command Handler
// ============================================================================

export const tokenshotsCommandHandler: CommandHandler = {
  name: 'tokenshots',
  matches(context: CommandContext): boolean {
    const upper = context.messageUpper;
    return upper === 'TOKENSHOTS' || upper.startsWith('TOKENSHOTS ');
  },
  async handle(context: CommandContext): Promise<boolean> {
    const messageUpper = context.message.trim().toUpperCase();
    const { subcommand } = parseTokenshotsCommand(messageUpper);

    switch (subcommand) {
      case 'REPORT':
        return handleReport(context);

      case 'RUN':
        return handleRun(context);

      case 'SUBSCRIBE':
        return handleSubscribe(context);

      case 'UNSUBSCRIBE':
      case 'STOP':
        return handleUnsubscribe(context);

      case 'HELP':
        return handleHelp(context);

      default:
        // Unknown subcommand, show help
        return handleHelp(context);
    }
  },
};

export default tokenshotsCommandHandler;
