/**
 * Orchestrated Routing - Context-aware message routing
 *
 * Handles non-keyword messages by:
 * 1. Loading user context (personalization + subscriptions + recent messages)
 * 2. Routing via AI orchestrator (kg-query, air, or general)
 * 3. Delegating to appropriate handler
 *
 * This offloads routing logic from handlers.ts
 */

import type { CommandContext } from '../../commands/types.js';
import { loadUserContext, storeMessage, storeThreadState, clearThreadState } from '../context-loader.js';
import { routeMessage } from '../orchestrator.js';
import { handleGeneralKochiAgent, handlePersonalizationConfirmation } from '../../commands/general.js';

/**
 * Handle a message using orchestrated routing
 * Called when no keyword command matches
 */
export async function handleOrchestratedMessage(
  commandContext: CommandContext,
  normalizedPhoneNumber: string
): Promise<void> {
  console.log(`[Orchestrated Routing] Processing: "${commandContext.message}"`);

  // Load user context to check for active threads
  const userContext = await loadUserContext(normalizedPhoneNumber);

  if (!userContext) {
    console.error('[Orchestrated Routing] Failed to load user context');
    await commandContext.sendSmsResponse(
      commandContext.from,
      'Sorry, I encountered an error. Try "COMMANDS" for help.',
      commandContext.twilioClient
    );
    return;
  }

  // Check for recruit exploration (Phase 1) - handle before approval responses
  if (userContext.activeThread?.handler === 'recruit-exploration') {
    const { handleRecruitExploration } = await import('../../commands/recruit.js');
    const explorationHandled = await handleRecruitExploration(commandContext, userContext.activeThread);
    if (explorationHandled) {
      console.log(`[Orchestrated Routing] Handled recruit exploration: "${commandContext.message}"`);
      return;
    }
  }

  // Store user message in conversation context FIRST (before routing)
  // This ensures conversation history is available for topic change detection
  await storeMessage(userContext.subscriberId, {
    role: 'user',
    content: commandContext.message,
    type: 'user_message',
  });

  // Reload context to include the newly stored message
  const updatedContext = await loadUserContext(normalizedPhoneNumber);
  if (!updatedContext) {
    console.error('[Orchestrated Routing] Failed to reload user context after storing message');
    await commandContext.sendSmsResponse(
      commandContext.from,
      'Sorry, I encountered an error. Try "COMMANDS" for help.',
      commandContext.twilioClient
    );
    return;
  }

  // Check for YES/BROADER or source approval format (e.g., "1:yes 2:no 3:yes")
  const msgUpper = commandContext.messageUpper.trim();
  const isApprovalResponse = msgUpper === 'YES' || msgUpper === 'BROADER' || /^\d+:(YES|Y|NO|N)/.test(msgUpper);

  if (isApprovalResponse) {
    // Try recruit source approval first (if there's an active recruit thread)
    if (updatedContext.activeThread?.handler === 'recruit-source-approval') {
      const { handleRecruitConfirmation } = await import('../../commands/recruit.js');
      const recruitHandled = await handleRecruitConfirmation(commandContext, updatedContext.activeThread);
      if (recruitHandled) {
        console.log(`[Orchestrated Routing] Handled recruit source approval: ${commandContext.messageUpper}`);
        return;
      }
    }

    // Try AIR confirmation
    const { handleAIRConfirmation } = await import('../../commands/air.js');
    const airHandled = await handleAIRConfirmation(commandContext);
    if (airHandled) {
      console.log(`[Orchestrated Routing] Handled AIR confirmation: ${commandContext.messageUpper}`);
      return;
    }

    // Then try personalization confirmation
    if (commandContext.messageUpper === 'YES') {
      const personalHandled = await handlePersonalizationConfirmation(commandContext);
      if (personalHandled) {
        console.log(`[Orchestrated Routing] Handled personalization confirmation`);
        return;
      }
    }

    // If neither handled, continue with normal routing
  }

  // Route message using orchestrator (with updated context that includes the new message)
  const routing = await routeMessage(commandContext.message, updatedContext);

  console.log(`[Orchestrator] Routed to: ${routing.destination} (${routing.confidence})`);
  console.log(`[Orchestrator] Reasoning: ${routing.reasoning}`);
  console.log(`[Orchestrator] Is follow-up: ${routing.isFollowUp}`);

  // Check for topic change detection
  if (updatedContext.activeThread && !routing.isFollowUp) {
    console.log(`[Orchestrator] ⚠️  Topic change detected - user switched topics mid-conversation`);
    console.log(`[Orchestrator]   Previous topic: ${updatedContext.activeThread.fullContext?.topic || 'unknown'}`);
    console.log(`[Orchestrator]   New message: "${commandContext.message.substring(0, 50)}..."`);
    
    // Clear the old thread since user changed topics
    await clearThreadState(updatedContext.subscriberId);
    console.log(`[Orchestrator] Cleared previous thread due to topic change`);
    
    // Process queued messages from the previous conversation
    const { processQueueForSubscriber } = await import('../scheduler/queue-processor.js');
    const { initializeTwilioClient } = await import('./webhooks.js');
    const twilioClient = initializeTwilioClient();
    await processQueueForSubscriber(updatedContext.subscriberId, normalizedPhoneNumber, twilioClient);
  }

  // Store thread state for multi-turn capable handlers
  const multiTurnHandlers = ['discovery', 'kg-query'];
  if (multiTurnHandlers.includes(routing.destination)) {
    // Extract topic from message (simple heuristic)
    const topic = extractTopic(commandContext.message);

    await storeThreadState(updatedContext.subscriberId, {
      handler: routing.destination,
      topic,
      context: {
        initialMessage: commandContext.message,
        isFollowUp: routing.isFollowUp,
        conversationHistory: updatedContext.recentMessages.slice(-5).map(m => ({
          role: m.role,
          content: m.content,
        })),
      },
    });

    console.log(`[Orchestrator] Stored thread state: handler=${routing.destination}, topic=${topic}`);
  } else if (routing.destination === 'general' && !routing.isFollowUp) {
    // Clear thread state when switching to general conversation (non-follow-up)
    await clearThreadState(updatedContext.subscriberId);
    console.log(`[Orchestrator] Cleared thread state (switching to general)`);
    
    // Process queued messages now that conversation has ended
    const { processQueueForSubscriber } = await import('../scheduler/queue-processor.js');
    const { initializeTwilioClient } = await import('./webhooks.js');
    const twilioClient = initializeTwilioClient();
    await processQueueForSubscriber(updatedContext.subscriberId, normalizedPhoneNumber, twilioClient);
  }

  // Route based on orchestrator decision
  switch (routing.destination) {
    case 'kg-query':
      // Route to KG agent (knowledge graph queries)
      // Trust orchestrator's decision - call handler directly without matches() check
      const { kgCommandHandler } = await import('../../commands/kg.js');
      console.log('[Orchestrator] Calling KG handler (orchestrator-routed)');
      const kgHandled = await kgCommandHandler.handle(commandContext);
      if (kgHandled) {
        return;
      }
      // If handler couldn't process, fall through to general
      console.log('[Orchestrator] KG handler returned false, falling through to general');
      await handleGeneralKochiAgent(commandContext, userContext);
      return;

    case 'air':
      // Route to AIR handler (subscription confirmation flow)
      // Trust orchestrator's decision - call handler directly without matches() check
      const { airCommandHandler } = await import('../../commands/air.js');
      console.log('[Orchestrator] Calling AIR handler (orchestrator-routed)');
      const airHandled = await airCommandHandler.handle(commandContext);
      if (airHandled) {
        return;
      }
      // If handler couldn't process, fall through to general
      console.log('[Orchestrator] AIR handler returned false, falling through to general');
      await handleGeneralKochiAgent(commandContext, userContext);
      return;

    case 'discovery':
      // Route to discovery agent (agentic with web search)
      const { handleDiscoveryAgent } = await import('../../commands/discovery.js');
      console.log('[Orchestrator] Calling discovery handler (orchestrator-routed)');
      await handleDiscoveryAgent(commandContext, userContext);
      return;

    case 'general':
    default:
      // Route to general Kochi agent
      await handleGeneralKochiAgent(commandContext, userContext);
      return;
  }
}

/**
 * Extract topic from message (simple heuristic)
 */
function extractTopic(message: string): string {
  // Remove common question words
  const cleaned = message
    .toLowerCase()
    .replace(/^(find|search|show|get|what|when|where|who|why|how|tell me about|looking for)\s+/i, '')
    .trim();

  // Take first 5 words as topic
  const words = cleaned.split(/\s+/).slice(0, 5);
  return words.join(' ') || 'general query';
}
