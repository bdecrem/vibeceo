import { CommandContext } from '../lib/command-dispatcher.js';
import { supabase } from '../lib/supabase-client.js';

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
export default async function handleIncubatorCommand(context: CommandContext): Promise<void> {
  const { args, subscriberProfile } = context;

  // Check for minimum required arguments
  if (!args || args.length < 2) {
    await context.sendResponse(
      'Usage: incubator [agent-id] [message]\n\n' +
      'Examples:\n' +
      '  incubator i1 done, took 20 minutes\n' +
      '  incubator i1 finished updating env variables\n' +
      '  incubator i3-2 still working on this'
    );
    return;
  }

  // Parse: incubator i1 done, took 20 minutes
  //        ^command  ^args[0] ^args[1..]
  const agentId = args[0];
  const message = args.slice(1).join(' ');

  // Validate agent ID format (i1, i2, i3-1, i3-2, etc.)
  if (!agentId.match(/^i\d+(-\d+)?$/)) {
    await context.sendResponse(`Invalid agent ID: ${agentId}\n\nExpected format: i1, i2, i3-1, etc.`);
    return;
  }

  // Parse for completion and time
  const isDone = /done|complete|finished/i.test(message);
  let actualMinutes: number | null = null;

  if (isDone) {
    // Extract time: "took 20 minutes", "took 1 hour", "took 30"
    const timeMatch = message.match(/(?:took|spent)\s+(\d+\.?\d*)\s*(min|minute|minutes|hour|hours|hr|hrs)?/i);

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
      content: message,
      tags: isDone ? ['human-reply', 'completed'] : ['human-reply', 'update'],
      context: {
        completed: isDone,
        actual_minutes: actualMinutes,
        replied_by: subscriberProfile.phone_number,
        replied_at: new Date().toISOString()
      }
    });

  if (error) {
    console.error('Failed to write human reply to database:', error);
    await context.sendResponse(`Error: Failed to send message to ${agentId}\n\n${error.message}`);
    return;
  }

  // Confirm to human
  const confirmationParts = [`✅ Message sent to ${agentId}`];

  if (actualMinutes) {
    confirmationParts.push(`⏱️ Logged ${actualMinutes} minutes`);
  }

  await context.sendResponse(confirmationParts.join('\n'));
}
