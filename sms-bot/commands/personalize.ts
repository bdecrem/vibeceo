/**
 * PERSONALIZE Command - Natural language personalization
 *
 * Usage:
 *   PERSONALIZE {freeform text about yourself}
 *   PERSONALIZE SHOW - View current personalization
 *   PERSONALIZE CLEAR - Reset personalization
 *
 * Examples:
 *   "PERSONALIZE I'm Sarah, interested in machine learning and robotics. SF Bay Area, PST timezone"
 *   "PERSONALIZE My name is Alex. I'm a crypto trader in NYC. Love DeFi and NFTs."
 *   "PERSONALIZE Call me Jay. Research scientist working on transformers. UTC+1"
 */

import type { CommandContext } from './types.js';
import { getSubscriber } from '../lib/subscribers.js';
import { supabase } from '../lib/supabase.js';
import { extractPersonalization, formatExtracted } from '../lib/personalization-extractor.js';

const PERSONALIZE_PREFIX = 'PERSONALIZE';

/**
 * Handle PERSONALIZE command
 */
async function handlePersonalize(
  message: string,
  context: CommandContext
): Promise<void> {
  const { from, normalizedFrom, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  // Remove "PERSONALIZE" prefix
  const content = message.slice(PERSONALIZE_PREFIX.length).trim();

  // Get subscriber
  const subscriber = await getSubscriber(normalizedFrom);
  if (!subscriber) {
    await sendSmsResponse(from, '❌ Subscriber not found', twilioClient);
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  // Handle SHOW command
  if (content.toUpperCase() === 'SHOW') {
    const personalization = subscriber.personalization || {};

    if (Object.keys(personalization).length === 0) {
      await sendSmsResponse(
        from,
        `📋 No personalization set yet.\n\nTry:\nPERSONALIZE {tell me about yourself}`,
        twilioClient
      );
    } else {
      let response = '📋 Your Personalization:\n\n';

      if (personalization.name) response += `Name: ${personalization.name}\n`;
      if (personalization.interests && personalization.interests.length > 0) {
        response += `Interests: ${personalization.interests.join(', ')}\n`;
      }
      if (personalization.location) response += `Location: ${personalization.location}\n`;
      if (personalization.timezone) response += `Timezone: ${personalization.timezone}\n`;
      if (personalization.notes) response += `Notes: ${personalization.notes}\n`;

      response += `\n💡 Update: PERSONALIZE {new info}\n💡 Clear: PERSONALIZE CLEAR`;

      await sendSmsResponse(from, response, twilioClient);
    }

    await updateLastMessageDate(normalizedFrom);
    return;
  }

  // Handle CLEAR command
  if (content.toUpperCase() === 'CLEAR') {
    await supabase
      .from('sms_subscribers')
      .update({ personalization: {} })
      .eq('id', subscriber.id);

    await sendSmsResponse(
      from,
      '✅ Personalization cleared\n\nSet new: PERSONALIZE {info}',
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  // Handle empty content
  if (!content) {
    await sendSmsResponse(
      from,
      `📋 PERSONALIZE Command\n\nUsage:\nPERSONALIZE {tell me about yourself}\n\nExamples:\n• "PERSONALIZE I'm Sarah, into ML and robotics. SF, PST"\n• "PERSONALIZE My name is Alex. Crypto trader in NYC"\n\nCommands:\n• PERSONALIZE SHOW - View current\n• PERSONALIZE CLEAR - Reset`,
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
    return;
  }

  // Extract personalization from natural language
  try {
    console.log(`[Personalize] Extracting from: "${content}"`);

    const extracted = await extractPersonalization(content);

    console.log(`[Personalize] Extracted:`, JSON.stringify(extracted));

    // Merge with existing personalization
    const currentPersonalization = subscriber.personalization || {};

    // Smart merge: concatenate arrays, override other fields
    const merged: any = { ...currentPersonalization };

    for (const [key, value] of Object.entries(extracted)) {
      if (Array.isArray(value) && Array.isArray(merged[key])) {
        // Merge arrays, removing duplicates
        merged[key] = [...new Set([...merged[key], ...value])];
      } else {
        // Override non-array fields
        merged[key] = value;
      }
    }

    // Update subscriber
    await supabase
      .from('sms_subscribers')
      .update({ personalization: merged })
      .eq('id', subscriber.id);

    // Build confirmation message
    const confirmation = `✅ Personalization updated!\n\n${formatExtracted(extracted)}\n\n💡 View: PERSONALIZE SHOW\n💡 Update: PERSONALIZE {new info}`;

    await sendSmsResponse(from, confirmation, twilioClient);
    await updateLastMessageDate(normalizedFrom);

  } catch (error) {
    console.error('[Personalize] Extraction failed:', error);
    await sendSmsResponse(
      from,
      '❌ Failed to process personalization. Try again with clearer info.',
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
  }
}

/**
 * CommandHandler export for registration
 */
export const personalizeCommandHandler: import('./types.js').CommandHandler = {
  name: 'personalize',
  matches(context: CommandContext): boolean {
    return context.messageUpper.startsWith(PERSONALIZE_PREFIX);
  },
  async handle(context: CommandContext): Promise<boolean> {
    await handlePersonalize(context.message, context);
    return true;
  },
};
