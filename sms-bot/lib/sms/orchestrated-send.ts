/**
 * Orchestrated Send - Outbound Message Interceptor
 * 
 * TODO: Remove logging marked with [ORCH-LOG] when ready
 */

import type { TwilioClient } from './webhooks.js';
import { loadUserContext, type UserContext, type ActiveThread } from '../context-loader.js';
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Import utilities from handlers (avoiding circular dependency by importing only what we need)
let normalizePhoneNumber: ((from: string) => string) | null = null;
let detectMessagePlatform: ((from: string) => "sms" | "whatsapp") | null = null;
let isTestPhoneNumber: ((phoneNumber: string) => boolean) | null = null;
let splitMessageIntoChunks: ((message: string, maxLength?: number) => string[]) | null = null;

// Lazy load handlers utilities to avoid circular dependency
async function loadHandlersUtils() {
  if (!normalizePhoneNumber) {
    const handlers = await import('./handlers.js');
    normalizePhoneNumber = handlers.normalizePhoneNumber;
    detectMessagePlatform = handlers.detectMessagePlatform;
    isTestPhoneNumber = handlers.isTestPhoneNumber;
    splitMessageIntoChunks = handlers.splitMessageIntoChunks;
  }
}

export interface OutboundMessageMetadata {
  messageType?: string; // 'ai_daily', 'recruiting', 'report', 'command_response', etc.
  priority?: number; // 1-10, higher = more important
  source?: string; // 'scheduler', 'agent', 'command', 'webhook', etc.
  relatedThreadId?: string; // If this message is related to an active thread
  canMerge?: boolean; // Whether this message can be merged into active conversation
  expiresAt?: Date; // When this message expires if queued
  metadata?: Record<string, any>; // Additional context
}

export type MessageRoutingDecision = 'send_now' | 'merge' | 'queue';

export interface RoutingDecisionResult {
  decision: MessageRoutingDecision;
  reasoning: string;
  confidence: 'high' | 'medium' | 'low';
  canMerge?: boolean; // If decision is 'merge', whether it can be merged
  queueReason?: string; // If decision is 'queue', why it's being queued
}

/**
 * Internal implementation of sendSmsResponse (original function)
 * This is the actual Twilio send - kept separate for direct access when needed
 * Exported for use by message queue processor
 */
export async function sendSmsResponseInternal(
  to: string,
  message: string,
  twilioClient: TwilioClient
): Promise<any> {
  await loadHandlersUtils();
  if (!detectMessagePlatform || !isTestPhoneNumber) {
    throw new Error('Failed to load handlers utilities');
  }
  
  const platform = detectMessagePlatform(to);

  // For WhatsApp, use verified business number or configured WhatsApp number
  const fromNumber =
    platform === "whatsapp"
      ? process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+18663300015"
      : process.env.TWILIO_PHONE_NUMBER;

  // Enforce 1600 character limit
  if (message.length > 1600) {
    console.error(
      `[ORCH-LOG] Message length ${message.length} exceeds 1600 character limit. Truncating...`
    );
    message = message.substring(0, 1597) + "...";
  }

  // Check if this is a test phone number
  if (isTestPhoneNumber(to)) {
    console.log(`[ORCH-LOG] 🧪 DEV MODE: Skipping actual SMS to test number ${to}`);
    console.log(
      `[ORCH-LOG] 🧪 Mock ${platform.toUpperCase()} response: ${message.substring(0, 100)}...`
    );
  }

  try {
    const response = await twilioClient.messages.create({
      body: message,
      to, // Keep original format (whatsapp: prefix if WhatsApp)
      from: fromNumber,
    });

    console.log(
      `[ORCH-LOG] ${platform.toUpperCase()} sent to ${to}: ${message.substring(0, 50)}...`
    );
    return response;
  } catch (error: any) {
    // Handle Twilio's automatic unsubscribe gracefully
    if (error.code === 21610) {
      console.log(
        `[ORCH-LOG] ${platform.toUpperCase()} to ${to} blocked - user is carrier-unsubscribed (Twilio error 21610)`
      );
      console.log(`[ORCH-LOG] Message was: ${message.substring(0, 100)}...`);
      return null; // Don't crash, just return null
    } else {
      console.error(
        `[ORCH-LOG] Failed to send ${platform.toUpperCase()} to ${to}:`,
        error
      );
      throw error;
    }
  }
}

