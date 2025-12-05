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
 * Check if message is a command response (list of available commands)
 */
function isCommandResponse(message: string, metadata: OutboundMessageMetadata | undefined): boolean {
  // Check metadata first
  if (metadata?.messageType === 'command_response' || metadata?.source === 'command') {
    return true;
  }
  
  // Check message content for command list indicators
  const messageUpper = message.toUpperCase();
  const commandIndicators = [
    'AI DAILY',
    'COMMANDS',
    'PEER REVIEW',
    'CRYPTO',
    'ANNOUNCEMENTS',
    'WTAF',
    'SLUG',
    'INDEX',
    'FAVE',
    'EDIT',
    'MEME',
    'STOP',
    'HELP',
    'GENERAL COMMANDS',
    'CODER COMMANDS',
    'DEGEN COMMANDS',
    'STACK COMMANDS',
    'OPERATOR COMMANDS'
  ];
  
  // If message contains multiple command indicators, it's likely a command list
  const foundIndicators = commandIndicators.filter(indicator => messageUpper.includes(indicator));
  if (foundIndicators.length >= 2) {
    return true;
  }
  
  // Check for common command list patterns
  if (
    messageUpper.includes('📻') || // AI Daily emoji
    messageUpper.includes('📢') || // Announcements emoji
    messageUpper.includes('🥊') || // Peer Review emoji
    messageUpper.includes('💰') || // Crypto emoji
    messageUpper.includes('💻') || // Coder emoji
    messageUpper.includes('🎨') || // Degen emoji
    messageUpper.includes('🧱') || // Stack emoji
    messageUpper.includes('COMMANDS')
  ) {
    return true;
  }
  
  return false;
}

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
  
  // Command responses should always be sent immediately
  if (isCommandResponse(message, metadata)) {
    return {
      decision: 'send_now',
      reasoning: 'Command response - always send immediately',
      confidence: 'high',
    };
  }
  
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
    // Fallback: prefer send_now - better to send normally than merge unnecessarily
    return {
      decision: 'send_now',
      reasoning: 'AI analysis failed, defaulting to send_now to ensure message delivery',
      confidence: 'low',
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

CRITICAL RULE - COMMAND RESPONSES:
Command responses (lists of available commands) MUST ALWAYS be sent immediately ("send_now"). These include:
- Responses to "COMMANDS", "HELP", or "INFO" requests
- Messages containing lists of available commands (AI DAILY, CRYPTO, PEER REVIEW, etc.)
- Messages with command list indicators (emojis like 📻, 📢, 🥊, 💰, 💻, 🎨, 🧱)
- Messages with messageType="command_response" or source="command"

CRITICAL RULE - ACTIVE CONVERSATION RESPONSES:
When there is an active conversation thread, bot responses that are part of that conversation flow MUST be sent immediately ("send_now"). This includes:
- Bot responses during recruit-exploration (asking questions, proposing queries, refining search criteria)
- Bot responses during recruit-source-approval (showing channels, asking for approval)
- Bot responses during discovery agent conversations (search results, follow-up questions)
- Bot responses during kg-query conversations (research results, answers to questions)
- ANY bot message that is a direct response to the user's last message in the active conversation
- Bot messages that continue or complete the current conversation turn

IMPORTANT: If the active conversation handler is "recruit-exploration" or "recruit-source-approval", and the outbound message is about recruiting, candidates, channels, or the user's search query, it is ALWAYS part of the conversation flow and should be "send_now". Do NOT mistake these as "general recruitment broadcasts" - they are direct responses in an active conversation.

AVAILABLE COMMANDS (for reference):
📻 AI DAILY:
- AI DAILY - Get today's episode on demand
- AI DAILY SUBSCRIBE - Morning episode at 7am PT
- AI DAILY STOP - Opt out of daily episodes

📢 PLATFORM UPDATES:
- ANNOUNCEMENTS - Opt in to Kochi updates
- ANNOUNCEMENTS STOP - Opt out of updates

🥊 PEER REVIEW FIGHT CLUB:
- PEER REVIEW
- PEER REVIEW SUBSCRIBE
- PEER REVIEW STOP

💰 CRYPTO RESEARCH:
- CRYPTO - Get BTC/ETH prices & market summary
- CRYPTO SUBSCRIBE
- CRYPTO STOP

💻 APP BUILDER (Coder role):
- WTAF [text] - Build an app from your prompt
- SLUG [name] - Change your custom URL
- INDEX - List pages, set homepage
- FAVE [num] - Mark page as favorite

🎨 DEGEN COMMANDS:
- EDIT [page] [changes] - Modify existing pages
- MEME [idea] - Generate dank memes

🧱 STACK COMMANDS:
- --stack [app] [req] - Use app as template
- --stackdb [app] [req] - Create live-updating app
- --stackzad [app] [req] - Share data with ZAD app

General:
- COMMANDS - Show available commands
- STOP - Unsubscribe
- HELP - Show help

DECISION OPTIONS (in priority order):

1. "send_now" - Send immediately (PREFERRED for directly relevant messages)
   Use when:
   - Message is a command response (list of available commands) - ALWAYS send_now
   - Message is directly relevant to the active conversation topic
   - Message is a response to something the user asked for in the active conversation
   - Message completes or continues the active conversation naturally
   - Message is urgent/time-sensitive and related to the conversation
   - Message is a direct answer or result related to what the user is currently discussing
   - Bot response during an active multi-turn conversation (recruit-exploration, recruit-source-approval, discovery, kg-query)
   - Message is about the same topic as the active conversation (e.g., recruiting during recruit-exploration)
   - IMPORTANT: Prefer send_now when the message is directly relevant - it's cleaner than merging
   - CRITICAL: If active thread is recruit-exploration/recruit-source-approval and message is about recruiting → ALWAYS send_now

2. "merge" - Merge into current conversation (ONLY when message is a natural continuation)
   Use ONLY when:
   - Message is a natural continuation or follow-up that enhances the current conversation
   - Message provides additional context that directly relates to the active topic
   - Message is a scheduled broadcast that directly relates to what the user is currently discussing
   - Message can be seamlessly integrated into the ongoing conversation without feeling forced
   - IMPORTANT: Only merge when the connection is clear and natural. If unsure, prefer send_now instead.

3. "queue" - Queue for later (ONLY when message is completely unrelated)
   Use ONLY when:
   - Message is completely unrelated to the active conversation AND cannot be naturally merged
   - Message would genuinely interrupt a critical multi-turn conversation that cannot accommodate additional context
   - Message is a scheduled broadcast that has NO connection whatsoever to the active conversation topic
   - Active conversation is in a critical decision-making state where ANY interruption would be disruptive
   - NEVER queue command responses - they must always be sent immediately
   - NEVER queue bot responses that are part of the active conversation flow
   - IMPORTANT: Queue should be rare. Most messages should either send_now or merge naturally.

EXAMPLES:
- Active: recruit-exploration about "software engineer intern" → Outbound: Bot asking "What tech stack matters most?" → Decision: send_now (direct response in conversation)
- Active: recruit-exploration about "software engineer intern" → Outbound: Bot proposing refined query "Software Engineering Interns (Backend) with Golang" → Decision: send_now (direct response to user's input)
- Active: recruit-source-approval → Outbound: Bot showing channels to approve → Decision: send_now (direct response in conversation)
- Active: User asking about research papers → Outbound: Answer to their research question → Decision: send_now (direct response)
- Active: User asking about research papers → Outbound: Daily AI research report on same topic → Decision: send_now (directly relevant, send normally)
- Active: User in recruiting flow → Outbound: New candidates found for their search → Decision: send_now (direct response to their request)
- Active: User asking questions → Outbound: Answer to their question → Decision: send_now (direct response)
- Active: User in discovery agent → Outbound: Scheduled crypto daily → Decision: send_now (if related to discovery topic) OR queue (if completely unrelated)
- Active: User discussing web development → Outbound: Daily AI research report → Decision: send_now (if about web dev) OR queue (if completely unrelated)
- Active: User in critical multi-step setup flow → Outbound: Completely unrelated daily report → Decision: queue (truly unrelated and would disrupt flow)
- Active: Any conversation → Outbound: Command list response → Decision: send_now (ALWAYS - command responses must be immediate)
- Active: User asked "COMMANDS" → Outbound: List of commands → Decision: send_now (ALWAYS - direct response to user request)

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
      model: 'claude-3-5-haiku-20241022',
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

