/**
 * AIR (AI Research) Command Handler
 *
 * Commands can use "AIR" or "AI RESEARCH" - we normalize to "AIR" in responses
 *
 * Commands:
 * - AIR                          → Today's report (broadcast or personalized)
 * - AIR {natural language}       → Subscribe with query
 * - AIR TIME HH:MM               → Change notification time
 * - AIR SETTINGS                 → View settings
 * - AIR HELP                     → Show command reference
 * - AIR STOP                     → Unsubscribe
 */

import { supabase } from '../lib/supabase.js';
import {
  isSubscribedToAgent,
  subscribeToAgent,
  unsubscribeFromAgent,
} from '../lib/agent-subscriptions.js';
import { getSubscriber } from '../lib/subscribers.js';
import {
  AIR_AGENT_SLUG,
  getLatestPersonalizedReport,
  buildAIRReportMessage,
  type AIRPreferences,
} from '../agents/air-personalized/index.js';
import {
  getLatestStoredArxivGraphReport,
  buildArxivReportMessage,
} from '../agents/arxiv-research-graph/index.js';
import type { CommandContext } from './types.js';

const AIR_PREFIX = 'AIR';
const AI_RESEARCH_PREFIX = 'AI RESEARCH';

/**
 * Parse AIR command and extract subcommand + args
 */
function parseAIRCommand(messageUpper: string): { subcommand: string; args: string } {
  const trimmed = messageUpper.trim();
  let remainder = '';

  if (trimmed.startsWith(AI_RESEARCH_PREFIX)) {
    remainder = trimmed.slice(AI_RESEARCH_PREFIX.length).trim();
  } else if (trimmed.startsWith(AIR_PREFIX)) {
    remainder = trimmed.slice(AIR_PREFIX.length).trim();
  } else {
    return { subcommand: '', args: '' };
  }

  // AIR alone = REPORT command
  if (!remainder) {
    return { subcommand: 'REPORT', args: '' };
  }

  // Check for known subcommands
  const knownCommands = ['TIME', 'SETTINGS', 'HELP', 'STOP', 'UNSUBSCRIBE'];
  const firstWord = remainder.split(' ')[0];

  if (knownCommands.includes(firstWord)) {
    const args = remainder.slice(firstWord.length).trim();
    return { subcommand: firstWord, args };
  }

  // Otherwise, treat entire remainder as natural language query
  return { subcommand: 'QUERY', args: remainder };
}

/**
 * Handle: AIR (show today's report)
 */