/**
 * Message Routing Decision Functions
 * 
 * Determines whether an outbound message should be:
 * - send_now: Sent immediately (no active conversation or message is relevant)
 * - merge: Added naturally to current conversation
 * - queue: Queued for later (active conversation that shouldn't be interrupted)
 */

/**
 * Determine routing decision for outbound message using AI
 */
async function determineMessageRouting(
  message: string,
  metadata: OutboundMessageMetadata | undefined,
  userContext: UserContext | null
): Promise<RoutingDecisionResult> {
  // If no active thread, always send now
  if (!userContext?.activeThread) {
    return {
      decision: 'send_now',
      reasoning: 'No active conversation',
      confidence: 'high',
    };
  }

  const thread = userContext.activeThread;
  
  // If metadata explicitly says it's related to this thread, consider merging
  if (metadata?.relatedThreadId === thread.threadId || metadata?.canMerge === true) {
    return {
      decision: 'merge',
      reasoning: 'Message is explicitly related to active thread',
      confidence: 'high',
      canMerge: true,
    };
  }

  // High priority messages (8+) can override and send now
  if (metadata?.priority && metadata.priority >= 8) {
    return {
      decision: 'send_now',
      reasoning: `High priority message (${metadata.priority}) - overriding active conversation`,
      confidence: 'high',
    };
  }

  // Use AI to determine if message is relevant to active conversation
  try {
    const relevanceDecision = await analyzeMessageRelevance(message, metadata, thread);
    return relevanceDecision;
  } catch (error) {
    console.error(`[ORCH-LOG] Error in AI routing decision:`, error);
    // Fallback: queue if there's an active thread (safe default)
    return {
      decision: 'queue',
      reasoning: 'AI analysis failed, defaulting to queue for safety',
      confidence: 'low',
      queueReason: 'Error in relevance analysis',
    };
  }
}

/**
 * Use AI to analyze if outbound message is relevant to active conversation
 */
