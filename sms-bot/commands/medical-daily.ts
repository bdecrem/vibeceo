import {
  MEDICAL_AGENT_SLUG,
  buildMedicalDailyMessage,
  getLatestStoredMedicalReport,
  runAndStoreMedicalDailyReport,
  type MedicalDailyArticle,
  type MedicalDailyDetails,
  type MedicalDailyReport,
} from '../agents/medical-daily/index.js';
import {
  isSubscribedToAgent,
  subscribeToAgent,
  unsubscribeFromAgent,
} from '../lib/agent-subscriptions.js';
import type { CommandContext, CommandHandler } from './types.js';
import { matchesPrefix, normalizeCommandPrefix } from './command-utils.js';

const ADMIN_PHONE = '+16508989508';

interface ParsedCommand {
  subcommand: string;
  args: string[];
}

const PRIMARY_PREFIX = 'MEDICAL';
const SHORT_PREFIX = 'MD';
const LEGACY_SECOND_WORD = 'DAILY';

type SubscribeResult = Awaited<ReturnType<typeof subscribeToAgent>>;
type UnsubscribeResult = Awaited<ReturnType<typeof unsubscribeFromAgent>>;

function normalizeCommand(messageUpper: string): string {
  return messageUpper.replace(/\s+/g, ' ').trim();
}

function stripPrefix(normalized: string, prefix: string): string | null {
  // Normalize to handle punctuation like "MEDICAL," "MD!" etc.
  const cleanNormalized = normalizeCommandPrefix(normalized);

  if (cleanNormalized === prefix) {
    return '';
  }

  if (cleanNormalized.startsWith(`${prefix} `)) {
    return cleanNormalized.slice(prefix.length + 1);
  }

  return null;
}

function parseMedicalCommand(messageUpper: string): ParsedCommand {
  const normalized = normalizeCommand(messageUpper);

  const candidates = [PRIMARY_PREFIX, SHORT_PREFIX];
  for (const prefix of candidates) {
    const remainder = stripPrefix(normalized, prefix);
    if (remainder === null) {
      continue;
    }

    if (!remainder) {
      return { subcommand: 'REPORT', args: [] };
    }

    const parts = remainder.split(' ');
    let subcommand = parts[0] ?? 'REPORT';
    let args = parts.slice(1);

    if (prefix === PRIMARY_PREFIX && subcommand === LEGACY_SECOND_WORD) {
      subcommand = parts[1] ?? 'REPORT';
      args = parts.slice(2);
    }

    return { subcommand, args };
  }

  return { subcommand: 'REPORT', args: [] };
}

async function fetchLatestReport(): Promise<MedicalDailyReport | null> {
  try {
    return await getLatestStoredMedicalReport();
  } catch (error) {
    console.error('Failed to load Medical Daily report:', error);
    return null;
  }
}

async function handleReport(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate, normalizedFrom } =
    context;

  try {
    const latest = await fetchLatestReport();
    if (!latest) {
      await sendSmsResponse(
        from,
        'No Medical Daily report available yet. Please try again later.',
        twilioClient
      );
      return true;
    }

    const message = await buildMedicalDailyMessage(latest, normalizedFrom);
    await sendSmsResponse(from, message, twilioClient);
  } catch (error) {
    console.error('Medical Daily REPORT command failed:', error);
    await sendSmsResponse(
      from,
      'Unable to load the Medical Daily briefing right now. Please try again soon.',
      twilioClient
    );
  } finally {
    await updateLastMessageDate(normalizedFrom);
  }

  return true;
}

function formatLinksMessage(details: MedicalDailyDetails): string {
  const articles = details.articles ?? [];
  if (!articles.length) {
    return '';
  }

  const lines: string[] = ['Medical Daily sources:', ''];
  articles.forEach((article: MedicalDailyArticle, index: number) => {
    const title = article.title || `Story ${index + 1}`;
    lines.push(`${index + 1}. ${title}`);
    if (article.url) {
      lines.push(`   ${article.url}`);
    } else {
      lines.push('   (No link provided)');
    }
    lines.push('');
  });

  return lines.join('\n').trimEnd();
}

async function handleLinks(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendChunkedSmsResponse, sendSmsResponse, updateLastMessageDate, normalizedFrom } =
    context;

  try {
    const latest = await fetchLatestReport();
    const details = latest?.details;

    if (!details || !(details.articles && details.articles.length)) {
      await sendSmsResponse(
        from,
        'No source links are available for the latest Medical Daily briefing yet.',
        twilioClient
      );
      return true;
    }

    const message = formatLinksMessage(details);
    await sendChunkedSmsResponse(from, message, twilioClient);
  } catch (error) {
    console.error('Medical Daily LINKS command failed:', error);
    await sendSmsResponse(
      from,
      'Unable to load Medical Daily links right now. Please try again soon.',
      twilioClient
    );
  } finally {
    await updateLastMessageDate(normalizedFrom);
  }

  return true;
}