async function handleGetReport(context: CommandContext): Promise<void> {
  const { from, normalizedFrom, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  // Check if user is subscribed to AIR
  const isSubscribed = await isSubscribedToAgent(normalizedFrom, AIR_AGENT_SLUG);

  if (!isSubscribed) {
    // Return arxiv-graph broadcast report + personalization prompt
    const broadcastReport = await getLatestStoredArxivGraphReport();

    if (broadcastReport) {
      const reportMessage = await buildArxivReportMessage(
        broadcastReport.summary,
        broadcastReport.date,
        broadcastReport.reportPath,
        'arxiv-graph',
        broadcastReport.podcast?.shortLink
      );
      const prompt = `\n\n💡 Want this personalized?\nTry: AIR give me papers about {your topic}\n\nNeed help? Text: AIR HELP`;

      await sendSmsResponse(from, reportMessage + prompt, twilioClient);
    } else {
      await sendSmsResponse(
        from,
        `📊 No AI research report available yet.\n\n💡 Get personalized daily reports:\nAIR {your research interest}\n\nExample: AIR physical ai\n\nHelp: AIR HELP`,
        twilioClient
      );
    }

    await updateLastMessageDate(normalizedFrom);
    return;
  }

  // User is subscribed - return their personalized report
  const subscriber = await getSubscriber(normalizedFrom);
  if (!subscriber) {
    await sendSmsResponse(from, `❌ Subscriber not found`, twilioClient);
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  const report = await getLatestPersonalizedReport(subscriber.id);

  if (!report) {
    await sendSmsResponse(
      from,
      `⏳ Your first report will arrive tomorrow morning.\n\nIn the meantime, try:\nKG {question} - Ask about today's AI papers\n\nSettings: AIR SETTINGS`,
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  // TODO: Generate short link for report
  const shortLink = null;
  const message = buildAIRReportMessage(report, shortLink);

  await sendSmsResponse(from, message, twilioClient);
  await updateLastMessageDate(normalizedFrom);
}

/**
 * Handle: AIR {natural language query}
 */
async function handleSubscribeWithQuery(
  context: CommandContext,
  query: string
): Promise<void> {
  const { from, normalizedFrom, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  console.log(`[AIR] Subscribe request: "${query}"`);

  try {
    // Subscribe to agent
    const result = await subscribeToAgent(normalizedFrom, AIR_AGENT_SLUG);

    const subscriber = await getSubscriber(normalizedFrom);
    if (!subscriber) {
      await sendSmsResponse(from, `❌ Failed to create subscription`, twilioClient);
      await updateLastMessageDate(normalizedFrom);
      return;
    }

    // Store natural language query in preferences
    const preferences: AIRPreferences = {
      natural_language_query: query,
      notification_time: '06:00', // Default 6 AM PT
    };

    await supabase
      .from('agent_subscriptions')
      .update({ preferences })
      .eq('subscriber_id', subscriber.id)
      .eq('agent_slug', AIR_AGENT_SLUG);

    // Build confirmation message
    let message = '';

    if (result === 'already') {
      message = `✅ AIR query updated!\n\n`;
    } else {
      message = `✅ AIR activated!\n\n`;
    }

    message += `Query: "${query}"\n`;
    message += `Time: 6:00 AM PT\n\n`;
    message += `📧 Your first report arrives tomorrow morning\n\n`;
    message += `Commands:\n`;
    message += `• AIR TIME 08:00 - Change time\n`;
    message += `• AIR SETTINGS - View settings\n`;
    message += `• KG {question} - Ask about papers\n`;
    message += `• AIR HELP - Full command list`;

    await sendSmsResponse(from, message, twilioClient);
    await updateLastMessageDate(normalizedFrom);
  } catch (error) {
    console.error('[AIR] Subscribe failed:', error);
    await sendSmsResponse(from, `❌ Subscription failed. Please try again.`, twilioClient);
    await updateLastMessageDate(normalizedFrom);
  }
}

/**
 * Handle: AIR TIME HH:MM
 */
async function handleSetTime(context: CommandContext, timeStr: string): Promise<void> {
  const { from, normalizedFrom, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  // Validate time format (HH:MM)
  const timeMatch = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!timeMatch) {
    await sendSmsResponse(
      from,
      `❌ Invalid time format\n\nUse: AIR TIME HH:MM\nExample: AIR TIME 08:00`,
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  const [, hourStr, minuteStr] = timeMatch;
  const hour = parseInt(hourStr, 10);
  const minute = parseInt(minuteStr, 10);

  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    await sendSmsResponse(
      from,
      `❌ Invalid time\n\nHour must be 0-23\nMinute must be 0-59\n\nExample: AIR TIME 08:00`,
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  const formattedTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;

  // Update preferences
  const subscriber = await getSubscriber(normalizedFrom);
  if (!subscriber) {
    await sendSmsResponse(from, `❌ Subscriber not found`, twilioClient);
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  const { data: subscription } = await supabase
    .from('agent_subscriptions')
    .select('preferences')
    .eq('subscriber_id', subscriber.id)
    .eq('agent_slug', AIR_AGENT_SLUG)
    .single();

  if (!subscription) {
    await sendSmsResponse(
      from,
      `❌ Not subscribed to AIR\n\nSubscribe: AIR {your research interest}`,
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  const preferences = (subscription.preferences || {}) as AIRPreferences;
  preferences.notification_time = formattedTime;

  await supabase
    .from('agent_subscriptions')
    .update({ preferences })
    .eq('subscriber_id', subscriber.id)
    .eq('agent_slug', AIR_AGENT_SLUG);

  await sendSmsResponse(
    from,
    `✅ Delivery time updated\n\n⏰ Reports will arrive at ${formattedTime} PT`,
    twilioClient
  );
  await updateLastMessageDate(normalizedFrom);
}

/**
 * Handle: AIR SETTINGS
 */
async function handleShowSettings(context: CommandContext): Promise<void> {
  const { from, normalizedFrom, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  const subscriber = await getSubscriber(normalizedFrom);
  if (!subscriber) {
    await sendSmsResponse(from, `❌ Subscriber not found`, twilioClient);
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  const { data: subscription } = await supabase
    .from('agent_subscriptions')
    .select('preferences, last_sent_at')
    .eq('subscriber_id', subscriber.id)
    .eq('agent_slug', AIR_AGENT_SLUG)
    .eq('active', true)
    .single();

  if (!subscription) {
    await sendSmsResponse(
      from,
      `📊 AIR Settings\n\nStatus: Not subscribed\n\nSubscribe: AIR {your research interest}\nExample: AIR physical ai\n\nHelp: AIR HELP`,
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  const prefs = (subscription.preferences || {}) as AIRPreferences;
  const lastSent = subscription.last_sent_at
    ? new Date(subscription.last_sent_at).toLocaleDateString()
    : 'Never';

  let message = `📊 Your AIR Settings\n\n`;
  message += `Query: "${prefs.natural_language_query || 'Not set'}"\n`;
  message += `Time: ${prefs.notification_time || '06:00'} PT\n`;
  message += `Status: Active\n`;
  message += `Last report: ${lastSent}\n\n`;
  message += `Commands:\n`;
  message += `• AIR TIME 08:00 - Change time\n`;
  message += `• AIR {new query} - Update query\n`;
  message += `• AIR STOP - Unsubscribe\n`;
  message += `• AIR HELP - Full command list`;

  await sendSmsResponse(from, message, twilioClient);
  await updateLastMessageDate(normalizedFrom);
}

/**
 * Handle: AIR HELP
 */
async function handleHelp(context: CommandContext): Promise<void> {
  const { from, normalizedFrom, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  const message = `📊 AIR (AI Research) Commands

GET REPORTS:
• AIR - Today's report
• AIR {query} - Personalized daily reports
  Example: AIR physical ai

CUSTOMIZE:
• AIR TIME 08:00 - Change delivery time
• AIR SETTINGS - View your settings
• AIR STOP - Unsubscribe

INTERACTIVE:
• KG {question} - Chat about today's papers
  Example: KG tell me more about paper 3

💡 AIR = automated daily reports
💡 KG = interactive Q&A

Questions? Just ask!`;

  await sendSmsResponse(from, message, twilioClient);
  await updateLastMessageDate(normalizedFrom);
}

/**
 * Handle: AIR STOP / AIR UNSUBSCRIBE
 */
async function handleUnsubscribe(context: CommandContext): Promise<void> {
  const { from, normalizedFrom, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  const result = await unsubscribeFromAgent(normalizedFrom, AIR_AGENT_SLUG);

  if (result === 'not_subscribed') {
    await sendSmsResponse(
      from,
      `ℹ️ You're not subscribed to AIR\n\nSubscribe: AIR {your research interest}\nExample: AIR physical ai`,
      twilioClient
    );
  } else if (result === 'unsubscribed') {
    await sendSmsResponse(
      from,
      `✅ AIR reports stopped\n\nResubscribe anytime: AIR {query}\nExample: AIR physical ai\n\nHelp: AIR HELP`,
      twilioClient
    );
  } else {
    await sendSmsResponse(from, `❌ Failed to unsubscribe. Please try again.`, twilioClient);
  }

  await updateLastMessageDate(normalizedFrom);
}

/**
 * Main AIR command handler
 */
export async function handleAIRCommand(
  message: string,
  context: CommandContext
): Promise<void> {
  const messageUpper = message.toUpperCase();
  const { subcommand, args } = parseAIRCommand(messageUpper);

  console.log(`[AIR] Command: ${subcommand}, Args: "${args}"`);

  switch (subcommand) {
    case 'REPORT':
      await handleGetReport(context);
      break;

    case 'QUERY':
      await handleSubscribeWithQuery(context, args);
      break;

    case 'TIME':
      await handleSetTime(context, args);
      break;

    case 'SETTINGS':
      await handleShowSettings(context);
      break;

    case 'HELP':
      await handleHelp(context);
      break;

    case 'STOP':
    case 'UNSUBSCRIBE':
      await handleUnsubscribe(context);
      break;

    default:
      await context.sendSmsResponse(
        context.from,
        `❌ Unknown AIR command\n\nHelp: AIR HELP`,
        context.twilioClient
      );
      await context.updateLastMessageDate(context.normalizedFrom);
  }
}

/**
 * CommandHandler export for registration
 */
export const airCommandHandler: import('./types.js').CommandHandler = {
  name: 'air',
  matches(context: CommandContext): boolean {
    const msgUpper = context.messageUpper.trim();
    return msgUpper.startsWith('AIR') || msgUpper.startsWith('AI RESEARCH');
  },
  async handle(context: CommandContext): Promise<boolean> {
    await handleAIRCommand(context.message, context);
    return true; // Command was handled
  },
};