async function analyzeMessageRelevance(
  message: string,
  metadata: OutboundMessageMetadata | undefined,
  activeThread: ActiveThread
): Promise<RoutingDecisionResult> {
  const threadTopic = activeThread.fullContext?.topic || 'unknown topic';
  const threadHandler = activeThread.handler;
  const messageType = metadata?.messageType || 'unspecified';
  const messageSource = metadata?.source || 'unspecified';

  // Build context about the active thread
  let threadContext = `Active conversation handler: ${threadHandler}\nTopic: ${threadTopic}`;
  if (activeThread.fullContext) {
    const contextKeys = Object.keys(activeThread.fullContext);
    if (contextKeys.length > 0) {
      threadContext += `\nContext keys: ${contextKeys.join(', ')}`;
    }
  }

  const systemPrompt = `You are an intelligent message router for an SMS bot. Your job is to determine if an outbound message should interrupt an active conversation.

ACTIVE CONVERSATION:
${threadContext}

OUTBOUND MESSAGE:
Type: ${messageType}
Source: ${messageSource}
Content: ${message.substring(0, 500)}${message.length > 500 ? '...' : ''}

DECISION OPTIONS:

1. "send_now" - Send immediately
   Use when:
   - Message is directly relevant to the active conversation topic
   - Message is a response to something the user asked for in the active conversation
   - Message completes or continues the active conversation naturally
   - Message is urgent/time-sensitive and related to the conversation

2. "merge" - Merge into current conversation
   Use when:
   - Message can be naturally added as part of the ongoing conversation
   - Message provides additional context or information related to the active topic
   - Message is a follow-up or continuation of the active conversation
   - Message enhances rather than interrupts the conversation flow

3. "queue" - Queue for later
   Use when:
   - Message is completely unrelated to the active conversation
   - Message is a scheduled broadcast (daily reports, notifications)
   - Message would interrupt an important multi-turn conversation
   - Message is informational but not urgent
   - Active conversation is in a critical state (user is providing input, making decisions)

EXAMPLES:
- Active: User asking about research papers → Outbound: Daily AI research report → Decision: queue (unrelated scheduled content)
- Active: User in recruiting flow → Outbound: New candidates found → Decision: merge (directly related)
- Active: User asking questions → Outbound: Answer to their question → Decision: send_now (direct response)
- Active: User in discovery agent → Outbound: Scheduled crypto daily → Decision: queue (unrelated)

Respond with JSON:
{
  "decision": "send_now" | "merge" | "queue",
  "reasoning": "brief explanation",
  "confidence": "high" | "medium" | "low",
  "canMerge": true/false (if decision is merge),
  "queueReason": "why queue" (if decision is queue)
}`;

  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 500,
      temperature: 0,
      messages: [
        {
          role: 'user',
          content: systemPrompt,
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

    const decision = JSON.parse(jsonMatch[0]) as RoutingDecisionResult;
    
    console.log(`[ORCH-LOG] AI Routing Decision: ${decision.decision} (${decision.confidence})`);
    console.log(`[ORCH-LOG] Reasoning: ${decision.reasoning}`);
    
    return decision;
  } catch (error) {
    console.error(`[ORCH-LOG] Error in AI relevance analysis:`, error);
    throw error;
  }
}

/**
 * Check if message should be sent now (no active conversation or relevant)
 */
export async function shouldSendNow(
  message: string,
  metadata: OutboundMessageMetadata | undefined,
  userContext: UserContext | null
): Promise<boolean> {
  const decision = await determineMessageRouting(message, metadata, userContext);
  return decision.decision === 'send_now';
}

/**
 * Check if message should be merged into active conversation
 */
export async function shouldMerge(
  message: string,
  metadata: OutboundMessageMetadata | undefined,
  userContext: UserContext | null
): Promise<boolean> {
  const decision = await determineMessageRouting(message, metadata, userContext);
  return decision.decision === 'merge';
}

/**
 * Check if message should be queued
 */
export async function shouldQueue(
  message: string,
  metadata: OutboundMessageMetadata | undefined,
  userContext: UserContext | null
): Promise<boolean> {
  const decision = await determineMessageRouting(message, metadata, userContext);
  return decision.decision === 'queue';
}

/**
 * Orchestrated sendSmsResponse - Intercepts all outbound messages
 * 
 * Logs all outbound messages and checks for active conversations
 */
export async function sendSmsResponse(
  to: string,
  message: string,
  twilioClient: TwilioClient,
  metadata?: OutboundMessageMetadata
): Promise<any> {
  await loadHandlersUtils();
  if (!normalizePhoneNumber) {
    throw new Error('Failed to load handlers utilities');
  }
  
  const normalizedPhone = normalizePhoneNumber(to);
  const timestamp = new Date().toISOString();
  
  // [ORCH-LOG] Log all outbound message attempts
  console.log(`[ORCH-LOG] ========================================`);
  console.log(`[ORCH-LOG] OUTBOUND MESSAGE INTERCEPTED`);
  console.log(`[ORCH-LOG] To: ${to} (normalized: ${normalizedPhone})`);
  console.log(`[ORCH-LOG] Timestamp: ${timestamp}`);
  console.log(`[ORCH-LOG] Message Type: ${metadata?.messageType || 'unspecified'}`);
  console.log(`[ORCH-LOG] Source: ${metadata?.source || 'unspecified'}`);
  console.log(`[ORCH-LOG] Priority: ${metadata?.priority || 'unspecified'}`);
  console.log(`[ORCH-LOG] Message Preview: ${message.substring(0, 100)}${message.length > 100 ? '...' : ''}`);
  console.log(`[ORCH-LOG] Message Length: ${message.length} chars`);
  
  try {
    // [ORCH-LOG] Check for active conversation
    const userContext = await loadUserContext(normalizedPhone);
    
    if (userContext?.activeThread) {
      const thread = userContext.activeThread;
      console.log(`[ORCH-LOG] ⚠️  ACTIVE CONVERSATION DETECTED`);
      console.log(`[ORCH-LOG]   Handler: ${thread.handler}`);
      console.log(`[ORCH-LOG]   Thread ID: ${thread.threadId}`);
      console.log(`[ORCH-LOG]   Started: ${thread.startedAt}`);
      console.log(`[ORCH-LOG]   Last Activity: ${thread.lastActivity}`);
      console.log(`[ORCH-LOG]   Topic: ${thread.fullContext?.topic || 'N/A'}`);
      
      // [ORCH-LOG] Log thread context summary
      if (thread.fullContext) {
        const contextKeys = Object.keys(thread.fullContext);
        console.log(`[ORCH-LOG]   Context Keys: ${contextKeys.join(', ')}`);
      }
      
      // Route through decision engine
      console.log(`[ORCH-LOG] ⚠️  ACTIVE CONVERSATION - Analyzing routing decision...`);
      
      const routingDecision = await determineMessageRouting(message, metadata, userContext);
      
      console.log(`[ORCH-LOG] Routing Decision: ${routingDecision.decision.toUpperCase()}`);
      console.log(`[ORCH-LOG] Confidence: ${routingDecision.confidence}`);
      console.log(`[ORCH-LOG] Reasoning: ${routingDecision.reasoning}`);
      
      if (routingDecision.decision === 'queue') {
        console.log(`[ORCH-LOG] ⏸️  MESSAGE QUEUED`);
        console.log(`[ORCH-LOG] Queue Reason: ${routingDecision.queueReason || 'Active conversation detected'}`);
        
        // Queue the message
        const { queueMessage } = await import('./message-queue.js');
        const { getSubscriber } = await import('../subscribers.js');
        const subscriber = await getSubscriber(normalizedPhone);
        
        if (subscriber) {
          try {
            const queueId = await queueMessage(
              subscriber.id,
              normalizedPhone,
              message,
              twilioClient,
              metadata,
              routingDecision
            );
            console.log(`[ORCH-LOG] ✅ Message queued with ID: ${queueId}`);
            console.log(`[ORCH-LOG] ========================================`);
            return { queued: true, queueId };
          } catch (queueError) {
            console.error(`[ORCH-LOG] ❌ Failed to queue message:`, queueError);
            // Fallback: send immediately if queue fails
            console.log(`[ORCH-LOG] ⚠️  FALLBACK: Sending immediately due to queue error`);
          }
        } else {
          console.error(`[ORCH-LOG] ❌ Subscriber not found, cannot queue message`);
          // Fallback: send immediately
        }
      } else if (routingDecision.decision === 'merge') {
        console.log(`[ORCH-LOG] 🔀 MESSAGE CAN BE MERGED`);
        console.log(`[ORCH-LOG] Can Merge: ${routingDecision.canMerge || false}`);
        
        // Merge message into conversation
        const { storeMergedMessage, formatMergedMessage } = await import('./message-merger.js');
        const { getSubscriber } = await import('../subscribers.js');
        const subscriber = await getSubscriber(normalizedPhone);
        
        if (subscriber && userContext.activeThread) {
          try {
            // Store merged message in thread context
            await storeMergedMessage(
              subscriber.id,
              message,
              metadata,
              routingDecision,
              userContext.activeThread
            );
            
            // Format message with natural conversation transition
            const mergedMessage = formatMergedMessage(message, metadata, userContext.activeThread);
            
            console.log(`[ORCH-LOG] ✅ Message merged into conversation`);
            console.log(`[ORCH-LOG] → Sending merged message with natural transition`);
            
            // Send the merged message
            const result = await sendSmsResponseInternal(to, mergedMessage, twilioClient);
            
            console.log(`[ORCH-LOG] ✅ Merged message sent successfully`);
            console.log(`[ORCH-LOG] ========================================`);
            
            return result;
          } catch (mergeError) {
            console.error(`[ORCH-LOG] ❌ Failed to merge message:`, mergeError);
            // Fallback: send immediately without merge
            console.log(`[ORCH-LOG] ⚠️  FALLBACK: Sending immediately due to merge error`);
          }
        } else {
          console.log(`[ORCH-LOG] ⚠️  Cannot merge - no subscriber or active thread, sending immediately`);
        }
      } else {
        console.log(`[ORCH-LOG] ✅ SEND NOW - Message is relevant to active conversation`);
      }
    } else {
      console.log(`[ORCH-LOG] ✅ No active conversation - safe to send`);
    }
    
    // [ORCH-LOG] Log metadata if provided
    if (metadata) {
      console.log(`[ORCH-LOG] Metadata:`);
      if (metadata.relatedThreadId) {
        console.log(`[ORCH-LOG]   Related Thread: ${metadata.relatedThreadId}`);
      }
      if (metadata.canMerge !== undefined) {
        console.log(`[ORCH-LOG]   Can Merge: ${metadata.canMerge}`);
      }
      if (metadata.expiresAt) {
        console.log(`[ORCH-LOG]   Expires At: ${metadata.expiresAt.toISOString()}`);
      }
      if (metadata.metadata && Object.keys(metadata.metadata).length > 0) {
        console.log(`[ORCH-LOG]   Additional Metadata:`, JSON.stringify(metadata.metadata, null, 2));
      }
    }
    
    // Decision made, now send
    console.log(`[ORCH-LOG] → Sending message`);
    const result = await sendSmsResponseInternal(to, message, twilioClient);
    
    console.log(`[ORCH-LOG] ✅ Message sent successfully`);
    console.log(`[ORCH-LOG] ========================================`);
    
    return result;
    
  } catch (error) {
    console.error(`[ORCH-LOG] ❌ Error in orchestrated send:`, error);
    console.log(`[ORCH-LOG] ========================================`);
    
    // Re-throw to maintain original error handling
    throw error;
  }
}

/**
 * Orchestrated sendChunkedSmsResponse - Intercepts chunked messages
 * 
 * Logs chunked message attempts
 * Future: Will route each chunk through orchestration
 */
export async function sendChunkedSmsResponse(
  to: string,
  message: string,
  twilioClient: TwilioClient,
  maxLength: number = 1500,
  metadata?: OutboundMessageMetadata
): Promise<void> {
  await loadHandlersUtils();
  if (!normalizePhoneNumber || !splitMessageIntoChunks) {
    throw new Error('Failed to load handlers utilities');
  }
  
  const normalizedPhone = normalizePhoneNumber(to);
  const timestamp = new Date().toISOString();
  
  // [ORCH-LOG] Log chunked message attempt
  console.log(`[ORCH-LOG] ========================================`);
  console.log(`[ORCH-LOG] CHUNKED MESSAGE INTERCEPTED`);
  console.log(`[ORCH-LOG] To: ${to} (normalized: ${normalizedPhone})`);
  console.log(`[ORCH-LOG] Timestamp: ${timestamp}`);
  console.log(`[ORCH-LOG] Message Type: ${metadata?.messageType || 'unspecified'}`);
  console.log(`[ORCH-LOG] Source: ${metadata?.source || 'unspecified'}`);
  console.log(`[ORCH-LOG] Total Length: ${message.length} chars`);
  console.log(`[ORCH-LOG] Max Chunk Length: ${maxLength} chars`);
  
  const chunks = splitMessageIntoChunks(message, maxLength);
  
  console.log(`[ORCH-LOG] Split into ${chunks.length} chunk(s)`);
  
  // Check for active conversation and determine routing (only once for the whole message)
  let routingDecision: RoutingDecisionResult | null = null;
  try {
    const userContext = await loadUserContext(normalizedPhone);
    
    if (userContext?.activeThread) {
      const thread = userContext.activeThread;
      console.log(`[ORCH-LOG] ⚠️  ACTIVE CONVERSATION DETECTED`);
      console.log(`[ORCH-LOG]   Handler: ${thread.handler}`);
      console.log(`[ORCH-LOG]   Thread ID: ${thread.threadId}`);
      console.log(`[ORCH-LOG]   Analyzing routing for ${chunks.length} chunk(s)...`);
      
      // Determine routing decision for chunked message
      routingDecision = await determineMessageRouting(message, metadata, userContext);
      console.log(`[ORCH-LOG] Routing Decision: ${routingDecision.decision.toUpperCase()}`);
      console.log(`[ORCH-LOG] Reasoning: ${routingDecision.reasoning}`);
      
      if (routingDecision.decision === 'queue') {
        console.log(`[ORCH-LOG] ⏸️  CHUNKED MESSAGE QUEUED`);
        // For chunked messages, queue the entire message (not individual chunks)
        const { queueMessage } = await import('./message-queue.js');
        const { getSubscriber } = await import('../subscribers.js');
        const subscriber = await getSubscriber(normalizedPhone);
        
        if (subscriber) {
          try {
            const queueId = await queueMessage(
              subscriber.id,
              normalizedPhone,
              message, // Queue the full message, not chunks
              twilioClient,
              metadata,
              routingDecision
            );
            console.log(`[ORCH-LOG] ✅ Chunked message queued with ID: ${queueId}`);
            console.log(`[ORCH-LOG] ========================================`);
            return; // Don't send chunks if queued
          } catch (queueError) {
            console.error(`[ORCH-LOG] ❌ Failed to queue chunked message:`, queueError);
            // Fallback: send chunks if queue fails
            console.log(`[ORCH-LOG] ⚠️  FALLBACK: Sending chunks due to queue error`);
          }
        }
      } else if (routingDecision.decision === 'merge') {
        console.log(`[ORCH-LOG] 🔀 CHUNKED MESSAGE CAN BE MERGED`);
        
        // Merge chunked message into conversation
        const { storeMergedMessage, formatMergedMessage } = await import('./message-merger.js');
        const { getSubscriber } = await import('../subscribers.js');
        const subscriber = await getSubscriber(normalizedPhone);
        
        if (subscriber && routingDecision) {
          const userContext = await loadUserContext(normalizedPhone);
          if (userContext?.activeThread) {
            try {
              // Store merged message in thread context (store full message, not chunks)
              await storeMergedMessage(
                subscriber.id,
                message, // Full message
                metadata,
                routingDecision,
                userContext.activeThread
              );
              
              // Format message with natural conversation transition
              const mergedMessage = formatMergedMessage(message, metadata, userContext.activeThread);
              
              console.log(`[ORCH-LOG] ✅ Chunked message merged into conversation`);
              console.log(`[ORCH-LOG] → Sending merged message as chunks with natural transition`);
              
              // Send as chunks with merge prefix on first chunk
              const mergedChunks = splitMessageIntoChunks(mergedMessage, maxLength);
              
              for (let i = 0; i < mergedChunks.length; i++) {
                let chunk = mergedChunks[i];
                
                // Add continuation indicator if there are multiple chunks
                if (mergedChunks.length > 1) {
                  if (i < mergedChunks.length - 1) {
                    chunk += `\n\n(${i + 1}/${mergedChunks.length} - continued...)`;
                  } else {
                    chunk = `(${i + 1}/${mergedChunks.length} - final)\n\n` + chunk;
                  }
                }
                
                await sendSmsResponseInternal(to, chunk, twilioClient);
                
                // Small delay between chunks
                if (i < mergedChunks.length - 1) {
                  await new Promise((resolve) => setTimeout(resolve, 100));
                }
              }
              
              console.log(`[ORCH-LOG] ✅ Merged chunked message sent successfully`);
              console.log(`[ORCH-LOG] ========================================`);
              return; // Don't continue with normal chunk sending
            } catch (mergeError) {
              console.error(`[ORCH-LOG] ❌ Failed to merge chunked message:`, mergeError);
              // Fallback: send chunks normally
              console.log(`[ORCH-LOG] ⚠️  FALLBACK: Sending chunks normally due to merge error`);
            }
          }
        }
      }
    } else {
      console.log(`[ORCH-LOG] ✅ No active conversation - safe to send`);
    }
  } catch (error) {
    console.error(`[ORCH-LOG] Error checking context:`, error);
  }
  
  // Send chunks with delay
  for (let i = 0; i < chunks.length; i++) {
    let chunk = chunks[i];
    
    // Add continuation indicator if there are multiple chunks
    if (chunks.length > 1) {
      if (i < chunks.length - 1) {
        chunk += `\n\n(${i + 1}/${chunks.length} - continued...)`;
      } else {
        chunk = `(${i + 1}/${chunks.length} - final)\n\n` + chunk;
      }
    }
    
    console.log(`[ORCH-LOG] → Sending chunk ${i + 1}/${chunks.length} (${chunk.length} chars)`);
    
    // Use orchestrated send for each chunk
    await sendSmsResponse(to, chunk, twilioClient, {
      ...metadata,
      messageType: metadata?.messageType ? `${metadata.messageType}_chunk_${i + 1}` : `chunk_${i + 1}`,
      metadata: {
        ...metadata?.metadata,
        chunkNumber: i + 1,
        totalChunks: chunks.length,
      },
    });
    
    // Small delay between chunks to ensure order
    if (i < chunks.length - 1) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }
  
  console.log(`[ORCH-LOG] ✅ All chunks sent successfully`);
  console.log(`[ORCH-LOG] ========================================`);
}

