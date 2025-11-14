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
import {
  detectPersonalInfo,
  extractPersonalization,
  formatExtracted,
  getGmailContext,
  type ExtractedPersonalization
} from '../lib/personalization-extractor.js';
import { supabase } from '../lib/supabase.js';

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

  // Get subscriber for Gmail context
  const subscriber = await getSubscriber(normalizedFrom);

  // Try to get Gmail context if connected
  let gmailContext: string | null = null;
  if (subscriber) {
    try {
      console.log(`[General Kochi] Attempting to fetch Gmail context for query: "${message.substring(0, 50)}..."`);
      gmailContext = await getGmailContext(subscriber.id, message);
      if (gmailContext) {
        console.log(`[General Kochi] ✅ Gmail context retrieved (${gmailContext.length} chars)`);
      } else {
        console.log(`[General Kochi] ℹ️  No Gmail context available`);
      }
    } catch (error) {
      console.error('[General Kochi] ⚠️  Failed to fetch Gmail context:', error);
      // Continue without Gmail context
    }
  }

  // Build system prompt with full context (including Gmail)
  const systemPrompt = buildSystemPrompt(userContext, gmailContext);

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

    let reply = textContent.text;

    // Store both user message and assistant response
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

      // Automatic personalization detection
      console.log(`[General Kochi] Starting personalization detection for message: "${message.substring(0, 50)}..."`);
      try {
        const hasPersonalInfo = await detectPersonalInfo(message);
        console.log(`[General Kochi] Personal info detected: ${hasPersonalInfo}`);

        if (hasPersonalInfo) {
          console.log(`[General Kochi] ✅ Personal info detected! Extracting...`);
          const extracted = await extractPersonalization(message);
          console.log(`[General Kochi] Extracted:`, JSON.stringify(extracted, null, 2));

          // Check if anything meaningful was extracted
          const hasData = Object.keys(extracted).length > 0;
          console.log(`[General Kochi] Has meaningful data: ${hasData}`);

          if (hasData) {
            // Store as pending confirmation
            await storePendingPersonalization(subscriber.id, extracted);
            console.log(`[General Kochi] ✅ Stored pending personalization`);

            // Add confirmation prompt to reply
            const confirmationPrompt = `\n\n---\n💡 I noticed you shared:\n${formatExtracted(extracted)}\n\nWant me to remember this? Reply YES to save.`;
            console.log(`[General Kochi] Adding confirmation prompt (${confirmationPrompt.length} chars)`);

            reply += confirmationPrompt;
            console.log(`[General Kochi] ✅ Confirmation prompt added to reply`);
          } else {
            console.log(`[General Kochi] ⚠️ No meaningful data extracted, skipping confirmation`);
          }
        } else {
          console.log(`[General Kochi] ℹ️  No personal info detected in this message`);
        }
      } catch (detectionError) {
        console.error('[General Kochi] ❌ Personalization detection failed:', detectionError);
        console.error('[General Kochi] Error stack:', detectionError instanceof Error ? detectionError.stack : 'No stack');
        // Continue without personalization detection
      }
    }

    // Send response
    console.log(`[General Kochi] About to send SMS, reply length: ${reply.length}`);
    console.log(`[General Kochi] Reply preview:`, reply.substring(0, 200));
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
function buildSystemPrompt(context: UserContext, gmailContext: string | null = null): string {
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

  // Gmail Context (if available)
  if (gmailContext) {
    parts.push(gmailContext);
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
  parts.push(`- CRITICAL: Always generate SMS bodies that stay under 670 UCS-2 code units (10 segments)`);
  parts.push(`- Count using UTF-16 code units, NOT characters (emojis = 2+ units)`);
  parts.push(`- If content would exceed 670 units, automatically shorten or omit sections`);
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
 * Store pending personalization for confirmation
 */
async function storePendingPersonalization(
  subscriberId: string,
  extracted: ExtractedPersonalization
): Promise<void> {
  const expiresAt = new Date(Date.now() + 600000).toISOString(); // 10 minutes

  await supabase
    .from('conversation_context')
    .insert({
      subscriber_id: subscriberId,
      context_type: 'pending_personalization',
      metadata: { extracted },
      expires_at: expiresAt,
    });
}

/**
 * Get pending personalization for confirmation
 */
async function getPendingPersonalization(
  subscriberId: string
): Promise<ExtractedPersonalization | null> {
  const { data } = await supabase
    .from('conversation_context')
    .select('metadata')
    .eq('subscriber_id', subscriberId)
    .eq('context_type', 'pending_personalization')
    .gte('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!data?.metadata?.extracted) {
    return null;
  }

  return data.metadata.extracted as ExtractedPersonalization;
}

/**
 * Clear pending personalization
 */
async function clearPendingPersonalization(subscriberId: string): Promise<void> {
  await supabase
    .from('conversation_context')
    .delete()
    .eq('subscriber_id', subscriberId)
    .eq('context_type', 'pending_personalization');
}

/**
 * Handle YES confirmation for personalization
 */
export async function handlePersonalizationConfirmation(
  context: CommandContext
): Promise<boolean> {
  const { from, normalizedFrom, twilioClient, sendSmsResponse, updateLastMessageDate } = context;

  const subscriber = await getSubscriber(normalizedFrom);
  if (!subscriber) {
    return false;
  }

  const pending = await getPendingPersonalization(subscriber.id);
  if (!pending) {
    return false; // No pending personalization
  }

  // Merge with existing personalization
  const currentPersonalization = subscriber.personalization || {};

  // Smart merge: concatenate arrays, override other fields
  const merged: any = { ...currentPersonalization };

  for (const [key, value] of Object.entries(pending)) {
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

  // Clear pending
  await clearPendingPersonalization(subscriber.id);

  // Send confirmation
  await sendSmsResponse(
    from,
    `✅ Saved!\n\n${formatExtracted(pending)}\n\n💡 View: PERSONALIZE SHOW`,
    twilioClient
  );
  await updateLastMessageDate(normalizedFrom);

  return true; // Handled
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
