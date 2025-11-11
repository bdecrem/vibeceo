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

import Anthropic from '@anthropic-ai/sdk';
import type { CommandContext } from './types.js';
import { getSubscriber } from '../lib/subscribers.js';
import { supabase } from '../lib/supabase.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const PERSONALIZE_PREFIX = 'PERSONALIZE';

/**
 * Extract structured personalization from natural language
 */
async function extractPersonalization(text: string): Promise<{
  name?: string;
  interests?: string[];
  timezone?: string;
  location?: string;
  notes?: string;
}> {
  const systemPrompt = `You are a personalization extractor. Given natural language text about a person, extract structured data.

Extract these fields (leave undefined if not mentioned):
- name: Their name/nickname
- interests: Array of interests/topics (lowercase, concise)
- timezone: Timezone (e.g., "PST", "UTC", "EST", "UTC+1")
- location: City/region (e.g., "San Francisco", "NYC", "London")
- notes: Any other relevant info not captured above

Examples:

Input: "I'm Sarah, interested in machine learning and robotics. SF Bay Area, PST timezone"
Output: {"name": "Sarah", "interests": ["machine learning", "robotics"], "timezone": "PST", "location": "SF Bay Area"}

Input: "My name is Alex. I'm a crypto trader in NYC. Love DeFi and NFTs."
Output: {"name": "Alex", "interests": ["crypto trading", "defi", "nfts"], "location": "NYC"}

Input: "Call me Jay. Research scientist working on transformers. UTC+1"
Output: {"name": "Jay", "interests": ["research", "transformers"], "timezone": "UTC+1"}

Respond with ONLY valid JSON, no explanation.`;

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 500,
    temperature: 0,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: text,
      },
    ],
  });

  const textContent = response.content.find((c) => c.type === 'text');
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  // Parse JSON response
  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }

  return JSON.parse(jsonMatch[0]);
}

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
    const merged = {
      ...currentPersonalization,
      ...extracted,
    };

    // Update subscriber
    await supabase
      .from('sms_subscribers')
      .update({ personalization: merged })
      .eq('id', subscriber.id);

    // Build confirmation message
    let confirmation = '✅ Personalization updated!\n\n';

    if (extracted.name) confirmation += `Name: ${extracted.name}\n`;
    if (extracted.interests && extracted.interests.length > 0) {
      confirmation += `Interests: ${extracted.interests.join(', ')}\n`;
    }
    if (extracted.location) confirmation += `Location: ${extracted.location}\n`;
    if (extracted.timezone) confirmation += `Timezone: ${extracted.timezone}\n`;
    if (extracted.notes) confirmation += `Notes: ${extracted.notes}\n`;

    confirmation += `\n💡 View: PERSONALIZE SHOW\n💡 Update: PERSONALIZE {new info}`;

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
