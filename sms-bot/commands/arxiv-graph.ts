import {
  ARXIV_GRAPH_AGENT_SLUG,
  buildArxivReportMessage,
  getLatestStoredArxivGraphReport,
  runAndStoreArxivGraphReport,
} from '../agents/arxiv-research-graph/index.js';
import {
  isSubscribedToAgent,
  subscribeToAgent,
  unsubscribeFromAgent,
} from '../lib/agent-subscriptions.js';
import type { CommandContext, CommandHandler } from './types.js';

const ARXIV_GRAPH_PREFIX = 'ARXIV-GRAPH';
const ADMIN_PHONE = '+16508989508';

function parseArxivGraphCommand(messageUpper: string): {
  subcommand: string;
  args: string[];
} {
  const trimmed = messageUpper.trim();

  if (!trimmed.startsWith(ARXIV_GRAPH_PREFIX)) {
    return { subcommand: '', args: [] };
  }

  if (trimmed === ARXIV_GRAPH_PREFIX) {
    return { subcommand: 'REPORT', args: [] };
  }

  const remainder = trimmed.slice(ARXIV_GRAPH_PREFIX.length).trim();
  if (!remainder) {
    return { subcommand: 'REPORT', args: [] };
  }

  const parts = remainder.split(/\s+/);
  const subcommand = parts[0] ?? 'REPORT';
  const args = parts.slice(1);

  return { subcommand, args };
}

async function handleGraphReport(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  try {
    const latest = await getLatestStoredArxivGraphReport();

    if (!latest) {
      await sendSmsResponse(
        from,
        'No arXiv Graph report available yet. Text ARXIV-GRAPH RUN to generate one now.',
        twilioClient
      );
      return true;
    }

    const message = await buildArxivReportMessage(
      latest.summary,
      latest.date,
      latest.reportPath,
      context.normalizedFrom,
      latest.podcast?.shortLink || undefined
    );

    await sendSmsResponse(from, message, twilioClient);
  } catch (error) {
    console.error('Failed to fetch latest arXiv Graph report:', error);
    await sendSmsResponse(
      from,
      '❌ Could not load the latest arXiv Graph report. Try again soon.',
      twilioClient
    );
  } finally {
    await updateLastMessageDate(context.normalizedFrom);
  }

  return true;
}

async function handleGraphRun(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  if (context.normalizedFrom !== ADMIN_PHONE) {
    await sendSmsResponse(from, 'This command is limited to Bart.', twilioClient);
    await updateLastMessageDate(context.normalizedFrom);
    return true;
  }

  await sendSmsResponse(
    from,
    '📚 Generating a fresh arXiv Graph report. This will take a few minutes. I\'ll text you when it\'s ready.',
    twilioClient
  );

  try {
    const metadata = await runAndStoreArxivGraphReport();

    const message = await buildArxivReportMessage(
      metadata.summary,
      metadata.date,
      metadata.reportPath,
      context.normalizedFrom,
      metadata.podcast?.shortLink || undefined
    );

    await sendSmsResponse(from, message, twilioClient);
  } catch (error) {
    console.error('Failed to run arXiv Graph report:', error);
    await sendSmsResponse(
      from,
      '❌ Report generation failed. Check logs for details.',
      twilioClient
    );
  } finally {
    await updateLastMessageDate(context.normalizedFrom);
  }

  return true;
}

async function handleGraphSubscribe(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate, normalizedFrom } = context;

  try {
    const alreadySubscribed = await isSubscribedToAgent(normalizedFrom, ARXIV_GRAPH_AGENT_SLUG);

    if (alreadySubscribed) {
      await sendSmsResponse(
        from,
        '✅ You\'re already subscribed to the arXiv Graph daily digest.',
        twilioClient
      );
    } else {
      await subscribeToAgent(normalizedFrom, ARXIV_GRAPH_AGENT_SLUG);
      await sendSmsResponse(
        from,
        '✅ Subscribed! You\'ll receive the arXiv Graph digest every morning at 6 AM PT.\n\nText ARXIV-GRAPH UNSUBSCRIBE to stop.',
        twilioClient
      );
    }
  } catch (error) {
    console.error('Failed to subscribe to arXiv Graph:', error);
    await sendSmsResponse(
      from,
      '❌ Subscription failed. Try again later.',
      twilioClient
    );
  } finally {
    await updateLastMessageDate(context.normalizedFrom);
  }

  return true;
}

async function handleGraphUnsubscribe(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate, normalizedFrom } = context;

  try {
    const wasSubscribed = await isSubscribedToAgent(normalizedFrom, ARXIV_GRAPH_AGENT_SLUG);

    if (!wasSubscribed) {
      await sendSmsResponse(
        from,
        'You\'re not currently subscribed to the arXiv Graph digest.',
        twilioClient
      );
    } else {
      await unsubscribeFromAgent(normalizedFrom, ARXIV_GRAPH_AGENT_SLUG);
      await sendSmsResponse(
        from,
        '✅ Unsubscribed from the arXiv Graph daily digest.\n\nYou can re-subscribe anytime with ARXIV-GRAPH SUBSCRIBE.',
        twilioClient
      );
    }
  } catch (error) {
    console.error('Failed to unsubscribe from arXiv Graph:', error);
    await sendSmsResponse(
      from,
      '❌ Unsubscribe failed. Try again later.',
      twilioClient
    );
  } finally {
    await updateLastMessageDate(context.normalizedFrom);
  }

  return true;
}

async function handleGraphHelp(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  const helpMessage = `ARXIV-GRAPH commands:

ARXIV-GRAPH
  Get the latest graph-backed arXiv report

ARXIV-GRAPH RUN
  Regenerate the report now (admin only)

ARXIV-GRAPH SUBSCRIBE
  Get the daily graph digest at 6 AM PT

ARXIV-GRAPH UNSUBSCRIBE
  Stop the daily digest`;

  await sendSmsResponse(from, helpMessage, twilioClient);
  await updateLastMessageDate(context.normalizedFrom);

  return true;
}

export const arxivGraphCommandHandler: CommandHandler = {
  name: 'arxiv-graph',
  matches(context: CommandContext): boolean {
    return context.messageUpper.startsWith(ARXIV_GRAPH_PREFIX);
  },
  async handle(context: CommandContext): Promise<boolean> {
    const messageUpper = context.message.trim().toUpperCase();
    const { subcommand } = parseArxivGraphCommand(messageUpper);

    switch (subcommand) {
      case 'RUN':
        return handleGraphRun(context);

      case 'SUBSCRIBE':
        return handleGraphSubscribe(context);

      case 'UNSUBSCRIBE':
      case 'STOP':
        return handleGraphUnsubscribe(context);

      case 'HELP':
        return handleGraphHelp(context);

      case 'REPORT':
      default:
        return handleGraphReport(context);
    }
  },
};

export default arxivGraphCommandHandler;
