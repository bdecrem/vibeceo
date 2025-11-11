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
import { loadUserContext, storeMessage } from '../context-loader.js';
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

  // Check for YES confirmation (personalization)
  if (commandContext.messageUpper === 'YES') {
    const handled = await handlePersonalizationConfirmation(commandContext);
    if (handled) {
      console.log(`[Orchestrated Routing] Handled YES confirmation`);
      return;
    }
    // If not handled, continue with normal routing
  }

  // Load user context (personalization + subscriptions + recent messages)
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

  // Store user message in conversation context
  await storeMessage(userContext.subscriberId, {
    role: 'user',
    content: commandContext.message,
    type: 'user_message',
  });

  // Route message using orchestrator
  const routing = await routeMessage(commandContext.message, userContext);

  console.log(`[Orchestrator] Routed to: ${routing.destination} (${routing.confidence})`);
  console.log(`[Orchestrator] Reasoning: ${routing.reasoning}`);

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

    case 'general':
    default:
      // Route to general Kochi agent
      await handleGeneralKochiAgent(commandContext, userContext);
      return;
  }
}