async function handleSubscribe(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate, normalizedFrom } =
    context;

  try {
    const result: SubscribeResult = await subscribeToAgent(normalizedFrom, MEDICAL_AGENT_SLUG);

    if (result === 'missing_subscriber') {
      await sendSmsResponse(
        from,
        'Text START to join the Foundry first, then send MD SUBSCRIBE.',
        twilioClient
      );
      return true;
    }

    if (result === 'already') {
      await sendSmsResponse(
        from,
        "You're already subscribed to Medical Daily. Text MD for the latest briefing.",
        twilioClient
      );
      return true;
    }

    if (result === 'error') {
      await sendSmsResponse(
        from,
        'We could not update your Medical Daily subscription. Please try again later.',
        twilioClient
      );
      return true;
    }

    await sendSmsResponse(
      from,
      "You're subscribed! I'll text you each morning with the Medical Daily briefing.",
      twilioClient
    );
  } catch (error) {
    console.error('Medical Daily SUBSCRIBE command failed:', error);
    await sendSmsResponse(
      from,
      'We could not update your Medical Daily subscription. Please try again later.',
      twilioClient
    );
  } finally {
    await updateLastMessageDate(normalizedFrom);
  }

  return true;
}

async function handleUnsubscribe(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate, normalizedFrom } =
    context;

  try {
    const already = await isSubscribedToAgent(normalizedFrom, MEDICAL_AGENT_SLUG);
    if (!already) {
      await sendSmsResponse(
        from,
        "You're not currently subscribed to Medical Daily.",
        twilioClient
      );
      return true;
    }

    const result: UnsubscribeResult = await unsubscribeFromAgent(
      normalizedFrom,
      MEDICAL_AGENT_SLUG
    );

    if (result === 'missing_subscriber') {
      await sendSmsResponse(
        from,
        'Text START to join the Foundry first, then send MD SUBSCRIBE if you want back in.',
        twilioClient
      );
      return true;
    }

    if (result === 'error') {
      await sendSmsResponse(
        from,
        'We could not update your Medical Daily subscription. Please try again later.',
        twilioClient
      );
      return true;
    }

    await sendSmsResponse(
      from,
      "You're unsubscribed from Medical Daily. Text MD SUBSCRIBE if you want to rejoin.",
      twilioClient
    );
  } catch (error) {
    console.error('Medical Daily UNSUBSCRIBE command failed:', error);
    await sendSmsResponse(
      from,
      'We could not update your Medical Daily subscription. Please try again later.',
      twilioClient
    );
  } finally {
    await updateLastMessageDate(normalizedFrom);
  }

  return true;
}

async function handleRun(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate, normalizedFrom } =
    context;

  if (normalizedFrom !== ADMIN_PHONE) {
    await sendSmsResponse(
      from,
      'This command is restricted to Bart.',
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
    return true;
  }

  await sendSmsResponse(
    from,
    'Generating a fresh Medical Daily briefing. I will text you when it is ready.',
    twilioClient
  );

  try {
    const metadata = await runAndStoreMedicalDailyReport();
    const message = await buildMedicalDailyMessage(metadata, normalizedFrom);
    await sendSmsResponse(from, message, twilioClient);
  } catch (error) {
    console.error('Medical Daily RUN command failed:', error);
    await sendSmsResponse(
      from,
      'Medical Daily agent could not generate a new briefing right now. Please try again later.',
      twilioClient
    );
  } finally {
    await updateLastMessageDate(normalizedFrom);
  }

  return true;
}

async function handleHelp(context: CommandContext): Promise<boolean> {
  const { from, twilioClient, sendSmsResponse, updateLastMessageDate, normalizedFrom } =
    context;

  const helpMessage = [
    'Medical Daily commands:',
    'MD — Latest briefing',
    'MD LINKS — Sources',
    'MD SUBSCRIBE — Daily updates',
    'MD UNSUBSCRIBE — Stop updates',
  ].join('\n');

  await sendSmsResponse(from, helpMessage, twilioClient);
  await updateLastMessageDate(normalizedFrom);
  return true;
}

export const medicalDailyCommandHandler: CommandHandler = {
  name: 'medical-daily',
  matches(context) {
    const upper = context.messageUpper;
    // Handle "MEDICAL", "MEDICAL,", "MD", "MD!", etc.
    return matchesPrefix(upper, PRIMARY_PREFIX) || matchesPrefix(upper, SHORT_PREFIX);
  },
  async handle(context) {
    const { subcommand, args } = parseMedicalCommand(context.messageUpper);

    switch (subcommand) {
      case 'HELP':
        return handleHelp(context);
      case 'LINKS':
        return handleLinks(context);
      case 'SUBSCRIBE':
        return handleSubscribe(context);
      case 'UNSUBSCRIBE':
      case 'STOP':
        return handleUnsubscribe(context);
      case 'RUN':
        return handleRun(context);
      case 'DAILY':
      case 'REPORT':
      default:
        return handleReport(context);
    }
  },
};
