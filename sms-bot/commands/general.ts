/**
 * General Kochi Agent - Context-aware conversational assistant
 *
 * Handles non-research questions with full conversation awareness:
 * - Recent messages (12hr window)
 * - Active subscriptions + preferences
 * - User personalization (name, interests, etc.)
 */

import Anthropic from '@anthropic-ai/sdk';
import type { CommandContext } from './types.js';
import type { UserContext } from '../lib/context-loader.js';
import { storeMessage } from '../lib/context-loader.js';
import { getSubscriber } from '../lib/subscribers.js';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Handle general conversation using context-aware Claude
 */
export async function handleGeneralKochiAgent(
  context: CommandContext,
  userContext: UserContext
): Promise<void> {
  const { from, normalizedFrom, message, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  console.log(`[General Kochi] Processing message for ${normalizedFrom}`);

  // Build system prompt with full context
  const systemPrompt = buildSystemPrompt(userContext);

  try {
    // Call Claude with context
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1000,
      temperature: 0.7,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: message,
        },
      ],
    });

    const textContent = response.content.find((c) => c.type === 'text');
    if (!textContent || textContent.type !== 'text') {
      throw new Error('No text response from Claude');
    }

    const reply = textContent.text;

    // Store both user message and assistant response
    const subscriber = await getSubscriber(normalizedFrom);
    if (subscriber) {
      await storeMessage(subscriber.id, {
        role: 'user',
        content: message,
        type: 'user_message',
      });

      await storeMessage(subscriber.id, {
        role: 'system',
        content: reply,
        type: 'general_agent_response',
      });
    }

    // Send response
    await sendSmsResponse(from, reply, twilioClient);
    await updateLastMessageDate(normalizedFrom);

    console.log(`[General Kochi] Response sent to ${normalizedFrom}`);
  } catch (error) {
    console.error('[General Kochi] Error:', error);
    await sendSmsResponse(
      from,
      'Sorry, I had trouble processing your message. Please try again.',
      twilioClient
    );
    await updateLastMessageDate(normalizedFrom);
  }
}

/**
 * Build system prompt with full user context
 */
function buildSystemPrompt(context: UserContext): string {
  const parts: string[] = [];

  // Base identity
  parts.push(`You are Kochi, a personal AI assistant accessible via SMS.`);
  parts.push(`\nYou help with information, questions, and conversations about topics the user cares about.`);

  // Personalization
  if (context.personalization.name) {
    parts.push(`\nUser's name: ${context.personalization.name}`);
  }
  if (context.personalization.interests && context.personalization.interests.length > 0) {
    parts.push(`\nUser's interests: ${context.personalization.interests.join(', ')}`);
  }
  if (context.personalization.timezone) {
    parts.push(`\nUser's timezone: ${context.personalization.timezone}`);
  }
  if (context.personalization.location) {
    parts.push(`\nUser's location: ${context.personalization.location}`);
  }
  if (context.personalization.notes) {
    parts.push(`\nNotes about user: ${context.personalization.notes}`);
  }

  // Active subscriptions
  if (context.subscriptions.length > 0) {
    parts.push(`\n\nACTIVE SUBSCRIPTIONS:`);
    for (const sub of context.subscriptions) {
      parts.push(`\n- ${sub.agent_slug}`);
      if (sub.preferences && Object.keys(sub.preferences).length > 0) {
        parts.push(`  Preferences: ${JSON.stringify(sub.preferences)}`);
      }
      if (sub.last_sent_at) {
        const lastSent = new Date(sub.last_sent_at).toLocaleDateString();
        parts.push(`  Last report: ${lastSent}`);
      }
    }
  } else {
    parts.push(`\n\nUser has no active subscriptions yet.`);
  }

  // Recent conversation history
  if (context.recentMessages.length > 0) {
    parts.push(`\n\nRECENT ACTIVITY (last 12 hours):`);

    for (const msg of context.recentMessages) {
      const timestamp = new Date(msg.timestamp);
      const timeAgo = getTimeAgo(timestamp);
      const preview = msg.content.substring(0, 150);
      const previewSuffix = msg.content.length > 150 ? '...' : '';

      parts.push(`\n[${timeAgo}] ${msg.type}:`);
      parts.push(`${preview}${previewSuffix}`);
    }
  } else {
    parts.push(`\n\nNo recent activity (last 12 hours).`);
  }

  // Response guidelines
  parts.push(`\n\nRESPONSE GUIDELINES:`);
  parts.push(`- Keep responses concise (SMS-friendly, ~160-320 chars ideal)`);
  parts.push(`- Be helpful, friendly, and conversational`);
  parts.push(`- Reference recent context when relevant`);
  parts.push(`- If asked about subscriptions, explain available agents (AIR, CRYPTO DAILY, etc.)`);
  parts.push(`- For research questions, suggest using "KG {question}" for interactive queries`);
  parts.push(`- When unsure, admit it and offer to help differently`);

  return parts.join('\n');
}

/**
 * Get human-readable time ago string
 */
function getTimeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * CommandHandler export for registration (not used directly - called via orchestrator)
 * This handler has no matches() logic - it's only called when orchestrator routes to 'general'
 */
export const generalKochiHandler: import('./types.js').CommandHandler = {
  name: 'general-kochi',
  matches(): boolean {
    // Never matches directly - only called via orchestrator
    return false;
  },
  async handle(context: CommandContext): Promise<boolean> {
    // This should never be called directly - orchestrator calls handleGeneralKochiAgent
    console.warn('[General Kochi] Handler called directly - should be via orchestrator');
    return false;
  },
};
