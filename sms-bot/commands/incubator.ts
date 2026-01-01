import type { CommandContext, CommandHandler } from './types.js';
import { supabase } from '../lib/supabase.js';
import { matchesPrefix } from './command-utils.js';

/**
 * Handle human replies to agent assistance requests.
 *
 * Usage: incubator [agent-id] [message]
 *
 * Examples:
 *   incubator i1 done, took 20 minutes
 *   incubator i1 finished updating env variables
 *   incubator i3-2 still working on this
 *
 * The message is written to incubator_messages table where the agent
 * will read it on their next startup.
 */

function parseIncubatorCommand(message: string): { agentId: string | null; userMessage: string | null } {
  // Remove "incubator" prefix (case insensitive)
  const withoutPrefix = message.replace(/^incubator\s+/i, '').trim();

  // Split into parts
  const parts = withoutPrefix.split(/\s+/);

  if (parts.length < 2) {
    return { agentId: null, userMessage: null };
  }

  const agentId = parts[0];
  const userMessage = parts.slice(1).join(' ');

  return { agentId, userMessage };
}

async function handleIncubator(context: CommandContext): Promise<boolean> {
  const { from, message, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  const { agentId, userMessage } = parseIncubatorCommand(message);

  // Check for minimum required arguments
  if (!agentId || !userMessage) {
    await sendSmsResponse(
      from,
      'Usage: incubator [agent-id] [message]\n\n' +
      'Examples:\n' +
      '  incubator i1 done, took 20 minutes\n' +
      '  incubator i1 finished updating env variables\n' +
      '  incubator i3-2 still working on this',
      twilioClient
    );
    await updateLastMessageDate(context.normalizedFrom);
    return true;
  }

  // Validate agent ID format (i1, i2, i3-1, i3-2, etc.)
  if (!agentId.match(/^i\d+(-\d+)?$/)) {
    await sendSmsResponse(
      from,
      `Invalid agent ID: ${agentId}\n\nExpected format: i1, i2, i3-1, etc.`,
      twilioClient
    );
    await updateLastMessageDate(context.normalizedFrom);
    return true;
  }

  // Parse for completion and time
  const isDone = /done|complete|finished/i.test(userMessage);
  let actualMinutes: number | null = null;

  if (isDone) {
    // Extract time: "took 20 minutes", "took 1 hour", "took 30"
    const timeMatch = userMessage.match(/(?:took|spent)\s+(\d+\.?\d*)\s*(min|minute|minutes|hour|hours|hr|hrs)?/i);

    if (timeMatch) {
      const value = parseFloat(timeMatch[1]);
      const unit = timeMatch[2]?.toLowerCase() || 'minutes';

      // Convert to minutes
      if (unit.startsWith('hour') || unit.startsWith('hr')) {
        actualMinutes = Math.round(value * 60);
      } else {
        actualMinutes = Math.round(value);
      }
    }
  }

  // Write to incubator_messages table
  const { error } = await supabase
    .from('incubator_messages')
    .insert({
      agent_id: agentId,
      scope: 'HUMAN_REPLY',
      type: 'human_message',
      content: userMessage,
      tags: isDone ? ['human-reply', 'completed'] : ['human-reply', 'update'],
      context: {
        completed: isDone,
        actual_minutes: actualMinutes,
        replied_by: from,
        replied_at: new Date().toISOString()
      }
    });

  if (error) {
    console.error('Failed to write human reply to database:', error);
    await sendSmsResponse(
      from,
      `Error: Failed to send message to ${agentId}\n\n${error.message}`,
      twilioClient
    );
    await updateLastMessageDate(context.normalizedFrom);
    return true;
  }

  // Confirm to human
  const confirmationParts = [`✅ Message sent to ${agentId}`];

  if (actualMinutes) {
    confirmationParts.push(`⏱️ Logged ${actualMinutes} minutes`);
  }

  await sendSmsResponse(from, confirmationParts.join('\n'), twilioClient);
  await updateLastMessageDate(context.normalizedFrom);
  return true;
}

export const incubatorCommandHandler: CommandHandler = {
  name: 'incubator',
  matches(context) {
    return matchesPrefix(context.messageUpper, 'INCUBATOR');
  },
  async handle(context) {
    return handleIncubator(context);
  },
};
